import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
sys.stdout.reconfigure(encoding="utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    page.goto(BASE + "/login?next=%2Fadmin%2Frequests&mode=admin", wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        page.wait_for_timeout(2000)
    form = page.locator('input[name="email"]').locator("xpath=ancestor::form")
    form.locator('input[name="email"]').fill(os.environ["OFISSIO_ADMIN_EMAIL"])
    form.locator('input[name="password"]').fill(os.environ["OFISSIO_ADMIN_PASSWORD"])
    form.locator('button[type="submit"]').click()
    page.wait_for_timeout(2500)
    page.goto(BASE + "/admin/requests", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    rows = page.locator("tbody tr")
    for index in range(min(4, rows.count())):
        row = rows.nth(index)
        print("ROW", index, row.inner_text().replace("\n", " | "), row.get_by_role("link", name="Lihat detail").get_attribute("href"))
    for index in range(min(2, rows.count())):
        href = rows.nth(index).get_by_role("link", name="Lihat detail").get_attribute("href")
        detail = context.new_page()
        detail.goto(BASE + href, wait_until="domcontentloaded")
        detail.wait_for_timeout(2500)
        print("DETAIL", index, detail.url)
        print("HEADINGS", detail.locator("h1,h2,h3").all_inner_texts()[:25])
        print("SELECTS", [detail.locator("select").nth(i).locator("option").all_inner_texts() for i in range(detail.locator("select").count())])
        print("BUTTONS", detail.get_by_role("button").all_inner_texts()[:35])
        print("TEXT", detail.locator("body").inner_text()[:6000])
        detail.close()
    context.close()
    browser.close()
