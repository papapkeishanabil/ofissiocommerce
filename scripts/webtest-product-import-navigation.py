import os
from playwright.sync_api import sync_playwright

BASE=os.getenv("OFISSIO_TEST_BASE_URL","http://localhost:8000")
BATCH="6d051669-edb4-4e33-a431-f53d09d78aff"
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={"width":1440,"height":1000});errors=[];uploads=[]
  page.on("pageerror",lambda error:errors.append(str(error)))
  page.on("request",lambda request:uploads.append(request.url) if "/api/admin/products/import/upload" in request.url or request.url.endswith("/prepare-upload") else None)
  page.goto(f"{BASE}/admin/products/import",wait_until="networkidle",timeout=60000)
  if "/login" in page.url:
    page.get_by_label("Email").fill(os.environ["OFISSIO_TEST_ADMIN_EMAIL"]);page.locator("#login-password").fill(os.environ["OFISSIO_TEST_ADMIN_PASSWORD"]);page.get_by_role("button",name="Masuk",exact=True).click();page.wait_for_url("**/admin/products/import",timeout=30000);page.wait_for_load_state("networkidle")
  session_response=page.request.get(f"{BASE}/api/auth/session")
  session_payload=session_response.json() if session_response.ok else {}
  session=session_payload.get("session") or session_payload.get("user") or session_payload
  if isinstance(session,dict) and isinstance(session.get("session"),dict): session=session["session"]
  print(f"authenticated_user_id={session.get('userId') or session.get('id')} role={session.get('role')}")
  recovery_response=page.request.get(f"{BASE}/api/admin/products/import/recovery?batchId={BATCH}")
  recovery_payload=recovery_response.json() if recovery_response.ok else {"httpStatus":recovery_response.status}
  print(f"recovery_api={recovery_payload.get('recoveryState') or recovery_payload.get('recovery',{}).get('recoveryState') or recovery_payload}")
  page.get_by_role("link",name="Riwayat Import").first.wait_for();page.get_by_text("Import belum selesai",exact=True).wait_for();page.get_by_text("PHOTO PRODUCT AI.zip",exact=True).wait_for();page.get_by_text("ZIP VERIFIED",exact=False).first.wait_for()
  page.get_by_role("link",name="Riwayat Import").first.click();page.wait_for_url("**/admin/products/import/history");row=page.locator("tr",has_text=BATCH);row.get_by_role("link",name="Continue Import").click();page.wait_for_url(f"**/admin/products/import?batchId={BATCH}");page.get_by_text("ZIP VERIFIED — file staging valid dan tidak perlu diunggah ulang.").wait_for(timeout=30000);assert not uploads
  page.reload(wait_until="networkidle");page.get_by_text("ZIP VERIFIED — file staging valid dan tidak perlu diunggah ulang.").wait_for(timeout=30000);assert not uploads
  print(f"history_navigation=PASS batch={BATCH} upload_requests={len(uploads)} page_errors={errors}");browser.close()
