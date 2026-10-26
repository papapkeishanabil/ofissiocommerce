"""Derive favicon/share assets from the original logo silhouette and CTA navy.
Requires Pillow and Playwright/Chromium for generation; no runtime dependency.
"""
from pathlib import Path
from io import BytesIO
import base64
import re
from PIL import Image
from playwright.sync_api import sync_playwright

public = Path(__file__).resolve().parents[1] / "public"
brand = public / "brand"
symbol = Image.open(brand / "boot-symbol-v1.png").convert("RGBA")
mark = Image.new("RGBA", symbol.size, (255, 255, 255, 255))
mark.putalpha(symbol.getchannel("A").point(lambda value: 255 if value >= 240 else value))
mark = mark.resize((379, 375), Image.Resampling.LANCZOS)
# Read the same tokens as the homepage CTA and let Chromium render its OKLab
# gradient, so the exported image matches Tailwind's color interpolation.
css = (public.parent / "src/app/globals.css").read_text(encoding="utf-8")
start, end = [re.search(rf"--color-brand-{shade}:\s*(#[0-9a-fA-F]{{6}})", css).group(1)
              for shade in (700, 900)]
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 512, "height": 512}, device_scale_factor=1)
    page.set_content(f'<body style="margin:0;min-height:100vh;background:linear-gradient(to bottom right in oklab,{start},{end})"></body>')
    source = Image.open(BytesIO(page.screenshot())).convert("RGB")
    browser.close()
source.paste(mark, ((512 - 379) // 2, (512 - 375) // 2), mark)
assert source.size == (512, 512)

source.save(brand / "ofissio-share-navy-v4.png", optimize=True)
source.resize((192, 192), Image.Resampling.LANCZOS).save(brand / "favicon-navy-192-v6.png", optimize=True)
small = source.resize((32, 32), Image.Resampling.LANCZOS)
small.save(brand / "favicon-navy-32-v6.png", optimize=True)
small.save(public / "favicon-ofissio-32.png", optimize=True)

# Compatibility URLs, including the existing /favicon.ico redirect.
# These remain raster wrappers, not a newly traced/vector master logo.
png = base64.b64encode((brand / "ofissio-share-navy-v4.png").read_bytes()).decode("ascii")
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
       '<image width="512" height="512" href="data:image/png;base64,' + png + '"/></svg>\n')
for name in ["favicon.svg", "favicon-ofissio.svg"]:
    (public / name).write_text(svg, encoding="utf-8")
print("Generated opaque navy share image, favicon, and legacy compatibility assets")
