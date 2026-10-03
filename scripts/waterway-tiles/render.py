"""Pre-render the default-view river tiles from a running local app.

Requests /api/waterways/tiles/{z}/{x}/{y} (the app renders each tile from the DENR
map service) and saves PNG files; fully transparent tiles become 1x1 blanks.

Output goes to public/waterway-tiles/<version>/ (bump "version" in
lib/config/waterway-tiles.json after re-rendering so caches refresh).

Usage: python3 scripts/waterway-tiles/render.py OUT_DIR [BASE_URL] [MIN_Z] [MAX_Z] [WORKERS]
Requires: pip install pillow
"""
import io
import math
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

# Upper river basin extents (keep in sync with features/waterways/config.ts).
BOUNDS = [
    (120.85, 16.85, 121.53, 17.92),
    (124.06, 9.74, 124.38, 10.08),
    (124.53, 7.41, 125.27, 8.64),
    (124.06, 7.64, 124.60, 8.08),
]
PAD = 0.03


def tile_xy(lon, lat, z):
    n = 2**z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return max(0, min(n - 1, x)), max(0, min(n - 1, y))


def tiles_for(z):
    found = set()
    for w, s, e, n in BOUNDS:
        x0, y0 = tile_xy(w - PAD, n + PAD, z)
        x1, y1 = tile_xy(e + PAD, s - PAD, z)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                found.add((z, x, y))
    return sorted(found)


def render(job, base, out_dir):
    z, x, y = job
    dest = os.path.join(out_dir, str(z), str(x), f"{y}.png")
    if os.path.exists(dest):
        return job, "cached"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{base}/api/waterways/tiles/{z}/{x}/{y}", timeout=90) as res:
                data = res.read()
            image = Image.open(io.BytesIO(data)).convert("RGBA")
            if image.size != (512, 512):
                time.sleep(2 * (attempt + 1))  # fallback blank from a failed upstream call
                continue
            empty = image.getchannel("A").getbbox() is None
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if empty:
                # Keep a tiny blank tile so the CDN answers 200 instead of 404.
                blank = io.BytesIO()
                Image.new("RGBA", (1, 1), (0, 0, 0, 0)).save(blank, "PNG")
                data = blank.getvalue()
            with open(dest, "wb") as f:
                f.write(data)
            return job, "empty" if empty else "saved"
        except Exception:
            time.sleep(2 * (attempt + 1))
    return job, "failed"


def main():
    out_dir = os.path.abspath(sys.argv[1])
    base = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3111"
    min_z = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    max_z = int(sys.argv[4]) if len(sys.argv) > 4 else 12
    workers = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    jobs = [t for z in range(min_z, max_z + 1) for t in tiles_for(z)]
    print(f"{len(jobs)} tiles, zoom {min_z}-{max_z}", flush=True)
    counts = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(render, j, base, out_dir) for j in jobs]
        for i, future in enumerate(as_completed(futures), 1):
            job, status = future.result()
            counts[status] = counts.get(status, 0) + 1
            if status == "failed":
                print("FAILED", job, flush=True)
            if i % 25 == 0 or i == len(jobs):
                print(f"{i}/{len(jobs)} {counts}", flush=True)


if __name__ == "__main__":
    main()
