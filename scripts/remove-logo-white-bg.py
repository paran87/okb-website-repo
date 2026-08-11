from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
ASSETS = ROOT / "assets"
LOGOS = (
    (
        "bagong-pilipinas-logo.png",
        "c__Users_Jener_L._Braga_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_960px-Bagong_Pilipinas_logo-1b7281a4-8626-474c-b85c-3e8e1e7aaab1.png",
    ),
    (
        "dpwh-logo.png",
        "c__Users_Jener_L._Braga_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-126c6739-5056-498c-9ce9-231344c227f3.png",
    ),
)


def remove_flat_bg(path: Path, tolerance: int = 36) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    seen = bytearray(w * h)
    stack: list[tuple[int, int]] = []

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        if a < 20:
            return True
        if r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance:
            return True
        return r <= tolerance and g <= tolerance and b <= tolerance

    for x in range(w):
        stack.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        stack.extend([(0, y), (w - 1, y)])

    while stack:
        x, y = stack.pop()
        idx = y * w + x
        if seen[idx]:
            continue
        seen[idx] = 1
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            continue
        px[x, y] = (r, g, b, 0)
        if x > 0:
            stack.append((x - 1, y))
        if x < w - 1:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y < h - 1:
            stack.append((x, y + 1))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            light = r > 235 and g > 235 and b > 235
            dark = r < 20 and g < 20 and b < 20
            if not (light or dark):
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    px[x, y] = (r, g, b, 0)
                    break

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    im.save(path, optimize=True)
    print(f"Processed {path.name} -> {im.size}")


if __name__ == "__main__":
    for out_name, _asset_name in LOGOS:
        dest = BRAND / out_name
        if not dest.exists():
            raise FileNotFoundError(dest)
        remove_flat_bg(dest)
