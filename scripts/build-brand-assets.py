"""Copy canonical brand PNGs and generate PWA / favicon sizes from the main logo."""

from pathlib import Path

from PIL import Image

ROOT = Path(r"c:\Users\Oxford\Documents\Cursor Projects\tvpays")
SRC = ROOT / "public/assets/branding/tvpays logo.png"
BRAND = ROOT / "public/assets/branding/tvpays-brand.png"
MARK = ROOT / "public/assets/branding/tvpays-mark-brand.png"
ICONS = ROOT / "public/icons"
APP_ICON = ROOT / "src/app/icon.png"
APPLE_ICON = ROOT / "src/app/apple-icon.png"

BG = (2, 4, 10, 255)


def square_icon(im: Image.Image, size: int, *, maskable: bool) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    pad = int(size * (0.14 if maskable else 0.08))
    inner = size - pad * 2
    w, h = im.size
    scale = min(inner / w, inner / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    im.save(BRAND)

    # Square mark: left portion where the TV icon lives.
    w, h = im.size
    crop = im.crop((0, int(h * 0.02), int(w * 0.34), int(h * 0.88)))
    side = max(crop.size)
    mark_canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    cw, ch = crop.size
    mark_canvas.paste(
        crop,
        ((side - cw) // 2, (side - ch) // 2),
        crop,
    )
    mark_out = square_icon(mark_canvas, 512, maskable=False)
    mark_out.resize((256, 256), Image.Resampling.LANCZOS).save(MARK)

    ICONS.mkdir(parents=True, exist_ok=True)
    square_icon(im, 192, maskable=False).save(ICONS / "icon-192.png")
    square_icon(im, 512, maskable=False).save(ICONS / "icon-512.png")
    square_icon(im, 512, maskable=True).save(ICONS / "icon-512-maskable.png")
    square_icon(im, 32, maskable=False).convert("RGB").save(APP_ICON)
    square_icon(im, 180, maskable=False).save(APP_ICON.parent / "apple-icon.png")

    print("brand assets ok")


if __name__ == "__main__":
    main()
