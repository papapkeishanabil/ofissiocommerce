from pathlib import Path
import re
import time

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


URL = "http://localhost:8000/product/kemeja-kerja-kk-006"
ARTIFACT_DIR = Path("artifacts/kk006-model")


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    events: list[dict[str, object]] = []
    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on(
            "response",
            lambda response: events.append(
                {
                    "seconds": round(time.monotonic() - started, 1),
                    "status": response.status,
                    "url": response.url,
                }
            )
            if "/3d-model/signed-url" in response.url
            else None,
        )
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        page.goto(URL, wait_until="domcontentloaded", timeout=60_000)
        try:
            page.wait_for_load_state("networkidle", timeout=12_000)
        except PlaywrightTimeoutError:
            pass
        open_button = page.get_by_role("button", name=re.compile("Tambah Bordir", re.I))
        open_button.wait_for(state="visible", timeout=30_000)
        page.wait_for_timeout(1_000)
        open_button.click()
        page.get_by_role("heading", name="Studio Bordir").wait_for(timeout=30_000)

        loading = page.get_by_text("Memuat preview 3D", exact=False)
        rendered = True
        try:
            loading.wait_for(state="hidden", timeout=120_000)
        except PlaywrightTimeoutError:
            rendered = False

        page.screenshot(path=str(ARTIFACT_DIR / "final.png"), full_page=False)
        print(
            {
                "rendered": rendered,
                "seconds": round(time.monotonic() - started, 1),
                "canvas": page.locator("canvas").count(),
                "loading_visible": loading.is_visible() if loading.count() else False,
                "load_error": page.get_by_text("Model 3D belum dapat dimuat", exact=False).count(),
                "responses": events,
                "console_errors": console_errors,
                "page_errors": page_errors,
            },
            flush=True,
        )
        browser.close()


if __name__ == "__main__":
    main()
