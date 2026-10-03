"""Download every river-basin study from Google Drive and optimize it.

Optimized = scanned page images downscaled (max 1800 px wide, JPEG q62) and the
PDF linearized ("Fast Web View") so a viewer can show page 1 after the first
chunk. Output: <out>/<fileId>.pdf plus <out>/report.json.

Usage: python3 scripts/river-basin-studies/optimize_all.py /path/to/out [workers]
Requires: pip install pikepdf pymupdf pillow
"""
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ProcessPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(__file__))
from optimize_pdf import optimize  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CATALOG = os.path.join(ROOT, "lib", "config", "river-basin-documents.json")


def file_ids():
    with open(CATALOG, encoding="utf-8") as f:
        data = json.load(f)
    ids = {}
    for basin in data.values():
        for key in ("feasibility", "masterPlan", "unclassified"):
            for doc in basin[key]:
                ids[doc["id"]] = doc["title"]
    return ids


def download(file_id, dest):
    url = (
        "https://drive.usercontent.google.com/download"
        f"?id={file_id}&export=download&confirm=t"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 OKB-Command-Center"})
    with urllib.request.urlopen(req, timeout=180) as res, open(dest, "wb") as out:
        while chunk := res.read(1 << 20):
            out.write(chunk)


def process(args):
    file_id, title, out_dir = args
    dst = os.path.join(out_dir, f"{file_id}.pdf")
    raw = os.path.join(out_dir, f"{file_id}.src")
    started = time.time()
    try:
        if os.path.exists(dst):
            return {"id": file_id, "title": title, "status": "done", "bytes": os.path.getsize(dst)}
        download(file_id, raw)
        with open(raw, "rb") as f:
            head = f.read(5)
        src_bytes = os.path.getsize(raw)
        if head != b"%PDF-":
            os.remove(raw)
            return {"id": file_id, "title": title, "status": "not-pdf", "srcBytes": src_bytes}
        try:
            optimize(raw, dst)
            status = "optimized"
        except Exception as error:  # keep the original if optimizing fails
            os.replace(raw, dst)
            status = f"original ({error})"
        if os.path.exists(raw):
            os.remove(raw)
        return {
            "id": file_id, "title": title, "status": status,
            "srcBytes": src_bytes, "bytes": os.path.getsize(dst),
            "seconds": round(time.time() - started, 1),
        }
    except Exception as error:
        return {"id": file_id, "title": title, "status": f"failed ({error})"}


def main():
    out_dir = os.path.abspath(sys.argv[1])
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    os.makedirs(out_dir, exist_ok=True)
    jobs = [(i, t, out_dir) for i, t in file_ids().items()]
    results = []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for future in as_completed([pool.submit(process, j) for j in jobs]):
            result = future.result()
            results.append(result)
            print(len(results), "/", len(jobs), result["status"], result["id"], result.get("bytes", ""), flush=True)
            with open(os.path.join(out_dir, "report.json"), "w", encoding="utf-8") as f:
                json.dump(results, f, indent=1)


if __name__ == "__main__":
    main()
