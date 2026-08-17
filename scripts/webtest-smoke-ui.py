from playwright.sync_api import sync_playwright


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        response = page.goto("http://localhost:8000", wait_until="networkidle")
        body = page.locator("body").inner_text().strip()
        overlay = page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count()
        print(f"status={response.status if response else 'none'}")
        print(f"body={'ok' if body else 'blank'}")
        print(f"overlay={overlay}")
        print(f"page_errors={len(errors)}")
        for path in ("/cart", "/quote", "/custom-request", "/login"):
            response = page.goto(
                f"http://localhost:8000{path}",
                wait_until="domcontentloaded",
                timeout=30_000,
            )
            page.wait_for_timeout(1_000)
            route_body = page.locator("body").inner_text().strip()
            print(
                f"route={path} status={response.status if response else 'none'} "
                f"body={'ok' if route_body else 'blank'} title={page.title()}"
            )
        browser.close()


if __name__ == "__main__":
    main()
