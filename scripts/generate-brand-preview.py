"""Derive favicon/share assets from the existing original-logo app icon.
Requires Pillow only for asset generation; no new runtime dependency.
"""
from pathlib import Path
import base64
from PIL import Image

public = Path(__file__).resolve().parents[1] / "public"
brand = public / "brand"
source = Image.open(brand / "app-icon-512-v1.png").convert("RGB")
assert source.size == (512, 512)
for corner in [(0, 0), (511, 0), (0, 511), (511, 511)]:
    assert source.getpixel(corner) == (9, 22, 41)

source.save(brand / "ofissio-share-navy-v1.png", optimize=True)
small = source.resize((32, 32), Image.Resampling.LANCZOS)
small.save(brand / "favicon-navy-32-v3.png", optimize=True)
small.save(public / "favicon-ofissio-32.png", optimize=True)

# Compatibility URLs, including the existing /favicon.ico redirect.
# These remain raster wrappers, not a newly traced/vector master logo.
png = base64.b64encode((brand / "ofissio-share-navy-v1.png").read_bytes()).decode("ascii")
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
       '<image width="512" height="512" href="data:image/png;base64,' + png + '"/></svg>\n')
for name in ["favicon.svg", "favicon-ofissio.svg"]:
    (public / name).write_text(svg, encoding="utf-8")
print("Generated opaque navy share image, favicon, and legacy compatibility assets")
