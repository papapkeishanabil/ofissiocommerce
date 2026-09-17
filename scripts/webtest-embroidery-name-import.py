import os
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get(
    "OFISSIO_TEST_BASE_URL",
    "http://localhost:8000/product/jaket-kantor-tg-055",
)
CSV_PATH = Path(__file__).resolve().parent / "fixtures" / "embroidery-names.csv"
ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "embroidery-name-import"


def exercise(page, viewport_name: str) -> None:
    browser_errors: list[str] = []
    page_errors: list[str] = []
    page.set_default_timeout(60_000)
    page.on(
        "console",
        lambda message: browser_errors.append(message.text)
        if message.type == "error" and "status of 404" not in message.text
        else None,
    )
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=120_000)
    try:
        page.wait_for_load_state("networkidle", timeout=5_000)
    except PlaywrightTimeoutError:
        # Ofissio keeps background requests open; the visible product control is
        # the stable readiness signal for this interaction test.
        pass

    studio_trigger = page.get_by_role("button", name="Tambah Bordir", exact=False)
    studio_trigger.wait_for(state="visible")
    studio_trigger.click()
    page.get_by_text("Studio Bordir", exact=True).first.wait_for(state="visible")

    zone = page.get_by_role("button", name="Dada Kiri", exact=False).last
    zone.click()
    text_mode = page.get_by_role("button", name="Nama / teks")
    text_mode.click()
    page.get_by_label("Jenis pembagian").select_option("individual")
    if page.get_by_role("button", name="Unggah CSV").count() == 0:
        print("STUDIO BUTTONS:", page.locator("button").all_inner_texts())
        print("SELECTS:", page.locator("select").all_inner_texts())
    page.get_by_role("button", name="Unggah CSV").click()
    with page.expect_download() as download_info:
        page.get_by_role("button", name="Unduh template").click()
    assert download_info.value.suggested_filename == "template-daftar-nama-bordir.csv"
    page.locator('input[type="file"][accept*=".csv"]').set_input_files(str(CSV_PATH))

    page.get_by_text("3 nama · 4 pcs", exact=True).wait_for(state="visible")
    page.get_by_text("Siap untuk preview", exact=False).wait_for(state="visible")
    assert page.get_by_text("Periksa dan koreksi daftar (3)", exact=True).is_visible()
    assert page.get_by_label("Nama yang ditampilkan pada preview").count() == 1

    page.get_by_role("button", name="Tempel dari Excel").click()
    page.get_by_label("Salin kolom Nama, Ukuran, dan Jumlah dari Excel").fill(
        "Nama Bordir\tUkuran\tJumlah\nDewi\tM\t1\nRina\tL\t1"
    )
    page.get_by_role("button", name="Gunakan daftar ini").click()
    page.get_by_text("2 nama · 2 pcs", exact=True).wait_for(state="visible")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(ARTIFACT_DIR / f"{viewport_name}.png"), full_page=True)
    assert not browser_errors, f"Console errors on {viewport_name}: {browser_errors}"
    assert not page_errors, f"Page errors on {viewport_name}: {page_errors}"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
    exercise(desktop, "desktop")
    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    exercise(mobile, "mobile")
    browser.close()

print("PASS: CSV upload, pasted Excel rows, allocation summary, desktop and mobile rendering.")
