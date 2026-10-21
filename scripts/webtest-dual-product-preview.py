"""Run against local next dev. Creates and removes a temporary component fixture.

No WooCommerce writes. The SN Basic label identifies synthetic test data, not a
verified live SN Basic product. Screenshots are saved under artifacts/.
"""
import base64
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ROUTE = ROOT / "src/app/dual-preview-test/page.tsx"
OUTPUT = ROOT / "artifacts/dual-product-preview"
FIXTURE = '''"use client";
import { useState } from "react";
import { PRODUCT_MOCK_DATA } from "@/features/products/product.mock-data";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
export default function Fixture() {
  const [opened, setOpened] = useState(false);
  const base = PRODUCT_MOCK_DATA.find(p => p.model_3d)!;
  const images = ["/favicon-ofissio-32.png", "/industries/Ofissio_Team.png", "/favicon-ofissio-32.png?third=1"].map((src, id) => ({id, src, alt: `Foto ${id + 1}`, name: `Foto ${id + 1}`}));
  const products = [1,2,3,2].map((count, index) => ({...base, id: `preview-${index}`, name: `SN Basic fixture ${index}`, mainImage: images[0]!.src, images: index === 3 ? [images[0]!, {...images[1]!, src: "/missing-secondary.png"}] : images.slice(0,count)}));
  return <main style={{padding: 24}}><h1>Dual preview test fixture</h1><div className="catalog-product-grid">{products.map(p => <CatalogProductCard key={p.id} product={p}/>)}</div><section data-testid="legacy" style={{width: "min(100%, 350px)"}}><ProductCard product={products[1]!}/></section><section data-testid="gallery"><ProductGallery product={products[2]!} immersive has3DSupport onOpen3D={() => setOpened(true)}/><output>{opened ? "3D callback OK" : "3D closed"}</output></section></main>;
}
'''
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8V8AAAAASUVORK5CYII=")


