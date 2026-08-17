import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("OFISSIO_TEST_BASE", "http://localhost:8000")
OUT = Path("artifacts/admin-commercial-audit-20260815")
OUT.mkdir(parents=True, exist_ok=True)


def stable(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1800)


def capture(page, number, name, url):
    page.goto(f"{BASE}{url}", wait_until="domcontentloaded", timeout=60_000)
    stable(page)
    path = OUT / f"{number:02d}-{name}.png"
    page.screenshot(path=str(path), full_page=True, timeout=60_000)
    body = page.locator("body").inner_text()
    return {
        "step": number,
        "name": name,
        "url": page.url,
        "title": page.title(),
        "screenshot": str(path),
        "headings": page.locator("h1,h2,h3").all_inner_texts()[:20],
        "table_headers": page.locator("th").all_inner_texts(),
        "buttons": page.locator("button,a").all_inner_texts()[:80],
        "body_excerpt": body[:6000],
        "page_errors": [],
    }


def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1600, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"{BASE}/login?next=/admin", wait_until="domcontentloaded", timeout=60_000)
        form = page.locator("form").filter(has=page.locator('input[name="email"]')).first
        form.locator('input[name="email"]').fill(os.environ["OFISSIO_ADMIN_EMAIL"])
        form.locator('input[name="password"]').fill(os.environ["OFISSIO_ADMIN_PASSWORD"])
        form.get_by_role("button", name="Masuk").click()
        page.wait_for_url("**/admin**", timeout=60_000)
        stable(page)

        results.append(capture(page, 1, "requests", "/admin/requests"))
        results.append(capture(page, 2, "quotations", "/admin/quotations"))
        results.append(capture(page, 3, "orders", "/admin/orders"))
        detail_links = page.locator('a[href^="/admin/orders/"]')
        order_detail_href = detail_links.first.get_attribute("href") if detail_links.count() else None
        results.append(capture(page, 4, "invoices", "/admin/invoices"))
        results.append(capture(page, 5, "work-orders", "/admin/process-orders"))

        if order_detail_href:
            results.append(capture(page, 6, "order-detail-invoice", order_detail_href))
        else:
            results.append({"step": 6, "name": "order-detail-invoice", "blocker": "No order detail link"})

        for result in results:
            if "page_errors" in result:
                result["page_errors"] = list(errors)
        browser.close()

    (OUT / "audit-data.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    for result in results:
        print(json.dumps({key: result.get(key) for key in ("step", "name", "url", "title", "screenshot", "table_headers", "blocker")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
