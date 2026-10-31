"""Local fixture-only ordering UI checks; all API calls are intercepted."""
import atexit,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'artifacts/order-fields-redesign';out.mkdir(exist_ok=True)
route_file=root/'src/app/order-fields-verification/page.tsx'
template=(root/'test-fixtures/product-variants/order-fields-page.tsx').read_text(encoding='utf-8')
assert not route_file.exists();route_file.parent.mkdir(parents=True);route_file.write_text(template,encoding='utf-8')
def cleanup():
 if route_file.exists() and route_file.read_text(encoding='utf-8')==template:
  route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
errors=[];writes=[]
CAPTURE_STYLE='[aria-label="Preview produk ringkas"],[aria-label="Buka Ofistant"],nextjs-portal{visibility:hidden!important}'
def api(route):
 if route.request.method not in ['GET','HEAD']:writes.append(route.request.url);route.fulfill(status=409,json={'ok':False});return
 if '/size-stock' in route.request.url:
  route.fulfill(json={'ok':True,'stock':{'color':'Apricot','source':'ginee','checkedAt':'2026-10-27T00:00:00Z','rows':[{'size':size,'sku':'TEST-'+size,'availableQty':0 if size=='M' else 12} for size in ['XS','S','M','L','XL','2XL','3XL']]}})
 else:route.fulfill(json={'ok':True,'session':None,'notifications':[],'promotions':[],'items':[]})
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for width in [1440,390,320]:
  context=browser.new_context(viewport={'width':width,'height':1150},is_mobile=width<500,has_touch=width<500)
  page=context.new_page();page.route('**/api/**',api);page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto('http://127.0.0.1:8000/order-fields-verification',wait_until='networkidle',timeout=120000)
  panel=page.locator('[data-part="quantity-heading"]').locator('..')
  expect(panel.get_by_role('heading',name='Pilih ukuran & jumlah')).to_be_visible()
  expect(panel.locator('[data-part="total-value"]')).to_have_text('0 pcs')
  expect(panel.get_by_role('button',name='Kurangi S',exact=True)).to_be_disabled()
  panel.get_by_role('button',name='Tambah S',exact=True).click()
  page.get_by_role('spinbutton',name='Quantity ukuran L',exact=True).fill('2')
  expect(panel.locator('[data-part="total-value"]')).to_have_text('3 pcs')
  expect(panel.locator('[data-part="size-card"][data-selected=true]')).to_have_count(2)
  expect(panel.get_by_text('MOQ terpenuhi (3 / 1)',exact=True)).to_be_visible()
  expect(panel.get_by_text('Stok habis',exact=True)).to_be_visible()
  size_s=page.get_by_role('spinbutton',name='Quantity ukuran S',exact=True)
  for number in ['120','999']:
   size_s.fill(number)
   assert size_s.evaluate('''e=>{const s=getComputedStyle(e);const c=document.createElement('canvas').getContext('2d');c.font=s.font;return c.measureText(e.value).width<=e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)}'''),f'Three-digit input clipped at {width}'
  size_s.locator('..').screenshot(path=str(out/f'three-digit-{width}.png'),style=CAPTURE_STYLE)
  size_s.fill('1');panel.get_by_role('heading').click()
  panel.screenshot(path=str(out/f'quantity-{width}.png'),style=CAPTURE_STYLE)
  guide=page.get_by_role('button',name='Lihat size chart lengkap',exact=True)
  guide.scroll_into_view_if_needed();guide.locator('..').screenshot(path=str(out/f'guide-closed-{width}.png'),style=CAPTURE_STYLE)
  guide.click();expect(page.get_by_role('button',name='Sembunyikan size chart',exact=True)).to_have_attribute('aria-expanded','true')
  expect(page.locator('#size-guide-wc-900')).to_be_visible()
  page.get_by_role('button',name='Sembunyikan size chart',exact=True).click()
  note=page.get_by_role('textbox',name='Catatan pesanan',exact=True)
  note.fill('Pisahkan kemasan berdasarkan ukuran.')
  expect(page.get_by_text('36 / 120 karakter',exact=True)).to_be_visible()
  note.locator('..').screenshot(path=str(out/f'notes-{width}.png'),style=CAPTURE_STYLE)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
  if width==1440:
   panel.scroll_into_view_if_needed();page.screenshot(path=str(out/'desktop.png'),style=CAPTURE_STYLE)
  if width==390:
   panel.scroll_into_view_if_needed();page.screenshot(path=str(out/'mobile.png'),style=CAPTURE_STYLE)
  note.fill('bordir logo')
  expect(panel.locator('[data-part="quantity-total"]')).to_have_attribute('data-state','warning')
  expect(panel.get_by_text(re.compile(r'Bordir minimal \d+ pcs\. Tambah \d+ pcs lagi\.'))).to_be_visible()
  context.close()
 assert not errors,errors
 assert not writes,writes
 result={'status':'passed','widths':[1440,390,320],'checks':['quantity controls','live total','selected sizes','empty/ready/embroidery minimum','stock status','size guide toggle','notes label and count','no horizontal overflow'],'browserErrors':errors,'realWrites':0}
 (out/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
 browser.close()
