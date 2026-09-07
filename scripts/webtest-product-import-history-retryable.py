import os

from playwright.sync_api import sync_playwright


BASE = os.getenv("OFISSIO_TEST_BASE_URL", "http://localhost:8000")
BATCH = "6d051669-edb4-4e33-a431-f53d09d78aff"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1000})
    page_errors: list[str] = []
    console_errors: list[str] = []
    forbidden_requests: list[str] = []

    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )

    def record_request(request):
        url = request.url.lower()
        if "/api/admin/products/import/execute" in url or "upload" in url:
            forbidden_requests.append(request.url)

    page.on("request", record_request)
    page.goto(f"{BASE}/admin/products/import/history", wait_until="networkidle", timeout=60000)

    if "/login" in page.url:
        page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"])
        page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Masuk", exact=True).click()
        page.wait_for_url("**/admin/products/import/history", timeout=30000)
        page.wait_for_load_state("networkidle")

    row = page.locator("tbody tr").filter(has_text=BATCH)
    assert row.count() == 1, "Production batch tidak ditemukan tepat satu kali"
    assert "COMPLETED WITH WARNINGS" in row.inner_text()
    assert "64 imported · 3 failed · 5 skipped" in row.inner_text()
    retry_link = row.get_by_role("link", name="Retry 3 Failed", exact=True)
    assert retry_link.count() == 1

    retry_link.click()
    page.wait_for_url(f"**/admin/products/import/history/{BATCH}", timeout=30000)
    page.get_by_role("heading", name="Failed products").wait_for()
    for sku in ("KK-014", "KK-015", "KNR"):
        assert page.locator("tbody tr").filter(has_text=sku).count() >= 1
    page.get_by_role("button", name="Retry 3 failed products").wait_for()

    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="Retry 3 failed products").wait_for()

    assert forbidden_requests == [], forbidden_requests
    assert page_errors == [], page_errors
    assert console_errors == [], console_errors
    print(
        "history_retryable=PASS "
        "batch=6d051669-edb4-4e33-a431-f53d09d78aff "
        "failed_skus=KK-014,KK-015,KNR "
        "execute_requests=0 upload_requests=0 refresh=PASS "
        f"page_errors={len(page_errors)} console_errors={len(console_errors)}"
    )
    browser.close()
