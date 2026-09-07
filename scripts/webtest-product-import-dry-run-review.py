import os
from playwright.sync_api import sync_playwright

BASE=os.getenv("OFISSIO_TEST_BASE_URL","http://localhost:8000")
BATCH="6d051669-edb4-4e33-a431-f53d09d78aff"
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={"width":1440,"height":1000});errors=[];console_errors=[];writes=[]
  page.on("pageerror",lambda error:errors.append(str(error)))
  page.on("console",lambda message:console_errors.append(message.text) if message.type=="error" else None)
  page.on("request",lambda request:writes.append((request.method,request.url)) if request.method!="GET" and ("/products/import/execute" in request.url or "/products/import/upload" in request.url or "wp-json/wp/v2/media" in request.url) else None)
  page.goto(f"{BASE}/admin/products/import/history/{BATCH}",wait_until="networkidle",timeout=60000)
  if "/login" in page.url:
    page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"]);page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"]);page.get_by_role("button",name="Masuk",exact=True).click();page.wait_for_url(f"**/admin/products/import/history/{BATCH}",timeout=30000);page.wait_for_load_state("networkidle")
  page.get_by_role("heading",name="Dry Run Review Detail").wait_for()
  page.get_by_text("Source variations").wait_for();page.get_by_text("604",exact=True).first.wait_for()
  page.get_by_role("button",name="Skip existing").click();page.get_by_text("KL-007",exact=True).first.wait_for();assert page.get_by_text("SKIP_EXISTING_PRODUCT",exact=True).is_visible()
  page.get_by_role("button",name="Unsupported").click();page.get_by_text("ARM",exact=True).first.wait_for();page.get_by_text("external",exact=True).first.wait_for()
  page.get_by_role("button",name="Needs product data").click();assert page.locator("tbody tr").count()==3
  assert not writes
  assert not errors
  assert not console_errors
  print(f"dry_run_review=PASS batch={BATCH} write_requests={len(writes)} page_errors={len(errors)} console_errors={len(console_errors)}")
  browser.close()
