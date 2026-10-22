"""Generate local boot assets from the original logo. Requires Pillow.
No tracing, replacement glyphs, or enlargement of a favicon.
"""
from pathlib import Path
from PIL import Image

BRAND = Path(__file__).resolve().parents[1] / "public" / "brand"
master = Image.open(BRAND / "ofissio.png").convert("RGBA")
symbol = master.crop((40, 100, 520, 575))
wordmark = master.crop((545, 190, 2135, 495))
symbol.save(BRAND / "boot-symbol-v1.png", optimize=True)
wordmark.save(BRAND / "boot-wordmark-v1.png", optimize=True)

silver = Image.new("RGBA", symbol.size)
alpha = symbol.getchannel("A")
for y in range(symbol.height):
    t = y / (symbol.height - 1)
    for x in range(symbol.width):
        silver.putpixel((x, y), (int(235 - 65*t), int(242 - 57*t), int(250 - 44*t), alpha.getpixel((x, y))))

for size, ratio, name in [
    (192, .74, "app-icon-192-v1.png"),
    (512, .74, "app-icon-512-v1.png"),
    # Rectangle corners fall inside the maskable safe circle (radius 40%).
    (512, .55, "app-icon-maskable-512-v1.png"),
]:
    icon = Image.new("RGBA", (size, size), "#091629")
    mark = silver.resize((round(size * ratio), round(size * ratio * 475 / 480)), Image.Resampling.LANCZOS)
    icon.alpha_composite(mark, ((size - mark.width)//2, (size - mark.height)//2))
    icon.convert("RGB").save(BRAND / name, optimize=True)
