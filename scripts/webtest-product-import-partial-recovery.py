import os

from playwright.sync_api import sync_playwright


BASE = os.getenv("OFISSIO_TEST_BASE_URL", "http://localhost:8000")
BATCH = "6d051669-edb4-4e33-a431-f53d09d78aff"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1100})
    page_errors: list[str] = []
    console_errors: list[str] = []
    write_requests: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("request", lambda request: write_requests.append(request.url) if request.method != "GET" and ("recover-partial" in request.url or "execute" in request.url or "upload" in request.url) else None)
    page.goto(f"{BASE}/admin/products/import/history/{BATCH}", wait_until="networkidle", timeout=60000)
    if "/login" in page.url:
        page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"])
        page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Masuk", exact=True).click()
        page.wait_for_url("**/admin**", timeout=30000)
        page.goto(f"{BASE}/admin/products/import/history/{BATCH}", wait_until="networkidle", timeout=60000)
        page.wait_for_load_state("networkidle")
    page.get_by_role("heading", name="Partial import detected").wait_for(timeout=30000)
    card = page.locator("article").filter(has_text="KK-014")
    assert card.count() == 1
    assert "PARTIAL IMPORT PRODUCT" in card.inner_text()
    assert "Woo product ID: 558" in card.inner_text()
    assert "6 variations · 7 images" in card.inner_text()
    assert "0 variations · 0 images" in card.inner_text()
    assert card.get_by_role("button", name="Recover & Retry", exact=True).count() == 1
    assert write_requests == [], write_requests
    assert page_errors == [], page_errors
    assert console_errors == [], console_errors
    print("partial_recovery_ui=PASS sku=KK-014 product_id=558 action_visible=YES recovery_requests=0 execute_requests=0 upload_requests=0")
    browser.close()
