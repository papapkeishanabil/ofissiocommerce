from pathlib import Path
import os
import sys
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.getenv("OFISSIO_TEST_BASE_URL") or (sys.argv[3] if len(sys.argv) > 3 else "http://localhost:8010")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    headers = {"x-ofissio-internal-role": "super_admin"} if os.getenv("OFISSIO_TEST_DEV_HEADERS") == "1" else {}
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, extra_http_headers=headers)
    page = context.new_page()
    errors = []
    zip_size = (ROOT / "test-fixtures/product-import/photo-product.zip").stat().st_size
    chunk_size = max(1, zip_size // 3)
    total_chunks = (zip_size + chunk_size - 1) // chunk_size
    uploaded_chunks = set()
    chunk_attempt = {"value": 0}
    batch_id = "123e4567-e89b-12d3-a456-426614174000"
    def mock_import_flow(route):
        url = route.request.url
        method = route.request.method
        if url.endswith("/api/admin/products/import/prepare-upload"):
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"batchId": batch_id, "uploadId": "123e4567-e89b-12d3-a456-426614174001", "chunkSize": chunk_size, "totalChunks": total_chunks, "uploadedChunks": [], "maxZipBytes": 750 * 1024 * 1024, "provider": "local"}}))
        elif "/api/admin/products/import/upload/status" in url and method == "GET":
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"uploadedChunks": sorted(uploaded_chunks)}}))
        elif "/api/admin/products/import/upload/chunk" in url and method == "PUT":
            chunk_attempt["value"] += 1
            if chunk_attempt["value"] == 1:
                route.abort("connectionfailed")
                return
            index = int(url.split("chunkIndex=")[1].split("&")[0])
            uploaded_chunks.add(index)
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"state": "UPLOADED"}}))
        elif url.endswith("/api/admin/products/import/upload-complete"):
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"batchId": batch_id, "state": "UPLOADED"}}))
        elif url.endswith("/api/admin/products/import/cancel"):
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True}))
        elif url.endswith("/api/admin/products/import/verify-zip"):
            summary = {"manifestImages": 6, "zipImages": 6, "matched": 6, "missing": 0, "unexpected": 0, "sizeMismatch": 0, "glbIgnored": 1, "videosIgnored": 1}
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"items": [], "summary": summary}}))
        elif url.endswith("/api/admin/products/import/dry-run"):
            plan_summary = {"productsAnalyzed": 4, "createDraft": 2, "skipExisting": 0, "skipNeedsProductData": 1, "skipUnsupported": 1, "blocked": 0, "variationsReady": 2, "localImages": 4, "legacyImages": 0, "unassignedSkipped": 2, "warnings": 1, "errors": 0}
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"batchId": batch_id, "status": "DRY_RUN_PASSED", "zip": {"items": [], "summary": {"manifestImages": 6, "zipImages": 6, "matched": 6, "missing": 0, "unexpected": 0, "sizeMismatch": 0, "glbIgnored": 1, "videosIgnored": 1}}, "plan": {"batchId": batch_id, "products": [], "summary": plan_summary}}}))
        elif url.endswith("/api/admin/notifications/summary"):
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "result": {"unread": 0, "items": []}}))
        else:
            route.continue_()
    page.route("**/*", mock_import_flow)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: print(f"failed_response={response.status} {response.url}") if response.status >= 400 else None)
    response = page.goto(f"{BASE}/admin/products/import", wait_until="domcontentloaded", timeout=60_000)
    print(f"import_route={response.status if response else 'none'} url={page.url}")
    email = os.getenv("OFISSIO_TEST_ADMIN_EMAIL") or (sys.argv[1] if len(sys.argv) > 2 else None)
    password = os.getenv("OFISSIO_TEST_ADMIN_PASSWORD") or (sys.argv[2] if len(sys.argv) > 2 else None)
    if "/login" in page.url and email and password:
        page.get_by_label("Email").fill(email)
        page.locator("#login-password").fill(password)
        page.get_by_role("button", name="Masuk", exact=True).click()
        page.wait_for_url("**/admin/products/import", timeout=20_000)
        page.wait_for_load_state("networkidle")
        print(f"authenticated_url={page.url}")
    if "/login" not in page.url:
        page.get_by_role("heading", name="Import produk WooCommerce").wait_for(timeout=20_000)
        page.locator('input[type="file"]').nth(0).set_input_files(str(ROOT / "test-fixtures/product-import/woocommerce-products.csv"))
        page.locator('input[type="file"]').nth(1).set_input_files(str(ROOT / "test-fixtures/product-import/photo-product-manifest.csv"))
        page.get_by_role("button", name="Analisis Import").click()
        page.get_by_text("Woo rows", exact=True).wait_for(timeout=10_000)
        page.get_by_role("button", name="Continue to Photo ZIP").wait_for(timeout=10_000)
        page.get_by_role("button", name="Continue to Photo ZIP").click()
        page.locator('input[type="file"]').nth(2).set_input_files(str(ROOT / "test-fixtures/product-import/photo-product.zip"))
        page.get_by_text("Ready to upload", exact=True).wait_for(timeout=10_000)
        page.get_by_role("button", name="Upload ZIP").click()
        page.get_by_text("Uploading ZIP", exact=True).wait_for(timeout=10_000)
        assert page.get_by_role("progressbar", name="Progress upload ZIP").is_visible()
        page.get_by_role("button", name="Pause").click()
        page.get_by_text("Upload paused", exact=True).wait_for(timeout=10_000)
        page.get_by_role("button", name="Resume upload").click()
        page.get_by_text("Upload complete", exact=True).wait_for(timeout=15_000)
        page.get_by_role("button", name="Verify ZIP").click()
        page.get_by_text("ZIP verification passed", exact=True).wait_for(timeout=15_000)
        checkboxes = page.locator('input[type="checkbox"]')
        for index in range(checkboxes.count()):
            checkboxes.nth(index).check()
        assert page.get_by_role("button", name="Run Dry Run").is_enabled()
        page.get_by_role("button", name="Run Dry Run").click()
        page.get_by_text("DRY RUN PASSED", exact=True).wait_for(timeout=30_000)
        assert page.get_by_role("button", name="IMPORT AS DRAFT").is_disabled()
        print(f"preview_rows={page.locator('tbody tr').count()} errors={len(errors)}")
        page.screenshot(path=str(ROOT / ".artifacts/product-import-preview.png"), full_page=True)
    print(f"page_errors={errors}")
    browser.close()
