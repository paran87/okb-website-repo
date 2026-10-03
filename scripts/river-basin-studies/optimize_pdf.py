import pymupdf, pikepdf, time, os, sys, io
from PIL import Image
MAX_W = 1800      # px; crisp on retina at a 900px-wide page
QUALITY = 62
def optimize(src, dst):
    doc = pymupdf.open(src)
    seen = set()
    for pno in range(doc.page_count):
        for im in doc.get_page_images(pno, full=True):
            xref = im[0]
            if xref in seen: continue
            seen.add(xref)
            try:
                info = doc.extract_image(xref)
                if info["ext"] not in ("jpeg", "jpg", "png") or info["width"] <= MAX_W or info.get("smask"):
                    if info["width"] <= MAX_W: continue
                img = Image.open(io.BytesIO(info["image"]))
                if img.mode not in ("L", "RGB"): img = img.convert("RGB")
                h = round(img.height * MAX_W / img.width)
                img = img.resize((MAX_W, h), Image.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, "JPEG", quality=QUALITY, optimize=True, progressive=False)
                if buf.tell() < len(info["image"]):
                    doc[pno].replace_image(xref, stream=buf.getvalue())
            except Exception as e:
                print("skip image", xref, e, file=sys.stderr)
    tmp = dst + ".tmp.pdf"
    doc.save(tmp, garbage=4, deflate=True)
    doc.close()
    with pikepdf.open(tmp) as p:
        p.save(dst, linearize=True, compress_streams=True)
    os.remove(tmp)
if __name__ == "__main__":
    t = time.time(); optimize(sys.argv[1], sys.argv[2])
    print("MB", os.path.getsize(sys.argv[1])/1e6, "->", os.path.getsize(sys.argv[2])/1e6, "in", round(time.time()-t,1), "s")
