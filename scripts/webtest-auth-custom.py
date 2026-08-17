import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
sys.stdout.reconfigure(encoding="utf-8")

def login(page):
    page.goto(BASE + "/login", wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        page.wait_for_timeout(2000)
    form = page.locator('input[name="email"]').locator("xpath=ancestor::form")
    form.locator('input[name="email"]').fill(os.environ["OFISSIO_CUSTOMER_EMAIL"])
    form.locator('input[name="password"]').fill(os.environ["OFISSIO_CUSTOMER_PASSWORD"])
    form.locator('button[type="submit"]').click()
    page.wait_for_url("**/dashboard", timeout=30000)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    errors, failed = [], []
    page.on("console", lambda msg: errors.append(f"{msg.type}:{msg.text}") if msg.type == "error" else None)
    page.on("response", lambda res: failed.append(f"{res.status} {res.url}") if res.status >= 400 else None)
    login(page)
    page.goto(BASE + "/product/kl-007", wait_until="domcontentloaded")
    page.get_by_label("Quantity ukuran S").fill("20")
    page.wait_for_timeout(1000)
    print("AFTER_QTY", page.get_by_role("button").all_inner_texts()[-12:])
    page.get_by_role("button", name="Preview 3D & Bordir Logo").click()
    page.wait_for_timeout(3500)
    studio_text = page.locator("body").inner_text()
    print("STUDIO_OPEN", "Studio Bordir" in studio_text, studio_text[-4000:])
    file_input = page.locator('input[type="file"]')
    print("FILE_INPUTS", file_input.count())
    if file_input.count():
        file_input.last.set_input_files(str(Path("public/products/kk-006/KK-006-front-mask.png").resolve()))
        page.wait_for_timeout(4000)
    print("AFTER_UPLOAD", page.locator("body").inner_text()[-3500:])
    save = page.get_by_role("button", name="Simpan Konfigurasi")
    print("SAVE_COUNT", save.count(), "SAVE_DISABLED", save.is_disabled() if save.count() else None)
    if save.count() and not save.is_disabled():
        save.click()
        page.wait_for_timeout(3500)
    print("AFTER_SAVE_URL", page.url, page.get_by_role("button").all_inner_texts()[-16:])
    add = page.get_by_role("button", name="Tambahkan ke Keranjang")
    if add.count():
        add.click()
        page.wait_for_timeout(2000)
        page.goto(BASE + "/cart", wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        print("CART", page.get_by_role("button").all_inner_texts()[-20:], page.locator("body").inner_text()[-3200:])
        request = page.get_by_role("button", name="Ajukan Jadwal & Penawaran Bordir")
        if request.count():
            request.click()
            page.wait_for_timeout(2500)
            print("REQUEST_PAGE", page.url, page.get_by_role("button").all_inner_texts()[-20:], page.locator("body").inner_text()[-3500:])
            send = page.get_by_role("button", name="Kirim Permintaan Jadwal & Penawaran")
            if send.count() and not send.is_disabled():
                send.click()
                page.wait_for_timeout(5000)
                print("CUSTOM_RESULT", page.url, page.locator("body").inner_text()[-3200:])
    print("CONSOLE_ERRORS", errors)
    print("FAILED_RESPONSES", failed)
    context.close()
    browser.close()
