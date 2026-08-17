import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
OUT = Path(".webtest-results")
OUT.mkdir(exist_ok=True)

def login(page, email, password, admin=False):
    url = "/login?next=%2Fadmin%2Frequests&mode=admin" if admin else "/login"
    page.goto(BASE + url, wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        page.wait_for_timeout(2500)
    form = page.locator('input[name="email"]').locator("xpath=ancestor::form")
    form.locator('input[name="email"]').fill(email)
    form.locator('input[name="password"]').fill(password)
    form.locator('button[type="submit"]').click()
    page.wait_for_timeout(2500)
    return page.url

def inspect(page, name, path):
    page.goto(BASE + path, wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        page.wait_for_timeout(2000)
    page.screenshot(path=str(OUT / f"auth-{name}.png"), full_page=True, timeout=30000)
    print(name, {
        "url": page.url,
        "headings": page.locator("h1,h2").all_inner_texts()[:16],
        "buttons": page.get_by_role("button").all_inner_texts()[:30],
        "links": page.get_by_role("link").all_inner_texts()[:30],
        "body": page.locator("body").inner_text()[:7000],
    })

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    customer = browser.new_context(viewport={"width": 1440, "height": 1000})
    customer_page = customer.new_page()
    print("customer_login", login(customer_page, os.environ["OFISSIO_CUSTOMER_EMAIL"], os.environ["OFISSIO_CUSTOMER_PASSWORD"]))
    inspect(customer_page, "customer-dashboard", "/dashboard")
    inspect(customer_page, "customer-catalog", "/catalog")
    inspect(customer_page, "customer-production", "/custom-request")

    admin = browser.new_context(viewport={"width": 1600, "height": 1000})
    admin_page = admin.new_page()
    print("admin_login", login(admin_page, os.environ["OFISSIO_ADMIN_EMAIL"], os.environ["OFISSIO_ADMIN_PASSWORD"], True))
    inspect(admin_page, "admin-requests", "/admin/requests")

    customer.close()
    admin.close()
    browser.close()
