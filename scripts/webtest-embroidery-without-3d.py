"""Synthetic customer-to-admin UI. Upload/session APIs mocked; no real customer writes."""
import atexit,base64,json,re
from urllib.parse import urlparse,parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).resolve().parents[1]/'artifacts/embroidery-without-3d';out.mkdir(exist_ok=True)
root=out.parents[1]
route_file=root/'src/app/embroidery-verification/page.tsx'
template=(root/'test-fixtures/product-variants/embroidery-without-3d-page.tsx').read_bytes()
created=not route_file.exists()
if created:
 route_file.parent.mkdir(parents=True);route_file.write_bytes(template)
def cleanup():
 if created and route_file.exists() and route_file.read_bytes()==template:
  route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=')
errors=[];unexpected=[];checks=[]
session={'user':{'id':'fixture-user','role':'customer_admin','email':'fixture@example.test','fullName':'Customer Fixture'},'company':{'id':'fixture-company','companyName':'Fixture Company','addresses':[]}}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for width in [1440,390,320]:
  print('Testing width',width,flush=True)
  context=browser.new_context(viewport={'width':width,'height':1100})
  page=context.new_page();page.set_default_timeout(30000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  uploads=[];held=[];hold={'active':True};fail={'active':False}
  def api(route):
   req=route.request
   if req.url.endswith('/api/auth/session'):
    route.fulfill(json={'ok':True,'provider':'supabase','session':{'kind':'customer','session':session}});return
   if req.url.endswith('/api/files/upload'):
    uploads.append(req.url)
    if fail['active']:route.fulfill(status=503,json={'ok':False,'message':'Fixture upload failed'});return
    if hold['active']:held.append(route);return
    route.fulfill(json={'ok':True,'file':{'id':f'logo-{len(uploads)}','originalFilename':'punggung.png'}});return
   if req.method not in ['GET','HEAD','OPTIONS']:unexpected.append(req.url)
   if '/size-stock' in req.url:route.fulfill(json={'ok':True,'stock':{'rows':[{'size':'S','availableQty':100},{'size':'M','availableQty':100}]}})
   else:route.fulfill(json={'ok':True,'items':[],'files':[],'notifications':[]})
  context.route('**/api/**',api)
  page.goto('http://localhost:8029/embroidery-verification',wait_until='networkidle',timeout=120000)
  page.wait_for_function("Array.from(document.querySelectorAll('input[type=number]')).some(e=>Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onChange==='function'))")
  page.get_by_role('spinbutton',name='Quantity ukuran S',exact=True).fill('4')
  expect(page.locator('[data-part=total-value]')).to_have_text('4 pcs')
  page.get_by_role('spinbutton',name='Quantity ukuran M',exact=True).fill('4')
  expect(page.locator('[data-part=total-value]')).to_have_text('8 pcs')
  panel=page.get_by_role('region',name='Pilihan bordir produk',exact=True)
  panel.get_by_role('button',name=re.compile('^Tambahkan bordir')).click()
  panel.get_by_role('button',name='Dada Kiri',exact=True).click()
  expect(panel.get_by_role('radio',name='Rekomendasikan oleh Ofissio')).to_be_checked()
  panel.locator('input[type=file]').first.set_input_files({'name':'dada.png','mimeType':'image/png','buffer':png})
  expect(panel.get_by_role('button',name='Menyimpan file…')).to_be_disabled()
  expect(page.get_by_role('button',name=re.compile('Tambahkan ke Keranjang'))).to_be_disabled()
  assert held
  held.pop().fulfill(json={'ok':True,'file':{'id':'logo-dada','originalFilename':'dada.png'}});hold['active']=False
  panel.get_by_role('textbox',name='Catatan posisi (opsional)').fill('Jangan melewati saku.')
  panel.get_by_role('button',name='Simpan bordir dada kiri',exact=True).click()
  expect(panel.get_by_label('Ringkasan bordir tersimpan')).to_contain_text('dada.png')
  panel.get_by_role('button',name='Punggung Atas',exact=True).click()
  panel.locator('input[type=file]').first.set_input_files({'name':'punggung.png','mimeType':'image/png','buffer':png})
  panel.get_by_role('radio',name='Atur ukuran sendiri').check()
  panel.get_by_role('spinbutton',name='Lebar (cm)').fill('31')
  panel.get_by_role('spinbutton',name='Tinggi (cm)').fill('6')
  panel.get_by_role('button',name='Simpan bordir punggung atas',exact=True).click()
  expect(panel.get_by_role('alert')).to_be_visible()
  panel.get_by_role('spinbutton',name='Lebar (cm)').fill('25')
  panel.get_by_role('textbox',name='Catatan posisi (opsional)').fill('Posisi tengah punggung.')
  panel.get_by_role('button',name='Simpan bordir punggung atas',exact=True).click()
  panel.get_by_role('button',name='Dada Kanan',exact=True).click()
  panel.get_by_role('radio',name='Tulisan / nama',exact=True).check()
  panel.get_by_role('textbox',name=re.compile('Nama untuk preview')).fill('ANDI')
  panel.get_by_role('button',name='Terapkan ke preview',exact=True).click()
  panel.get_by_role('button',name='Simpan bordir dada kanan',exact=True).click()
  panel.get_by_role('button',name='Lengan Kiri',exact=True).click()
  panel.get_by_role('combobox',name='Gunakan logo yang sudah diunggah').select_option('logo-dada')
  panel.get_by_role('button',name='Simpan bordir lengan kiri',exact=True).click()
  assert len(uploads)==2,'Reusing a logo must not upload it again'
  panel.get_by_role('button',name='Hapus bordir Lengan Kiri',exact=True).click()
  panel.get_by_role('button',name='Dada Kiri',exact=True).click()
  fail['active']=True
  panel.locator('input[type=file]').first.set_input_files({'name':'gagal.png','mimeType':'image/png','buffer':png})
  expect(panel.get_by_role('alert')).to_contain_text('Fixture upload failed')
  expect(panel.get_by_label('Ringkasan bordir tersimpan')).to_contain_text('dada.png')
  panel.get_by_role('button',name='Batal',exact=True).click();fail['active']=False
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
  panel.screenshot(path=str(out/f'customer-{width}.png'))
  page.get_by_role('button',name=re.compile('Tambahkan ke Keranjang')).click()
  state=json.loads(page.get_by_test_id('saved-placements').text_content());assert len(state)==3,state
  by_zone={row['zone']:row for row in state}
  assert by_zone['left_chest']['widthCm'] is None and by_zone['left_chest']['sizingMode']=='ofissio'
  assert by_zone['upper_back']['widthCm']==25 and by_zone['upper_back']['logoFileId']!=by_zone['left_chest']['logoFileId']
  assert by_zone['right_chest']['textBordir']['name']=='ANDI'
  expect(page.get_by_role('link',name='Edit Bordir',exact=True)).to_be_visible()
  page.reload(wait_until='networkidle')
  expect(page.get_by_test_id('saved-placements')).to_contain_text('logo-dada')
  assert json.loads(page.get_by_test_id('saved-placements').text_content())==state,'Reload lost embroidery data'
  line_id=parse_qs(urlparse(page.get_by_role('link',name='Edit Bordir',exact=True).get_attribute('href')).query)['line'][0]
  page.goto(f'http://localhost:8029/embroidery-verification?studio=1&line={line_id}',wait_until='networkidle')
  panel=page.get_by_role('region',name='Pilihan bordir produk',exact=True)
  expect(panel.get_by_role('button',name=re.compile('^Tambahkan bordir'))).to_have_attribute('aria-expanded','true')
  expect(panel.get_by_label('Ringkasan bordir tersimpan')).to_contain_text('Jangan melewati saku.')
  panel.get_by_role('button',name='Dada Kiri',exact=True).click()
  panel.get_by_role('radio',name='Atur ukuran sendiri').check()
  panel.get_by_role('spinbutton',name='Lebar (cm)').fill('7')
  panel.get_by_role('spinbutton',name='Tinggi (cm)').fill('4')
  panel.get_by_role('button',name='Simpan bordir dada kiri',exact=True).click()
  page.get_by_role('button',name=re.compile('Tambahkan ke Keranjang')).click()
  expect(page.get_by_test_id('saved-placements')).to_contain_text('"widthCm":7')
  stored=page.evaluate("JSON.parse(localStorage.getItem('ofissio-cart-v1')).state.items")
  assert len(stored)==1 and stored[0]['totalQty']==8,'Editing must replace the original cart line'
  page.get_by_role('button',name='Periksa data admin',exact=True).click()
  admin=page.get_by_role('region',name='Fixture admin')
  for text in ['Diserahkan kepada Ofissio','dada.png','punggung.png','25 × 6 cm','ANDI','Jangan melewati saku.','Posisi tengah punggung.']:expect(admin).to_contain_text(text)
  expect(admin.get_by_role('link',name='Download',exact=True)).to_have_count(2)
  admin.screenshot(path=str(out/f'admin-{width}.png'))
  checks.append({'width':width,'perPositionFiles':True,'recommendedSizeNull':True,'manualSizeValidated':True,'reuseWithoutUpload':True,'pendingUploadBlocked':True,'failedUploadPreservesSaved':True,'cartPersistsAfterReload':True,'cartEditingPreservesDetailsAndQuantity':True,'adminComplete':True,'noOverflow':True})
  context.close()
 browser.close()
assert not unexpected,unexpected
assert not errors,errors
result={'status':'passed','checks':checks,'browserErrors':errors,'realWrites':0}
(out/'browser-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
