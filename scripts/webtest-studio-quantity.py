from pathlib import Path
import re
import sys

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


URL = "http://localhost:8000/product/kemeja-kerja-kk-006"
ARTIFACT_DIR = Path("artifacts/studio-quantity")


def main() -> None:
    width = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
    height = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    viewport_name = sys.argv[3] if len(sys.argv) > 3 else "desktop"
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_default_timeout(60_000)
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error" and "status of 404" not in message.text
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        page.goto(URL, wait_until="domcontentloaded", timeout=120_000)
        try:
            page.wait_for_load_state("networkidle", timeout=8_000)
        except PlaywrightTimeoutError:
            pass

        page.get_by_role("button", name=re.compile("Tambah Bordir", re.I)).click()
        page.get_by_role("heading", name="Studio Bordir").wait_for(state="visible")

        page.get_by_role("button", name=re.compile("Dada Kanan", re.I)).last.click()
        page.get_by_role("button", name="Nama / teks").click()
        page.get_by_label("Nama untuk preview").fill("DENY S.")
        page.get_by_role("button", name="Terapkan ke preview").click()

        quantity_cta = page.get_by_role(
            "button", name=re.compile(r"Atur quantity.*min\. 8 pcs", re.I)
        )
        quantity_cta.wait_for(state="visible")
        assert quantity_cta.is_enabled(), "CTA quantity seharusnya dapat diklik"
        quantity_cta.click()

        quantity_heading = page.get_by_role("heading", name="4. Atur jumlah pesanan")
        quantity_heading.wait_for(state="visible")
        studio = page.get_by_role("dialog", name="Konfigurator 3D bordir")
        studio.get_by_label("Quantity ukuran S").fill("8")

        add_cta = page.get_by_role(
            "button", name=re.compile(r"Tambahkan 8 pcs ke Keranjang", re.I)
        )
        add_cta.wait_for(state="visible")
        assert add_cta.is_enabled(), "CTA keranjang seharusnya aktif setelah 8 pcs"

        page.screenshot(path=str(ARTIFACT_DIR / f"quantity-ready-{viewport_name}.png"), full_page=False)
        add_cta.click()
        page.get_by_role("heading", name="Studio Bordir").wait_for(state="hidden")

        assert not console_errors, f"Console errors: {console_errors}"
        assert not page_errors, f"Page errors: {page_errors}"
        print(
            {
                "quantity_step_opened": True,
                "viewport": viewport_name,
                "quantity": 8,
                "add_to_cart_enabled": True,
                "studio_closed_after_add": True,
                "console_errors": console_errors,
                "page_errors": page_errors,
            }
        )
        browser.close()


if __name__ == "__main__":
    main()
