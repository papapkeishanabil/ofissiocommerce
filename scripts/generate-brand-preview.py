"""Derive favicon/share assets from the existing original-logo app icon.
Requires Pillow only for asset generation; no new runtime dependency.
"""
from pathlib import Path
import base64
from PIL import Image

public = Path(__file__).resolve().parents[1] / "public"
brand = public / "brand"
symbol = Image.open(brand / "boot-symbol-v1.png").convert("RGBA")
mark = Image.new("RGBA", symbol.size, (255, 255, 255, 255))
mark.putalpha(symbol.getchannel("A").point(lambda value: 255 if value >= 240 else value))
mark = mark.resize((379, 375), Image.Resampling.LANCZOS)
source = Image.new("RGB", (512, 512), (9, 22, 41))
source.paste(mark, ((512 - 379) // 2, (512 - 375) // 2), mark)
assert source.size == (512, 512)
for corner in [(0, 0), (511, 0), (0, 511), (511, 511)]:
    assert source.getpixel(corner) == (9, 22, 41)

source.save(brand / "ofissio-share-navy-v2.png", optimize=True)
source.resize((192, 192), Image.Resampling.LANCZOS).save(brand / "favicon-navy-192-v4.png", optimize=True)
small = source.resize((32, 32), Image.Resampling.LANCZOS)
small.save(brand / "favicon-navy-32-v4.png", optimize=True)
small.save(public / "favicon-ofissio-32.png", optimize=True)

# Compatibility URLs, including the existing /favicon.ico redirect.
# These remain raster wrappers, not a newly traced/vector master logo.
png = base64.b64encode((brand / "ofissio-share-navy-v2.png").read_bytes()).decode("ascii")
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
       '<image width="512" height="512" href="data:image/png;base64,' + png + '"/></svg>\n')
for name in ["favicon.svg", "favicon-ofissio.svg"]:
    (public / name).write_text(svg, encoding="utf-8")
print("Generated opaque navy share image, favicon, and legacy compatibility assets")
