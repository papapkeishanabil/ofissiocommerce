import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];BASE=os.getenv("OFISSIO_TEST_BASE_URL","http://localhost:8000");BATCH="6d051669-edb4-4e33-a431-f53d09d78aff"
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={"width":1440,"height":1000});errors=[];console_errors=[];requests=[]
  page.on("pageerror",lambda error:errors.append(str(error)));page.on("console",lambda message:console_errors.append(message.text) if message.type=="error" else None)
  def route_execute(route):
    requests.append(route.request.url)
    result={"created":67,"failed":0,"skipped":5,"variationsCreated":598,"imagesUploaded":296,"attempt":{"number":2,"created":3,"failed":0,"variationsCreated":14,"imagesUploaded":14}}
    route.fulfill(status=200,content_type="application/json",body=json.dumps({"ok":True,"result":result}))
  page.route("**/api/admin/products/import/execute",route_execute)
  page.goto(f"{BASE}/admin/products/import/history/{BATCH}",wait_until="networkidle",timeout=60000)
  if "/login" in page.url:
    page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"]);page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"]);page.get_by_role("button",name="Masuk",exact=True).click();page.wait_for_url(f"**/admin/products/import/history/{BATCH}",timeout=30000);page.wait_for_load_state("networkidle")
  page.get_by_role("heading",name="Failed products").wait_for();assert page.locator("tbody tr").filter(has_text="KK-014").count()>=1;assert page.locator("tbody tr").filter(has_text="KK-015").count()>=1;assert page.locator("tbody tr").filter(has_text="KNR").count()>=1
  page.get_by_role("button",name="Retry 3 failed products").click();page.get_by_role("heading",name="Konfirmasi Retry Failed").wait_for();page.get_by_text("64 produk berhasil",exact=False).wait_for();page.get_by_text("5 produk skipped",exact=False).wait_for()
  inputs=page.locator('input[type="file"]');inputs.nth(0).set_input_files(str(ROOT/"test-fixtures/product-import/woocommerce-products.csv"));inputs.nth(1).set_input_files(str(ROOT/"test-fixtures/product-import/photo-product-manifest.csv"));page.get_by_role("button",name="Retry failed",exact=True).click();page.get_by_role("heading",name="Retry result").wait_for(timeout=15000);page.get_by_text("Attempt #2",exact=True).wait_for();page.get_by_text("Created: 67",exact=True).wait_for()
  assert len(requests)==1;assert not any("upload" in url for url in requests);assert not errors;assert not console_errors
  print(f"retry_failed_ui=PASS mocked_execute_requests={len(requests)} zip_upload_requests=0 page_errors={len(errors)} console_errors={len(console_errors)}")
  browser.close()
