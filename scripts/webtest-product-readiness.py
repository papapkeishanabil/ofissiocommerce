import os
from urllib.parse import quote
from playwright.sync_api import sync_playwright

BASE = os.getenv("OFISSIO_TEST_BASE_URL", "http://localhost:8000")
BATCH = "6d051669-edb4-4e33-a431-f53d09d78aff"


def login(page):
    target = f"/admin/products/readiness?scope=batch&batchId={BATCH}"
    page.goto(f"{BASE}/login?next={quote(target, safe='')}&mode=admin", wait_until="domcontentloaded")
    page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"])
    page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"])
    page.get_by_role("button", name="Masuk", exact=True).click()
    page.wait_for_function(
        "() => window.location.pathname === '/admin/products/readiness'",
        timeout=120_000,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1000}, accept_downloads=True)
    console_errors = []
    page_errors = []
    write_requests = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    login(page)
    page.on(
        "request",
        lambda request: write_requests.append(f"{request.method} {request.url}")
        if request.method not in {"GET", "HEAD", "OPTIONS"}
        else None,
    )
    try:
        page.get_by_text("67", exact=True).first.wait_for(timeout=180_000)
    except Exception:
        print("READINESS_DEBUG_URL", page.url)
        print("READINESS_DEBUG_BODY", page.locator("body").inner_text()[:5000])
        print("READINESS_DEBUG_CONSOLE", console_errors)
        print("READINESS_DEBUG_PAGE_ERRORS", page_errors)
        raise
    body = page.locator("body").inner_text()
    assert "Bulk Product Readiness" in body
    assert "READ-ONLY PRODUCT QA" in body.upper()
    assert "52" in body and "BLOCKED" in body

    search = page.get_by_placeholder("Search SKU / product name")
    search.fill("KK-014")
    page.get_by_text("KK-014", exact=True).first.wait_for()
    page.locator("details").first.locator("summary").click()
    detail = page.locator("details").first.inner_text()
    assert "828" in detail
    assert "Expected: 6" in detail and "Actual: 6" in detail
    assert "Primary: yes" in detail and "Gallery: 6" in detail

    search.fill("KK-017")
    page.get_by_text("KK-017", exact=True).first.wait_for()
    page.locator("details").first.locator("summary").click()
    detail = page.locator("details").first.inner_text()
    assert "KK-011-1" in detail and "KK-017" in detail

    search.fill("KL-007")
    assert "No products match the filters." in page.locator("body").inner_text()

    search.fill("KK-007")
    page.get_by_text("KK-007", exact=True).first.wait_for()
    page.locator("details").first.locator("summary").click()
    detail = page.locator("details").first.inner_text()
    assert "BIRU NAVY" in detail and "MERAH" in detail

    search.fill("")
    export_href = page.get_by_role("link", name="Export QA CSV").get_attribute("href")
    assert export_href and "/api/admin/products/readiness/export" in export_href
    assert f"batchId={BATCH}" in export_href

    assert not write_requests, write_requests
    assert not page_errors, page_errors
    assert not console_errors, console_errors
    print(
        "READINESS_BROWSER_TEST PASS "
        f"products=67 export_link=PASS write_requests={len(write_requests)} "
        f"console_errors={len(console_errors)} page_errors={len(page_errors)}"
    )
    browser.close()
