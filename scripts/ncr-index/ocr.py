#!/usr/bin/env python3
"""
Reads the header of every rendered NCR daily accomplishment page (DEO, LOCATION, ACTIVITY, DATE) with Tesseract and
writes lib/config/ncr-index.json, which the Gallery's NCR search uses.

    sudo apt-get install tesseract-ocr && pip install pillow
    python3 scripts/ncr-index/ocr.py            # all pages
    python3 scripts/ncr-index/ocr.py daily 469  # only pages above the last indexed ones, see --help
"""
import json, os, re, subprocess, sys, tempfile
from multiprocessing import Pool
from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PAGES = os.path.join(ROOT, "public", "ncr-pages")
OUT = os.path.join(ROOT, "lib", "config", "ncr-index.json")
LABELS = ("DEO", "LOCATION", "ACTIVITY", "DATE")


KEEP = {"a", "of", "in", "to", "at", "on", "by", "or", "an", "as", "and", "the", "for", "st", "no", "ave", "rd"}
MONTH = re.compile(r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\s*,?\s*\d{4})", re.I)


def clean(s: str, field: str = "") -> str:
    s = re.sub(r"\s+", " ", s).strip(" :-_|~.,;")
    if field == "date":
        m = MONTH.search(s)
        return re.sub(r"\s+,", ",", m.group(1)).title() if m else ""
    # Tesseract adds stray marks and short fragments where the photos start; keep real words, numbers and punctuation.
    out = []
    for tok in s.split(" "):
        word = re.sub(r"[^\w]", "", tok)
        if not word:
            continue
        if re.search(r"[^\w.,()\"“”'’&/\-–]", tok):
            tok = re.sub(r"[^\w.,()\"“”'’&/\-–]", "", tok)
        if len(word) <= 2 and word.lower() not in KEEP and not word.isdigit():
            continue
        out.append(tok)
    s = " ".join(out)
    s = re.sub(r"\s\d,(?=\s)", " ", s)
    s = re.sub(r"\s+\d$", "", s)
    return s.strip(" :-_|~.,;")


def read(path: str) -> dict:
    im = Image.open(path).convert("L")
    w, h = im.size
    crop = im.crop((0, int(h * 0.06), int(w * 0.58), int(h * 0.46)))
    crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
    crop = ImageOps.invert(crop)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        tmp = f.name
    crop.save(tmp)
    text = subprocess.run(["tesseract", tmp, "-", "--psm", "6"], capture_output=True, text=True).stdout
    os.unlink(tmp)
    fields = {k.lower(): "" for k in LABELS}
    current = None
    for line in text.splitlines():
        m = re.match(r"\s*(DEO|LOCATION|ACTIVITY|DATE)\b[\s:;\-]*(.*)", line, re.I)
        if m:
            current = m.group(1).lower()
            fields[current] = m.group(2)
        elif current and current != "date" and line.strip() and not re.match(r"\s*BEFORE", line, re.I):
            fields[current] += " " + line
        elif re.match(r"\s*BEFORE", line, re.I):
            current = None
    return {k: clean(v, k) for k, v in fields.items() if clean(v, k)}


def job(arg):
    board, page = arg
    try:
        return board, page, read(os.path.join(PAGES, board, f"{page}.webp"))
    except Exception as e:  # keep going
        print("failed", board, page, e, file=sys.stderr)
        return board, page, {}


if __name__ == "__main__":
    only = sys.argv[1:2]
    jobs = []
    for board in sorted(os.listdir(PAGES)):
        if only and board != only[0]:
            continue
        n = len([f for f in os.listdir(os.path.join(PAGES, board)) if f.endswith(".webp")])
        jobs += [(board, p) for p in range(1, n + 1)]
    index = {}
    with Pool(4) as pool:
        for i, (board, page, data) in enumerate(pool.imap_unordered(job, jobs, chunksize=4), 1):
            index.setdefault(board, {})[str(page)] = data
            if i % 50 == 0:
                print(i, "/", len(jobs), flush=True)
    ordered = {b: {k: index[b][k] for k in sorted(index[b], key=int)} for b in sorted(index)}
    with open(OUT, "w") as f:
        json.dump(ordered, f, ensure_ascii=False, separators=(",", ":"))
    print("wrote", OUT, sum(len(v) for v in ordered.values()), "pages")
