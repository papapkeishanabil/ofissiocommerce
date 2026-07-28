from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
    page.goto("http://127.0.0.1:8000/product/kemeja-kantor-kk-006", wait_until="networkidle", timeout=60000)
    page.get_by_role("button", name="Preview 3D & Bordir Logo").first.click()
    page.wait_for_timeout(3000)

    for name in ("Depan", "Dada Kanan", "Dada Kiri"):
        page.get_by_role("button", name=name, exact=True).click()
        page.wait_for_timeout(3000)
        canvas = page.locator("canvas")
        canvas.screenshot(path=f"view-{name.replace(' ', '-').lower()}.png")
        print(name, canvas.bounding_box())

    browser.close()
