from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/product/kemeja-kantor-kk-006"


def scroll_workspace(page):
    workspace = page.locator("main > div.overflow-y-auto")
    workspace.evaluate("el => el.scrollTop = 1200")
    page.wait_for_timeout(350)
    print("scroll", workspace.evaluate("el => ({top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight})"))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    desktop = browser.new_page(viewport={"width": 1440, "height": 900})
    desktop.goto(URL, wait_until="networkidle", timeout=60000)
    scroll_workspace(desktop)
    floating_cards = desktop.locator("aside[aria-label='Preview produk ringkas']")
    assert floating_cards.nth(0).is_visible(), "desktop floating preview should be visible"
    floating_cards.nth(0).get_by_role("button", name="Preview 3D").click()
    assert desktop.locator("[role='dialog']").is_visible(), "lightbox should open"
    desktop.keyboard.press("Escape")
    assert not desktop.locator("[role='dialog']").is_visible(), "Escape should close lightbox"
    assert desktop.evaluate("document.activeElement?.textContent?.includes('Preview 3D')"), "focus should return to visible preview button"
    desktop.locator("main > div.overflow-y-auto").evaluate("el => el.scrollTop = 0")
    desktop.wait_for_timeout(350)
    assert not floating_cards.nth(0).is_visible(), "preview should hide when hero returns"
    print("desktop: ok")

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.goto(URL, wait_until="networkidle", timeout=60000)
    scroll_workspace(mobile)
    mobile_card = mobile.locator("aside[aria-label='Preview produk ringkas']").nth(1)
    assert mobile_card.is_visible(), "mobile mini bar should be visible"
    width_ok = mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert width_ok, "mobile preview must not create horizontal overflow"
    print("mobile: ok")

    browser.close()
