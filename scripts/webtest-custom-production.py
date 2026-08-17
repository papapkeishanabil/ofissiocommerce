from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
OUT = Path(".webtest-results")
OUT.mkdir(exist_ok=True)

def summarize(page, name):
    try:
        page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        page.wait_for_timeout(1500)
    if name == "quote_request" and page.locator("h1").count() == 0:
        try:
            page.locator("h1").first.wait_for(timeout=30000)
        except Exception:
            pass
    try:
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=True, timeout=30000)
    except Exception as error:
        print(f"SCREENSHOT_WARNING {name}: {error}")
    return {
        "name": name,
        "url": page.url,
        "title": page.title(),
        "headings": page.locator("h1, h2").all_inner_texts()[:12],
        "buttons": page.get_by_role("button").all_inner_texts()[:24],
        "links": page.get_by_role("link").all_inner_texts()[:24],
        "body": page.locator("body").inner_text()[:5000],
    }

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    errors = []
    failures = []

    results = []
    for name, path in [
        ("home", "/"),
        ("catalog", "/catalog"),
        ("production_request", "/custom-request"),
        ("quote_request", "/quote"),
        ("login", "/login"),
        ("admin_requests", "/admin/requests"),
    ]:
        page = context.new_page()
        page.set_default_timeout(15000)
        page.set_default_navigation_timeout(60000)
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))
        page.on("response", lambda res: failures.append(f"{res.status} {res.url}") if res.status >= 400 else None)
        page.goto(BASE + path, wait_until="commit")
        page.wait_for_load_state("domcontentloaded", timeout=30000)
        results.append(summarize(page, name))
        page.close()

    page = context.new_page()
    page.goto(BASE + "/custom-request", wait_until="commit")
    page.wait_for_load_state("domcontentloaded", timeout=30000)
    page.wait_for_timeout(1200)
    submit = page.get_by_role("button", name="Masuk untuk kirim brief")
    if submit.count():
        submit.click()
        page.wait_for_timeout(500)
        results.append(summarize(page, "production_submit_guest"))

    print("RESULTS")
    for result in results:
        print(result)
    print("CONSOLE_ERRORS", errors)
    print("FAILED_RESPONSES", failures)
    context.close()
    browser.close()
