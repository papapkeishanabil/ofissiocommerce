from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.getenv("OFISSIO_TEST_BASE_URL","http://localhost:8015")
BATCH="6d051669-edb4-4e33-a431-f53d09d78aff"
preview={"products":[],"unassignedAssets":[],"warningBreakdown":[],"summary":{"wooRows":673,"parentProducts":69,"simpleProducts":1,"variableProducts":68,"variations":604,"externalProducts":0,"photoFolders":22,"basePhotoSkus":21,"totalImageFiles":152,"assignedImages":150,"unassignedImages":2,"localPhotoMatchedProducts":18,"photoOnlyProducts":3,"legacyPhotoOnlyProducts":51,"noPhotoProducts":0,"productsWithWarnings":17,"warningEvents":106,"productsWithErrors":0,"errorEvents":0,"matched":18,"matchedWithWarnings":0,"photoMissing":0,"productMissing":3,"duplicateFolders":0,"errors":0,"warnings":106}}
verification={"items":[],"summary":{"manifestImages":150,"zipImages":150,"matched":150,"missing":0,"unexpected":0,"sizeMismatch":0,"glbIgnored":0,"videosIgnored":0}}
base={"batchId":BATCH,"recoveryState":"RECOVERABLE","status":"PREVIEWED","csvFilename":"woocommerce-products.csv","manifestFilename":"photo-product-manifest.csv","zipFilename":"PHOTO PRODUCT AI.zip","zipSizeBytes":556426487,"requiresSourceFiles":True,"file":{"sizeBytes":556426487,"sha256":"089ddb5e"},"dryRunError":{"code":"PROVIDER_UNAVAILABLE","message":"WooCommerce sedang tidak tersedia."}}

with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={"width":1440,"height":1000},extra_http_headers={"x-ofissio-internal-role":"super_admin"});page=context.new_page();errors=[];uploads=[];dry_attempt={"count":0}
  page.on("pageerror",lambda error:errors.append(str(error)))
  def route_handler(route):
    url=route.request.url
    if "/api/admin/products/import/recovery" in url and route.request.method=="GET":route.fulfill(status=200,content_type="application/json",body=json.dumps({"ok":True,"result":base}))
    elif url.endswith("/api/admin/products/import/recovery") and route.request.method=="POST":route.fulfill(status=200,content_type="application/json",body=json.dumps({"ok":True,"result":{**base,"requiresSourceFiles":False,"preview":preview,"verification":verification,"decisions":{"skuNormalizations":{},"variantMappings":{}}}}))
    elif "/api/admin/products/import/upload" in url or url.endswith("/prepare-upload"):uploads.append(url);route.fulfill(status=500,content_type="application/json",body='{"ok":false}')
    elif url.endswith("/api/admin/products/import/dry-run"):
      dry_attempt["count"]+=1
      if dry_attempt["count"]==1:route.fulfill(status=503,content_type="application/json",body='{"ok":false,"code":"PROVIDER_UNAVAILABLE","message":"WooCommerce sedang tidak tersedia."}')
      else:
        summary={"productsAnalyzed":69,"createDraft":69,"skipExisting":0,"skipNeedsProductData":0,"skipUnsupported":0,"blocked":0,"variationsReady":604,"localImages":150,"legacyImages":0,"unassignedSkipped":2,"warnings":106,"errors":0}
        route.fulfill(status=200,content_type="application/json",body=json.dumps({"ok":True,"result":{"batchId":BATCH,"status":"DRY_RUN_PASSED","zip":verification,"plan":{"batchId":BATCH,"products":[],"summary":summary}}}))
    elif url.endswith("/api/admin/notifications/summary"):route.fulfill(status=200,content_type="application/json",body='{"ok":true,"result":{"unread":0,"items":[]}}')
    else:route.continue_()
  page.route("**/*",route_handler)
  page.goto(f"{BASE}/admin/products/import?batchId={BATCH}",wait_until="networkidle",timeout=60000)
  if "/login" in page.url:
    page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"]);page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"]);page.get_by_role("button",name="Masuk",exact=True).click();page.wait_for_url(f"**/admin/products/import?batchId={BATCH}",timeout=30000);page.wait_for_load_state("networkidle")
  page.get_by_text("ZIP VERIFIED — file staging valid dan tidak perlu diunggah ulang.").wait_for()
  files=page.locator('input[type="file"]');assert files.count()==2,"verified recovery must not ask for ZIP"
  files.nth(0).set_input_files(str(ROOT/"test-fixtures/product-import/woocommerce-products.csv"));files.nth(1).set_input_files(str(ROOT/"test-fixtures/product-import/photo-product-manifest.csv"));page.get_by_role("button",name="Continue verified ZIP").click();page.get_by_text("staging lokal tervalidasi. Upload ZIP dilewati.").wait_for();assert not uploads
  retry=page.get_by_role("button",name="Retry Dry Run");retry.click();page.get_by_text("WooCommerce sedang tidak tersedia.").wait_for();retry.click();page.get_by_text("DRY RUN PASSED",exact=True).wait_for(timeout=30000);assert page.get_by_role("button",name="IMPORT AS DRAFT").is_disabled()
  page.reload(wait_until="networkidle");page.get_by_text("ZIP VERIFIED — file staging valid dan tidak perlu diunggah ulang.").wait_for();assert page.locator('input[type="file"]').count()==2;assert not uploads
  print(f"recovery_batch={BATCH} dry_run_attempts={dry_attempt['count']} upload_requests={len(uploads)} page_errors={errors}");browser.close()