def run():
    if ROUTE.exists():
        raise RuntimeError("Refusing to overwrite existing fixture route")
    ROUTE.parent.mkdir(exist_ok=True)
    ROUTE.write_text(FIXTURE, encoding="utf-8")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto("http://localhost:8000/dual-preview-test", timeout=60000)
            page.wait_for_load_state("networkidle")
            cards = page.locator(".catalog-product-card")
            expect(cards).to_have_count(4)
            expect(cards.nth(0).get_by_role("group")).to_have_count(0)
            expect(cards.nth(1).locator("img")).to_have_count(1)
            # Confirm real Next optimizer loads the primary image.
            page.wait_for_function("document.querySelector('.catalog-product-photo img').naturalWidth > 0")
            print("PASS: one image fallback, optimized primary, secondary absent before intent")

            pending = []
            requests = []
            defer_secondary = [True]
            def secondary_route(route):
                source = parse_qs(urlparse(route.request.url).query).get("url", [""])[0]
                if source == "/industries/Ofissio_Team.png":
                    requests.append(source)
                    if defer_secondary[0]:
                        pending.append(route)
                    else:
                        route.fulfill(status=200, content_type="image/png", body=PNG)
                elif source == "/missing-secondary.png":
                    route.fulfill(status=404, body="missing")
                else:
                    route.continue_()
            page.route("**/_next/image?**", secondary_route)
            photo = cards.nth(1).locator(".catalog-product-photo")
            before = photo.bounding_box()
            photo.hover()
            expect(photo.locator("img")).to_have_count(2)
            second = photo.locator("img").nth(1)
            expect(second).to_have_css("opacity", "0")
            page.wait_for_timeout(100)
            assert pending, "Secondary request should be deferred until hover"
            for route in pending:
                route.fulfill(status=200, content_type="image/png", body=PNG)
            pending.clear()
            defer_secondary[0] = False
            expect(second).to_have_css("opacity", "1")
            expect(second).to_have_css("transition-duration", "0.25s")
            assert photo.bounding_box() == before
            page.mouse.move(0, 0)
            expect(second).to_have_css("opacity", "0")
            photo.hover()
            expect(second).to_have_css("opacity", "1")
            assert len(requests) == 1, "Repeated hover should reuse loaded image"
            page.mouse.move(0, 0)
            expect(second).to_have_css("opacity", "0")
            page.keyboard.press("Tab")
            photo.locator("a").focus()
            expect(second).to_have_css("opacity", "1")
            page.keyboard.press("Tab")
            photo.get_by_role("button", name="Tampilkan foto kedua SN Basic fixture 1").focus()
            page.keyboard.press("Enter")
            expect(second).to_have_css("opacity", "1")
            photo.get_by_role("button", name="Tampilkan foto utama SN Basic fixture 1").click()
            expect(second).to_have_css("opacity", "0")
            print("PASS: delayed load, 250ms fade, mouse leave, repeated hover, keyboard, stable dimensions")

            for surface in [cards.nth(2), page.get_by_test_id("legacy")]:
                surface.locator("a").first.hover()
                expect(surface.locator("img")).to_have_count(2)
                expect(surface.locator("img").nth(1)).to_have_css("opacity", "1")
            page.emulate_media(reduced_motion="reduce")
            duration = page.get_by_test_id("legacy").locator("img").nth(1).evaluate("x => parseFloat(getComputedStyle(x).transitionDuration)")
            assert duration <= 0.001, duration  # Global reduced-motion rules may use a tiny nonzero duration.
            page.emulate_media(reduced_motion="no-preference")
            print("PASS: both card variants; catalog uses only first two of 3+ images; reduced motion")

            broken = cards.nth(3).locator(".catalog-product-photo")
            broken.hover()
            expect(broken.get_by_role("group")).to_have_count(0)
            expect(broken.locator("img")).to_have_count(1)
            assert broken.locator("img").evaluate("x => x.naturalWidth > 0")
            expect(cards.nth(2).get_by_text("3D tersedia")).to_be_visible()
            gallery = page.get_by_test_id("gallery")
            expect(gallery.get_by_role("button", name="Tampilkan foto", exact=False)).to_have_count(3)
            gallery.get_by_role("button", name="Tampilkan foto 3:").click()
            expect(gallery.get_by_role("button", name="Tampilkan foto 3:")).to_have_attribute("aria-pressed", "true")
            gallery.get_by_role("button", name="Buka Preview 3D di Studio Bordir").click()
            expect(gallery.locator("output")).to_have_text("3D callback OK")
            page.locator(".catalog-product-grid").screenshot(path=str(OUTPUT / "desktop.png"))
            print("PASS: failed secondary retains primary; 3+ gallery images and 3D callback preserved")

            mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
            m = mobile.new_page()
            def mobile_image(route):
                source = parse_qs(urlparse(route.request.url).query).get("url", [""])[0]
                if source == "/industries/Ofissio_Team.png":
                    route.fulfill(status=200, content_type="image/png", body=PNG)
                else:
                    route.continue_()
            m.route("**/_next/image?**", mobile_image)
            m.goto("http://localhost:8000/dual-preview-test")
            m.wait_for_load_state("networkidle")
            card = m.locator(".catalog-product-card").nth(1)
            toggle = card.get_by_role("button", name="Tampilkan foto kedua SN Basic fixture 1")
            expect(toggle).to_be_visible()
            toggle.tap()
            expect(toggle).to_have_attribute("aria-pressed", "true")
            card.get_by_role("button", name="Tampilkan foto utama SN Basic fixture 1").tap()
            expect(toggle).to_have_attribute("aria-pressed", "false")
            expect(card.get_by_role("link", name="Lihat Detail SN Basic fixture 1", exact=True)).to_be_visible()
            assert m.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert card.locator(".catalog-product-photo").evaluate("x => getComputedStyle(x).aspectRatio") == "1.6 / 1"
            m.screenshot(path=str(OUTPUT / "mobile.png"), full_page=True)
            assert not errors, errors
            print("PASS: mobile touch controls, indicators, navigation, aspect ratio, no horizontal overflow or runtime errors")
            mobile.close()
            browser.close()
    finally:
        ROUTE.unlink(missing_ok=True)
        ROUTE.parent.rmdir()


if __name__ == "__main__":
    run()
