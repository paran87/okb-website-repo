#!/usr/bin/env python3
"""
Reads the GPS stamp printed on Operations photos (GPS Map Camera, Timestamp Camera, …) and stores the position in
lib/config/operations-media.json, so the photo shows on the map in Command Center → Operations.

For each photo without a location (or every photo with --all) it:
  1. downloads the photo from the R2 bucket (cached in --cache),
  2. reads the stamp with Tesseract from several crops (bottom, top, full photo), each enlarged and in a few
     contrast variants (dark text, light text on a dark band, thresholded), until a position is found,
  3. takes the position from, in this order: EXIF GPS; "Lat … Long …" decimals (also with a lost decimal point or
     a comma); degrees-minutes-seconds; a plus code (full, or short with its locality); and only then the printed
     address, looked up with OpenStreetMap and marked approximate,
  4. keeps only positions in the Philippines, and names the place (barangay, city) with OpenStreetMap.

Usage (R2 read access: OPERATIONS_R2_ACCOUNT_ID, OPERATIONS_R2_ACCESS_KEY_ID, OPERATIONS_R2_SECRET_ACCESS_KEY;
optional OPERATIONS_R2_BUCKET):
  python3 scripts/operations-media/locate_photos.py              # report only (writes --report)
  python3 scripts/operations-media/locate_photos.py --apply      # also updates operations-media.json
  python3 scripts/operations-media/locate_photos.py --dir DIR    # read local images instead (testing)
Needs: tesseract (apt install tesseract-ocr), Pillow; boto3 for R2.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
MEDIA_JSON = ROOT / "lib/config/operations-media.json"
SECTION, KIND = "ncr-daily", "photos"
UA = "okb-command-center/1.0 (operations photo locations)"
# Philippines, with a margin.
PH = {"lat": (4.3, 21.8), "lng": (116.0, 127.2)}
# Short plus codes are recovered near this point unless the stamp names a locality (Metro Manila).
NCR = (14.5995, 120.9842)

# ---------------------------------------------------------------------------------------------------------------
# Plus codes (Open Location Code)
# ---------------------------------------------------------------------------------------------------------------
OLC = "23456789CFGHJMPQRVWX"
OLC_RES = [20.0, 1.0, 0.05, 0.0025, 0.000125]


def olc_decode(code: str) -> tuple[float, float] | None:
    """Centre of a full plus code (8 digits + 2 or 3 after "+")."""
    code = code.upper().replace("+", "")
    if len(code) < 10 or any(c not in OLC for c in code):
        return None
    lat, lng = -90.0, -180.0
    for i in range(5):
        lat += OLC.index(code[2 * i]) * OLC_RES[i]
        lng += OLC.index(code[2 * i + 1]) * OLC_RES[i]
    h_lat, h_lng = OLC_RES[4], OLC_RES[4]
    if len(code) > 10:
        d = OLC.index(code[10])
        h_lat, h_lng = OLC_RES[4] / 5, OLC_RES[4] / 4
        lat += (d // 4) * h_lat
        lng += (d % 4) * h_lng
    return lat + h_lat / 2, lng + h_lng / 2


def olc_encode(lat: float, lng: float) -> str:
    lat = min(max(lat, -90), 90 - 1e-9) + 90
    lng = ((lng + 180) % 360)
    out = ""
    for i in range(5):
        a = int(lat // OLC_RES[i])
        b = int(lng // OLC_RES[i])
        lat -= a * OLC_RES[i]
        lng -= b * OLC_RES[i]
        out += OLC[a] + OLC[b]
    return out[:8] + "+" + out[8:]


def olc_recover(short: str, ref: tuple[float, float]) -> tuple[float, float] | None:
    """A short code ("JX9F+5R") made full with the 8-digit prefix of a nearby reference point."""
    short = short.upper()
    sep = short.index("+")
    pad = 8 - sep
    if pad <= 0 or pad % 2:
        return None
    resolution = 20.0 ** (2 - pad / 2)
    full = olc_encode(*ref).replace("+", "")[:pad] + short.replace("+", "")
    centre = olc_decode(full)
    if not centre:
        return None
    lat, lng = centre
    half = resolution / 2
    if ref[0] + half < lat:
        lat -= resolution
    elif ref[0] - half > lat:
        lat += resolution
    if ref[1] + half < lng:
        lng -= resolution
    elif ref[1] - half > lng:
        lng += resolution
    return lat, lng


# ---------------------------------------------------------------------------------------------------------------
# Reading the stamp
# ---------------------------------------------------------------------------------------------------------------

def in_ph(lat: float, lng: float) -> bool:
    return PH["lat"][0] <= lat <= PH["lat"][1] and PH["lng"][0] <= lng <= PH["lng"][1]


def tesseract(img: Image.Image, psm: int) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    res = subprocess.run(
        ["tesseract", "stdin", "stdout", "--oem", "1", "--psm", str(psm), "-l", "eng"],
        input=buf.getvalue(), capture_output=True, timeout=60,
    )
    return res.stdout.decode("utf-8", "replace")


def crops(img: Image.Image):
    """Stamp regions, most likely first: GPS Map Camera puts its band at the bottom; some apps at the top."""
    w, h = img.size
    yield "bottom", img.crop((0, int(h * 0.62), w, h))
    yield "bottom-wide", img.crop((0, int(h * 0.45), w, h))
    yield "top", img.crop((0, 0, w, int(h * 0.3)))
    yield "full", img


def variants(region: Image.Image):
    """Enlarged so stamp text is ~30 px high, then: plain, inverted (light text on a dark band), thresholded."""
    w, _ = region.size
    scale = max(1.0, min(4.0, 2600 / max(w, 1)))
    big = region.resize((int(region.width * scale), int(region.height * scale)), Image.LANCZOS)
    gray = ImageOps.autocontrast(ImageOps.grayscale(big), cutoff=1)
    yield "gray", gray
    inv = ImageOps.invert(gray)
    yield "inverted", inv
    # Light stamp text → black on white; everything else white.
    yield "light-text", gray.point(lambda p: 0 if p > 185 else 255).filter(ImageFilter.MedianFilter(3))
    yield "dark-text", gray.point(lambda p: 0 if p < 90 else 255).filter(ImageFilter.MedianFilter(3))


NUM = r"(-?\d{1,3}(?:[.,·]\s?\d{2,8}))"


def _num(s: str) -> float:
    return float(s.replace(" ", "").replace(",", ".").replace("·", "."))


def _with_point(digits: str, int_len: int) -> float:
    return float(digits[:int_len] + "." + digits[int_len:])


def normalize(text: str) -> str:
    t = text.replace("’", "'").replace("′", "'").replace("”", '"').replace("″", '"').replace("º", "°")
    # Common misreads next to digits: O→0, l/I→1, S→5 (only inside numbers).
    t = re.sub(r"(?<=\d)[Oo](?=\d)", "0", t)
    t = re.sub(r"(?<=\d)[lI|](?=\d)", "1", t)
    return t


def parse_position(text: str) -> tuple[str, float, float] | None:
    """(method, lat, lng) from stamp text, or None."""
    t = normalize(text)
    flat = re.sub(r"\s+", " ", t)

    # "Lat 14.599512° Long 120.984222°", "Latitude: 14,5995 Longitude: 120,9842", "Lat 14.5995N Lon 120.9842E"
    m_lat = re.search(r"\bLat(?:itude)?\b\.?\s*[:=]?\s*" + NUM, flat, re.I)
    m_lng = re.search(r"\b(?:Long(?:itude)?|Lng|Lon)\b\.?\s*[:=]?\s*" + NUM, flat, re.I)
    if m_lat and m_lng:
        lat, lng = _num(m_lat.group(1)), _num(m_lng.group(1))
        if in_ph(lat, lng):
            return "lat-long", lat, lng
    # Decimal point lost: "Lat 14599512 Long 120984222".
    m_lat = re.search(r"\bLat(?:itude)?\b\.?\s*[:=]?\s*(\d{5,9})\b", flat, re.I)
    m_lng = re.search(r"\b(?:Long(?:itude)?|Lng|Lon)\b\.?\s*[:=]?\s*(\d{6,10})\b", flat, re.I)
    if m_lat and m_lng:
        lat, lng = _with_point(m_lat.group(1), 2), _with_point(m_lng.group(1), 3)
        if in_ph(lat, lng):
            return "lat-long", lat, lng

    # Degrees, minutes, seconds: 14°35'58.2"N 120°59'03.2"E
    dms = r"(\d{1,3})\s*[°*o]\s*(\d{1,2})\s*'\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:\"|'')?\s*([NSEW])"
    parts = re.findall(dms, flat)
    lat = lng = None
    for d, mi, s, hemi in parts:
        v = int(d) + int(mi) / 60 + _num(s) / 3600
        if hemi in "NS" and lat is None:
            lat = -v if hemi == "S" else v
        elif hemi in "EW" and lng is None:
            lng = -v if hemi == "W" else v
    if lat is not None and lng is not None and in_ph(lat, lng):
        return "dms", lat, lng

    # Unlabeled pair: "14.599512, 120.984222" or "14.5995N 120.9842E".
    for a, b in re.findall(r"(\d{1,2}[.,]\d{4,8})\s*°?\s*[NS]?\s*[,;/ ]\s*(\d{3}[.,]\d{4,8})\s*°?\s*[EW]?", flat):
        lat, lng = _num(a), _num(b)
        if in_ph(lat, lng):
            return "pair", lat, lng

    # Plus codes: full (7Q63JX9F+5R) or short with a locality (JX9F+5R Manila).
    full = re.search(r"\b([2-9CFGHJMPQRVWX]{8}\+[2-9CFGHJMPQRVWX]{2,3})\b", flat.upper())
    if full:
        pos = olc_decode(full.group(1))
        if pos and in_ph(*pos):
            return "plus-code", pos[0], pos[1]
    short = re.search(r"\b([2-9CFGHJMPQRVWX]{4,6}\+[2-9CFGHJMPQRVWX]{2,3})\b", flat.upper())
    if short:
        pos = olc_recover(short.group(1), NCR)
        if pos and in_ph(*pos):
            return "plus-code", pos[0], pos[1]
    return None


ADDRESS_HINT = re.compile(r"(Philippines|Metro Manila|City|Brgy|Barangay|Street|St\.|Avenue|Ave\.?|Road|Rd\.?)", re.I)


def address_from(text: str) -> str | None:
    """The printed address lines (for a stamp without coordinates)."""
    lines = [re.sub(r"\s+", " ", l).strip(" ,.-") for l in normalize(text).splitlines()]
    picked = [l for l in lines if len(l) >= 8 and ADDRESS_HINT.search(l) and not re.search(r"\b(GMT|AM|PM)\b", l)]
    if not picked:
        return None
    address = ", ".join(dict.fromkeys(picked))
    return address[:200]


def exif_position(img: Image.Image) -> tuple[float, float] | None:
    try:
        gps = img.getexif().get_ifd(0x8825)
    except Exception:
        return None
    if not gps or 2 not in gps or 4 not in gps:
        return None

    def deg(v):
        d, m, s = (float(x) for x in v)
        return d + m / 60 + s / 3600

    lat, lng = deg(gps[2]), deg(gps[4])
    if gps.get(1) == "S":
        lat = -lat
    if gps.get(3) == "W":
        lng = -lng
    return (lat, lng) if in_ph(lat, lng) else None


def read_photo(data: bytes, budget_s: float = 90.0) -> dict:
    """Position of one photo: {"method", "lat", "lng"} or {"address"} or {}."""
    img = Image.open(io.BytesIO(data))
    pos = exif_position(img)
    if pos:
        return {"method": "exif", "lat": pos[0], "lng": pos[1]}
    img = ImageOps.exif_transpose(img).convert("RGB")
    start = time.time()
    votes: Counter = Counter()
    texts: list[str] = []
    for _, region in crops(img):
        for _, variant in variants(region):
            for psm in (6, 11):
                text = tesseract(variant, psm)
                texts.append(text)
                found = parse_position(text)
                if found:
                    method, lat, lng = found
                    votes[(method, round(lat, 6), round(lng, 6))] += 1
                    # Two variants agreeing (or a full plus code) is enough.
                    best, n = votes.most_common(1)[0]
                    if n >= 2 or method == "plus-code":
                        return {"method": best[0], "lat": best[1], "lng": best[2]}
                if time.time() - start > budget_s:
                    break
        if votes:
            best, _ = votes.most_common(1)[0]
            return {"method": best[0], "lat": best[1], "lng": best[2]}
    for text in texts:
        address = address_from(text)
        if address:
            return {"address": address}
    return {}


# ---------------------------------------------------------------------------------------------------------------
# OpenStreetMap (Nominatim: at most one request per second)
# ---------------------------------------------------------------------------------------------------------------
_last = [0.0]


def nominatim(path: str, params: dict) -> object:
    wait = 1.1 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    url = f"https://nominatim.openstreetmap.org/{path}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as res:
        return json.load(res)


def place_name(lat: float, lng: float) -> str | None:
    try:
        a = nominatim("reverse", {"lat": lat, "lon": lng, "format": "jsonv2", "zoom": 16}).get("address", {})
    except Exception:
        return None
    area = a.get("quarter") or a.get("suburb") or a.get("neighbourhood") or a.get("village")
    city = (a.get("city") or a.get("town") or a.get("municipality") or "").replace("City of ", "")
    name = ", ".join(x for x in (area, city) if x)
    return name or None


def geocode(address: str) -> tuple[float, float] | None:
    queries = [address]
    parts = [p.strip() for p in address.split(",") if p.strip()]
    # Fall back to fewer details (street names in stamps are often partial).
    for k in (1, 2, 3):
        if len(parts) > k:
            queries.append(", ".join(parts[k:]))
    for q in queries:
        try:
            hits = nominatim("search", {"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "ph"})
        except Exception:
            continue
        if hits:
            lat, lng = float(hits[0]["lat"]), float(hits[0]["lon"])
            if in_ph(lat, lng):
                return lat, lng
    return None


# ---------------------------------------------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------------------------------------------

def r2_client():
    import boto3  # noqa: PLC0415

    env = os.environ
    account = env.get("OPERATIONS_R2_ACCOUNT_ID") or env.get("R2_ACCOUNT_ID")
    key = env.get("OPERATIONS_R2_ACCESS_KEY_ID") or env.get("R2_ACCESS_KEY_ID")
    secret = env.get("OPERATIONS_R2_SECRET_ACCESS_KEY") or env.get("R2_SECRET_ACCESS_KEY")
    if not (account and key and secret):
        sys.exit("Set OPERATIONS_R2_ACCOUNT_ID, OPERATIONS_R2_ACCESS_KEY_ID and OPERATIONS_R2_SECRET_ACCESS_KEY.")
    client = boto3.client(
        "s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=key, aws_secret_access_key=secret, region_name="auto",
    )
    return client, env.get("OPERATIONS_R2_BUCKET") or "okb-whatsapp-bridge-bucket"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="update lib/config/operations-media.json")
    ap.add_argument("--all", action="store_true", help="re-read photos that already have a location")
    ap.add_argument("--dir", help="read the images in this folder instead of R2 (no JSON update)")
    ap.add_argument("--cache", default=str(ROOT / ".cache/operations-photos"), help="download cache")
    ap.add_argument("--report", default=str(ROOT / ".cache/operations-locate-report.json"))
    ap.add_argument("--limit", type=int, default=0, help="read at most N photos")
    args = ap.parse_args()

    report: list[dict] = []
    if args.dir:
        files = sorted(p for p in Path(args.dir).iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
        for p in files[: args.limit or None]:
            result = read_photo(p.read_bytes())
            print(p.name, result)
            report.append({"file": p.name, **result})
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(json.dumps(report, indent=1))
        return

    media = json.loads(MEDIA_JSON.read_text())
    entries = media[SECTION][KIND]
    todo = [e for e in entries if args.all or "lat" not in e]
    if args.limit:
        todo = todo[: args.limit]
    client, bucket = r2_client()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    counts: Counter = Counter()
    for i, entry in enumerate(todo, 1):
        local = cache / entry["key"].split("/")[-1]
        if not local.exists():
            local.write_bytes(client.get_object(Bucket=bucket, Key=entry["key"])["Body"].read())
        result = read_photo(local.read_bytes())
        lat = lng = None
        approx = False
        if "lat" in result:
            lat, lng = result["lat"], result["lng"]
        elif "address" in result:
            pos = geocode(result["address"])
            if pos:
                lat, lng = pos
                approx = True
                result["method"] = "address"
        counts[result.get("method", "none")] += 1
        if lat is not None:
            place = place_name(lat, lng)
            update = {"lat": round(lat, 6), "lng": round(lng, 6)}
            if place:
                update["place"] = place
            if approx:
                update["approx"] = True
            if args.apply:
                entry.pop("approx", None)
                entry.update(update)
            result.update(update)
        print(f"[{i}/{len(todo)}] {entry['key'].split('/')[-1][:48]} → {result}", flush=True)
        report.append({"key": entry["key"], **result})
        if args.apply and i % 20 == 0:
            MEDIA_JSON.write_text(json.dumps(media, indent=2, ensure_ascii=False) + "\n")
    if args.apply:
        MEDIA_JSON.write_text(json.dumps(media, indent=2, ensure_ascii=False) + "\n")
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, indent=1))
    located = sum(1 for r in report if "lat" in r)
    print(f"\n{located} of {len(todo)} located: {dict(counts)}")


if __name__ == "__main__":
    main()
