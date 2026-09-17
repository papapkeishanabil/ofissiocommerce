from pathlib import Path
import re
import sys

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


BASE_URL = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "http://localhost:8000/product/jaket-kantor-tg-055"
)
ARTIFACT_DIR = Path("artifacts/model-3d-refresh")


def settle(page) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=12_000)
    except PlaywrightTimeoutError:
        # The storefront has background requests; DOM readiness is sufficient.
        pass


def open_studio(page, label: str) -> dict[str, object]:
    page.get_by_role("button", name=re.compile("Tambah Bordir", re.I)).click()
    page.get_by_role("heading", name="Studio Bordir").wait_for(timeout=15_000)
    page.locator("canvas").wait_for(state="visible", timeout=30_000)
    loading = page.get_by_text("Memuat preview 3D", exact=False)
    try:
        loading.wait_for(state="hidden", timeout=60_000)
    except PlaywrightTimeoutError:
        pass
    page.wait_for_timeout(1_000)

    canvas = page.locator("canvas").first
    box = canvas.bounding_box()
    screenshot = ARTIFACT_DIR / f"{label}.png"
    page.screenshot(path=str(screenshot), full_page=False)
    return {
        "canvas_visible": canvas.is_visible(),
        "canvas_size": None if box is None else [round(box["width"]), round(box["height"])],
        "load_error_visible": page.get_by_text("Model 3D belum dapat dimuat", exact=False).is_visible()
        if page.get_by_text("Model 3D belum dapat dimuat", exact=False).count()
        else False,
        "screenshot": str(screenshot),
    }


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        model_responses: list[dict[str, object]] = []
        page.on(
            "response",
            lambda response: model_responses.append(
                {"status": response.status, "url": response.url}
            )
            if "/3d-model/signed-url" in response.url
            else None,
        )

        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60_000)
        settle(page)
        first = open_studio(page, "before-refresh")

        page.reload(wait_until="domcontentloaded", timeout=60_000)
        settle(page)
        second = open_studio(page, "after-refresh")

        print(
            {"first_open": first, "after_refresh": second, "model_responses": model_responses},
            flush=True,
        )
        browser.close()


if __name__ == "__main__":
    main()
