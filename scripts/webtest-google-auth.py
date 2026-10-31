"""Check Google registration/login UI without creating customer accounts."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:8000"
OUTPUT = Path(".tmp-google-auth-qa")
OUTPUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    results = []
    for width, height in [(1440, 1000), (390, 844)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(BASE + "/login?next=%2Fcheckout", wait_until="networkidle")
        google = page.get_by_role("button", name="Lanjutkan dengan Google")
        expect(google).to_have_count(1)
        expect(google).to_be_visible()
        page.get_by_role("button", name="Daftar", exact=True).click()
        expect(google).to_have_count(1)
        expect(page.get_by_label("Nama Lengkap")).to_be_visible()
        requests = []

        def unavailable(route):
            requests.append(route.request.url)
            route.fulfill(status=503, content_type="application/json", body=json.dumps({
                "message": "Daftar dengan Google belum diaktifkan. Silakan gunakan email untuk sementara."
            }))

        page.route("**/api/auth/google?*", unavailable)
        google.click()
        expect(page.get_by_role("alert").filter(has_text="belum diaktifkan")).to_be_visible()
        expect(google).to_be_enabled()
        assert "next=%2Fcheckout" in requests[-1], requests[-1]
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        submit = page.locator('button[type="submit"]')
        submit.scroll_into_view_if_needed()
        expect(submit).to_be_in_viewport()
        google.scroll_into_view_if_needed()
        page.screenshot(path=str(OUTPUT / f"register-{width}.png"), full_page=True)
        page.goto(BASE + "/login?error=google-failed", wait_until="networkidle")
        expect(page.get_by_role("alert").filter(has_text="dibatalkan atau belum berhasil")).to_be_visible()
        page.goto(BASE + "/login?mode=admin", wait_until="networkidle")
        expect(page.get_by_role("button", name="Lanjutkan dengan Google")).to_have_count(0)
        results.append({"width": width, "registration": "passed", "fallback": "passed", "checkout_return": "passed", "callback_error": "passed", "admin": "passed", "horizontal_overflow": False})
        page.close()
    browser.close()
    print(json.dumps(results, indent=2))
