import os
from datetime import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"

def login(page, email, password, admin=False):
    page.goto(BASE + ("/login?next=%2Fadmin%2Frequests&mode=admin" if admin else "/login"), wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        page.wait_for_timeout(2000)
    form = page.locator('input[name="email"]').locator("xpath=ancestor::form")
    form.locator('input[name="email"]').fill(email)
    form.locator('input[name="password"]').fill(password)
    form.locator('button[type="submit"]').click()
    page.wait_for_timeout(2500)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    customer = browser.new_context(viewport={"width": 1440, "height": 1000})
    cp = customer.new_page()
    errors = []
    failed = []
    cp.on("console", lambda msg: errors.append(f"{msg.type}:{msg.text}") if msg.type == "error" else None)
    cp.on("response", lambda res: failed.append(f"{res.status} {res.url}") if res.status >= 400 else None)
    login(cp, os.environ["OFISSIO_CUSTOMER_EMAIL"], os.environ["OFISSIO_CUSTOMER_PASSWORD"])

    # Production request: complete the four required fields and submit a clearly marked E2E request.
    cp.goto(BASE + "/custom-request", wait_until="domcontentloaded")
    cp.locator("#custom-projectName").fill(f"E2E Production {datetime.now().strftime('%Y%m%d-%H%M')}")
    cp.locator("#custom-garmentType").select_option(label="Kemeja lapangan")
    cp.locator("#custom-designDescription").fill("Pengujian E2E: kemeja lapangan lengan panjang dengan dua saku, ventilasi punggung, dan strip reflektif.")
    cp.locator("#custom-estimatedQuantity").fill("300")
    cp.get_by_role("button", name="Kirim permintaan Full Custom").click()
    cp.wait_for_timeout(5000)
    production_url = cp.url
    production_body = cp.locator("body").inner_text()
    print("PRODUCTION_RESULT", production_url, production_body[:2500])

    # Custom path reconnaissance from the live catalog/product UI.
    cp.goto(BASE + "/catalog", wait_until="domcontentloaded")
    product_href = cp.get_by_role("link", name="Lihat Detail").first.get_attribute("href")
    cp.goto(BASE + product_href, wait_until="domcontentloaded")
    try:
        cp.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        cp.wait_for_timeout(2500)
    print("CUSTOM_PRODUCT", cp.url, cp.get_by_role("button").all_inner_texts()[:40], cp.locator("body").inner_text()[:4500])

    # Verify the new production request reaches the separated admin workspace.
    admin = browser.new_context(viewport={"width": 1600, "height": 1000})
    ap = admin.new_page()
    ap.on("console", lambda msg: errors.append(f"admin:{msg.type}:{msg.text}") if msg.type == "error" else None)
    ap.on("response", lambda res: failed.append(f"admin:{res.status} {res.url}") if res.status >= 400 else None)
    login(ap, os.environ["OFISSIO_ADMIN_EMAIL"], os.environ["OFISSIO_ADMIN_PASSWORD"], True)
    ap.goto(BASE + "/admin/requests", wait_until="domcontentloaded")
    ap.wait_for_timeout(2500)
    admin_body = ap.locator("body").inner_text()
    print("ADMIN_NEW_PRODUCTION_VISIBLE", "E2E Production" in admin_body)
    print("ADMIN_REQUEST_TOP", admin_body[:3500])
    print("CONSOLE_ERRORS", errors)
    print("FAILED_RESPONSES", failed)
    customer.close()
    admin.close()
    browser.close()
