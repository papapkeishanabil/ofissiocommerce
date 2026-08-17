from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    errors: list[str] = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(
        "http://localhost:8000/login?next=%2Fadmin&mode=admin",
        wait_until="networkidle",
        timeout=60_000,
    )
    body = page.locator("body").inner_text().strip()
    print(f"status={response.status if response else 'none'}")
    print(f"content={'yes' if body else 'no'}")
    print(f"login_form={'yes' if page.locator('form').count() else 'no'}")
    print(f"browser_errors={len(errors)}")
    for error in errors:
        print(f"error={error}")
    browser.close()

if not body or errors:
    raise SystemExit(1)
