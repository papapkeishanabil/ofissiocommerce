"""Read-only browser checks; never saves admin content or places orders."""
from pathlib import Path
import json
import sys
from playwright.sync_api import sync_playwright

OUTPUT = Path(__file__).resolve().parents[1] / ".impeccable" / "review" / "inspiration-2026-09-11"
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = next((arg.split("=", 1)[1].rstrip("/") for arg in sys.argv if arg.startswith("--base=")), "http://localhost:8000")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def visit(path):
        response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_load_state("networkidle", timeout=45_000)
        page.evaluate("document.fonts.ready")
        assert response and response.status == 200, (path, response.status if response else None)
        assert page.locator("main h1").count() == 1, path
        assert not page.locator("[data-nextjs-dialog]").count(), path
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), path

    visit("/inspirasi")
    urls = page.locator("main nav a[href^='/inspirasi/']").evaluate_all("els => [...new Set(els.map(el => el.getAttribute('href')))]")
    assert len(urls) == 20, urls
    page.screenshot(path=str(OUTPUT / "directory-desktop.png"), full_page=True)
    results = []
    for url in ([] if "--quick" in sys.argv else urls):
        response = page.request.get(BASE + url, timeout=60_000)
        assert response.status == 200, (url, response.status)
        results.append({"path": url, "status": response.status})
    assert page.request.get(BASE + "/inspirasi/tidak-ada").status == 404
    print("ROUTES", json.dumps(results))

    for slug in ["solusi-korporasi", "apotek-klinik", "retail", "bengkel-teknisi"]:
        visit("/inspirasi/" + slug)
        page.wait_for_function("[...document.querySelectorAll('main section:first-child img')].every(i => i.complete && i.naturalWidth > 0)")
        hero = page.locator("main section").first
        page.screenshot(path=str(OUTPUT / (slug + "-desktop.png")), full_page=False)
        frame = hero.locator("img").first.locator("..").first
        if slug != "bengkel-teknisi":
            frame.scroll_into_view_if_needed()
            page.screenshot(path=str(OUTPUT / (slug + "-canvas.png")), full_page=False)
        print("PAGE", json.dumps({"slug": slug, "title": page.locator("main h1").inner_text(), "annotations": hero.locator("polyline").count(), "catalog": page.locator("main a[href^='/catalog?']").first.get_attribute("href"), "products": page.locator("main a[href^='/product/']").count()}))
        if slug != "bengkel-teknisi":
            assert hero.locator("polyline").count() == 3
            assert page.get_by_role("link", name="Kembali ke Bisnis & Korporasi").get_attribute("href") == "/#usaha"
            page.get_by_role("link", name="Lihat pilihan seragam", exact=True).click()
            assert page.url.endswith("#pilihan-produk")
        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("document.querySelector('[data-workspace-scroll]').scrollTo(0, 0)")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), slug
        page.screenshot(path=str(OUTPUT / (slug + "-mobile.png")), full_page=False)
        if slug != "bengkel-teknisi":
            frame.scroll_into_view_if_needed()
            page.screenshot(path=str(OUTPUT / (slug + "-mobile-benefits.png")), full_page=False)
        page.set_viewport_size({"width": 1440, "height": 1000})

    response = page.goto(BASE + "/", wait_until="domcontentloaded", timeout=60_000)
    # Homepage hero video keeps streaming; use the rendered target, not a quiet network.
    page.locator("#usaha").wait_for(timeout=45_000)
    print("HOME LINKS", json.dumps(page.locator("#usaha a").evaluate_all("els => els.map(el => el.getAttribute('href'))")))
    assert page.locator("#usaha a[href='/inspirasi/apotek-klinik']").count() > 0
    assert page.locator("#usaha a[href='/inspirasi/solusi-korporasi']").count() >= 2
    page.goto(BASE + "/admin/site-content/industri", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_load_state("networkidle", timeout=45_000)
    print("ADMIN", json.dumps({"url": page.url, "selects": page.locator("select").count(), "text": page.locator("main").inner_text()[:1200] if page.locator("main").count() else page.locator("body").inner_text()[:500]}))
    print("PAGE ERRORS", json.dumps(errors))
    assert not errors
    browser.close()
