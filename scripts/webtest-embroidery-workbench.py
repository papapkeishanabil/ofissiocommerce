import json,os,re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect

out=Path(os.environ.get('OFISSIO_TEST_OUT','artifacts/embroidery-admin-workbench-20261109'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('OFISSIO_TEST_BASE','http://localhost:8032');path='/product/embroidery-admin-fixture'
session={'user':{'id':'fixture-user','role':'customer_admin','email':'fixture@example.test','fullName':'Customer Uji'},'company':{'id':'fixture-company','companyName':'PT Contoh Seragam','addresses':[],'picName':'Customer Uji','picEmail':'fixture@example.test','picWhatsapp':'081234567890'}}
errors=[];writes=[];submissions=[];checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for width in [1600,1280,390]:
  print('Workbench check',width,flush=True)
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  customer_quote=None;payment_attempts=[]
  def api(route):
   request=route.request;url=urlparse(request.url)
   if url.path=='/api/auth/session':route.fulfill(json={'ok':True,'provider':'supabase','session':{'kind':'customer','session':session}});return
   if url.path.endswith('/workbench'):
    submissions.append(request.post_data_json);route.fulfill(json={'ok':True});return
   if url.path.endswith('/accept'):
    submissions.append({'customerAccept':True})
    route.fulfill(json={'ok':True,'quotation':{**customer_quote,'status':'accepted'},'orderId':None,'continuationPending':True});return
   if url.path=='/api/payment/status':
    route.fulfill(json={'ok':True,'payment':{'paymentId':'fixture-payment','status':'waiting_payment','amount':892460,'paymentUrl':None,'expiredAt':None,'paidAt':None}});return
   if url.path=='/api/payment/ipaymu/create':
    payment_attempts.append(request.post_data_json);route.fulfill(status=503,json={'ok':False,'message':'Fixture: pembayaran belum tersedia, coba kembali.'});return
   if request.method not in ['GET','HEAD','OPTIONS']:writes.append(request.url)
   route.fulfill(json={'ok':True,'items':[],'files':[],'orders':[],'notifications':[]})
  context.route('**/api/**',api)
  page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+path,wait_until='networkidle',timeout=120000)
  scope=page.get_by_role('region',name='Siapkan pesanan bordir',exact=True)
  expect(scope).to_be_visible()
  page.wait_for_function("Array.from(document.querySelectorAll('button')).some(e=>e.getAttribute('aria-label')==='Perbesar logo Dada Kiri'&&Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onClick==='function'))")
  expect(scope.get_by_role('button',name='Kirim rincian ke customer')).to_have_count(1)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  row=scope.get_by_role('article',name=re.compile('^Harga Kemeja'))
  expect(row).to_contain_text('S');expect(row).to_contain_text('4 pcs')
  # Logo references and their price controls share the same position row.
  for position in ['Dada Kiri','Dada Kanan']:
   zone=scope.get_by_role('region',name=f'Bordir {position}',exact=True)
   image=zone.get_by_role('img',name=f'Logo {position}',exact=True)
   image.scroll_into_view_if_needed();image.evaluate('img=>img.decode()')
   expect(zone.get_by_role('spinbutton',name=f'{position} / pcs',exact=True)).to_be_visible()
   zone.get_by_role('button',name=f'Perbesar logo {position}').click()
   dialog=page.get_by_role('dialog');expect(dialog).to_be_visible()
   page.keyboard.press('Escape');expect(dialog).not_to_be_visible()
  page.get_by_role('button',name='Perbesar foto Kemeja Kantor Wanita SN-Basic — Pink-Red Series').click()
  expect(page.get_by_role('dialog')).to_be_visible();page.get_by_role('button',name='Tutup pratinjau').click()
  before=len(submissions);scope.get_by_role('button',name='Kirim rincian ke customer').click()
  expect(scope.get_by_role('alert')).to_contain_text('Lengkapi harga');assert len(submissions)==before
  scope.get_by_role('spinbutton',name='Dada Kanan / pcs',exact=True).fill('7000')
  scope.get_by_role('spinbutton',name='Biaya persiapan Dada Kanan',exact=True).fill('10000')
  scope.get_by_role('spinbutton',name='Ongkos kirim',exact=True).fill('20000')
  expect(scope.get_by_text('Rp 892.460',exact=True)).to_be_visible()
  scope.get_by_role('button',name='Simpan draft harga',exact=True).click()
  expect(scope.get_by_role('status')).to_contain_text('Draft harga tersimpan')
  assert submissions[-1]['publish'] is False and 'estimate' not in submissions[-1]
  scope.get_by_role('textbox',name='Penanggung jawab bordir',exact=True).fill('Tim Bordir')
  date=scope.get_by_label('Tanggal mulai',exact=True);original_date=date.input_value();date.fill('');date.fill(original_date)
  scope.get_by_role('combobox',name='Kurir pengiriman',exact=True).select_option('jne')
  scope.get_by_role('button',name='Kirim rincian ke customer',exact=True).click()
  expect(scope.get_by_role('status')).to_contain_text('dikirim bersama')
  payload=submissions[-1];assert payload['publish'] is True
  assert payload['estimate']['publishToCustomer'] is False
  assert payload['estimate']['validUntil']==payload['pricing']['validUntil']
  assert payload['pricing']['items'][0]['embroideryLines'][1]['unitPrice']==7000
  row.scroll_into_view_if_needed();page.screenshot(path=str(out/f'workbench-{width}.png'))
  scope.screenshot(path=str(out/f'workbench-full-{width}.png'))
  # Sent quotations keep the same references available while prices are locked.
  page.goto(base+path+'?view=readonly',wait_until='networkidle')
  page.wait_for_function("Array.from(document.querySelectorAll('button')).some(e=>e.getAttribute('aria-label')==='Perbesar logo Dada Kiri'&&Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onClick==='function'))")
  expect(page.get_by_role('spinbutton',name='Harga kemeja / pcs',exact=True)).to_be_disabled()
  expect(page.get_by_role('button',name='Kirim ulang ke customer',exact=True)).to_be_visible()
  page.get_by_role('button',name='Perbesar logo Dada Kiri').click();expect(page.get_by_role('dialog')).to_be_visible();page.keyboard.press('Escape')
  page.goto(base+path+'?view=customer',wait_until='networkidle')
  customer_quote=json.loads(page.locator('#customer-fixture-data').text_content())
  page.wait_for_function("Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Setujui & lanjutkan'&&Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onClick==='function'))")
  page.get_by_role('button',name='Setujui & lanjutkan',exact=True).click()
  expect(page.get_by_role('button',name='Lanjutkan pesanan',exact=True)).to_be_visible()
  expect(page.get_by_text(re.compile('Persetujuan Anda sudah tersimpan'))).to_be_visible()
  page.goto(base+path+'?view=payment',wait_until='networkidle')
  button=page.get_by_role('button',name='Lanjut ke pembayaran',exact=True)
  expect(button).to_be_visible();button.click()
  expect(page.get_by_text('Fixture: pembayaran belum tersedia, coba kembali.',exact=True)).to_be_visible()
  assert len(payment_attempts)==1 and payment_attempts[0]['orderId']=='fixture-order'
  checks.append({'width':width,'productAndLogoBesidePricing':True,'imageZoomAndEscape':True,'liveTotal':True,'onePublishAction':True,'partialPriceDraft':True,'sharedValidity':True,'readOnlyReferences':True,'customerRetryWithoutRefilling':True,'paymentEntryAndRecovery':True,'noOverflow':True})
  context.close()
 browser.close()
assert not errors,errors
assert not writes,writes
result={'status':'passed','checks':checks,'browserErrors':errors,'interceptedSubmissions':len(submissions),'realWrites':0}
(out/'browser-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
