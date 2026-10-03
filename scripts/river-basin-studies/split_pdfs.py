"""Split each optimized study PDF into small standalone chunk PDFs (~3 MB each).

The viewer opens a study by loading just its first chunk (one request) and fetches
later chunks as the reader scrolls, instead of making many serial range requests.

Chunk i of a study covers pages [i*per + 1, min((i+1)*per, pages)]; `per` is stored
in the manifest lib/config/river-basin-chunks.json as {id: {"pages": N, "per": P, "bytes": size}}.

Usage: python3 scripts/river-basin-studies/split_pdfs.py IN_DIR OUT_DIR [workers]
Requires: pip install pikepdf
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed

import pikepdf

TARGET_BYTES = 3 * 1024 * 1024
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MANIFEST = os.path.join(ROOT, "lib", "config", "river-basin-chunks.json")


def split(args):
    pdf_path, out_dir = args
    study = os.path.basename(pdf_path)[: -len(".pdf")]
    size = os.path.getsize(pdf_path)
    try:
        with pikepdf.open(pdf_path) as src:
            pages = len(src.pages)
            per = max(1, min(pages, round(TARGET_BYTES / max(size / pages, 1))))
            folder = os.path.join(out_dir, study)
            os.makedirs(folder, exist_ok=True)
            total = 0
            count = 0
            for index, first in enumerate(range(0, pages, per)):
                dst = pikepdf.Pdf.new()
                dst.pages.extend(src.pages[first : first + per])
                target = os.path.join(folder, f"{index}.pdf")
                dst.save(target, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
                total += os.path.getsize(target)
                count += 1
        return {"id": study, "pages": pages, "per": per, "chunks": count, "src": size, "out": total}
    except Exception as error:  # a study that cannot be split keeps using the single-file viewer
        return {"id": study, "error": str(error)[:120]}


def main():
    in_dir, out_dir = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    files = sorted(os.path.join(in_dir, f) for f in os.listdir(in_dir) if f.endswith(".pdf"))
    manifest, report = {}, []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for done, future in enumerate(as_completed([pool.submit(split, (f, out_dir)) for f in files]), 1):
            result = future.result()
            report.append(result)
            if "error" not in result:
                manifest[result["id"]] = {"pages": result["pages"], "per": result["per"], "bytes": result["src"]}
            print(done, "/", len(files), {k: v for k, v in result.items() if k in ("id", "chunks", "error")}, flush=True)
    with open(os.path.join(out_dir, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
        f.write("\n")
    ok = [r for r in report if "error" not in r]
    print("split", len(ok), "studies;", sum(r["chunks"] for r in ok), "chunks;",
          round(sum(r["src"] for r in ok) / 1e9, 2), "GB ->", round(sum(r["out"] for r in ok) / 1e9, 2), "GB")


if __name__ == "__main__":
    main()
