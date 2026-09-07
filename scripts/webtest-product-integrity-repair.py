import os
from urllib.parse import quote
from playwright.sync_api import sync_playwright

BASE="http://localhost:8000";BATCH="6d051669-edb4-4e33-a431-f53d09d78aff"
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={"width":1600,"height":1000});console=[];page_errors=[];requests=[]
  page.on("console",lambda msg:console.append(msg.text) if msg.type=="error" else None);page.on("pageerror",lambda error:page_errors.append(str(error)))
  target=f"/admin/products/readiness/repair?batchId={BATCH}";page.goto(f"{BASE}/login?next={quote(target,safe='')}&mode=admin",wait_until="domcontentloaded")
  page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"]);page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"]);page.get_by_role("button",name="Masuk",exact=True).click();page.wait_for_function("() => location.pathname === '/admin/products/readiness/repair'",timeout=30000)
  page.on("request",lambda req:requests.append(f"{req.method} {req.url}") if req.method not in {"GET","HEAD","OPTIONS"} else None)
  page.get_by_text("Product Integrity Repair",exact=True).wait_for();assert page.get_by_text("Dry Run wajib sebelum repair.",exact=False).is_visible();assert page.locator('input[type="file"]').get_attribute("accept")==".csv,text/csv"
  page.get_by_role("button",name="Run Integrity Dry Run").click();page.get_by_text("Review exact changes before any write",exact=True).wait_for(timeout=180000)
  body=page.locator("body").inner_text();print("REPAIR_UI",body[body.find("INTEGRITY REPAIR DRY RUN"):body.find("INTEGRITY REPAIR DRY RUN")+900]);upper=body.upper();assert all(value in upper for value in ["LEGACY MEDIA","VARIATION PARENTS","UNKNOWN SKU","NON-DRAFT","BLOCKED\n\n76"]);assert "Parent-SKU duplicates: 97" in body;assert "WordPress Media writes: 0" in body
  assert not any("/apply" in request for request in requests);assert not page_errors,page_errors;assert not console,console
  print(f"INTEGRITY_REPAIR_BROWSER PASS batch={BATCH} dry_run=PASS apply_requests=0 console_errors=0 page_errors=0")
  browser.close()
