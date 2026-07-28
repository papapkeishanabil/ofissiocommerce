from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/product/kemeja-kantor-kk-006"


def scroll_workspace(page):
    workspace = page.locator("main > div.overflow-y-auto")
    workspace.evaluate("el => el.scrollTop = 1200")
    page.wait_for_timeout(350)
    print("scroll", workspace.evaluate("el => ({top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight})"))


def scroll_workspace_top(page):
    workspace = page.locator("main > div.overflow-y-auto")
    workspace.evaluate("el => el.scrollTop = 0")
    page.wait_for_timeout(450)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    desktop = browser.new_page(viewport={"width": 1440, "height": 900})
    desktop.goto(URL, wait_until="networkidle", timeout=60000)
    scroll_workspace(desktop)
    floating_cards = desktop.locator("aside[aria-label='Preview produk ringkas']")
    assert floating_cards.nth(0).is_visible(), "desktop floating preview should be visible"
    add_button = desktop.get_by_role("link", name="Request Quotation (placeholder)")
    card_box = floating_cards.nth(0).bounding_box()
    add_box = add_button.bounding_box()
    assert card_box and add_box
    assert card_box["y"] >= add_box["y"] + add_box["height"] or card_box["y"] + card_box["height"] <= add_box["y"], "floating preview must not cover Request Quotation"
    floating_cards.nth(0).get_by_role("button", name="Preview 3D").click()
    lightbox = desktop.locator("[role='dialog']").filter(has=desktop.get_by_role("button", name="Buka Preview 3D"))
    assert lightbox.is_visible(), "lightbox should open"
    desktop.keyboard.press("Escape")
    desktop.wait_for_timeout(150)
    assert not lightbox.is_visible(), "Escape should close lightbox"
    assert desktop.evaluate("document.activeElement?.textContent?.includes('Preview 3D')"), "focus should return to visible preview button"
    scroll_workspace_top(desktop)
    assert not floating_cards.nth(0).is_visible(), "preview should hide when hero returns"

    # Close persists for this product, even after scrolling away from the hero again.
    scroll_workspace(desktop)
    assert floating_cards.nth(0).is_visible(), "preview should return before dismissal"
    floating_cards.nth(0).get_by_role("button", name="Tutup preview produk mengambang").click()
    assert not floating_cards.nth(0).is_visible(), "close button should hide preview"
    scroll_workspace_top(desktop)
    scroll_workspace(desktop)
    assert not floating_cards.nth(0).is_visible(), "dismissal must persist for the same product"
    print("desktop: ok")

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.goto(URL, wait_until="networkidle", timeout=60000)
    scroll_workspace(mobile)
    mobile_card = mobile.locator("aside[aria-label='Preview produk ringkas']").nth(1)
    assert mobile_card.is_visible(), "mobile mini bar should be visible"
    width_ok = mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert width_ok, "mobile preview must not create horizontal overflow"
    print("mobile: ok")

    # Phase 4A regression smoke: the existing configurator still opens, accepts
    # a logo placement, and hands that placement to the cart line item.
    phase4a = browser.new_page(viewport={"width": 1440, "height": 900})
    phase4a.goto(URL, wait_until="networkidle", timeout=60000)
    phase4a.get_by_role("button", name="Preview 3D & Bordir Logo").click()
    studio = phase4a.get_by_role("dialog", name="Konfigurator 3D bordir")
    assert studio.is_visible(), "3D studio should open"
    phase4a.locator("input[type='file']").set_input_files({
        "name": "test-logo.png",
        "mimeType": "image/png",
        "buffer": bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63600000020001e221bc330000000049454e44ae426082"),
    })
    assert studio.get_by_text("1 titik bordir").is_visible(), "uploaded logo should create a placement"
    studio.get_by_role("button", name="Simpan Konfigurasi").click()
    assert not studio.is_visible(), "saving should close the 3D studio"
    phase4a.get_by_label("Quantity ukuran M").fill("20")
    phase4a.get_by_role("button", name="Tambahkan ke Keranjang").click()
    cart = phase4a.evaluate("JSON.parse(localStorage.getItem('ofissio-cart-v1')).state.items")
    assert cart and cart[0]["uniform3DConfig"]["placements"], "placement must be carried into cart"
    print("phase4a: ok")

    browser.close()
