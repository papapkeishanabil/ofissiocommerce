"""Fixture-only checkout checks; no real accounts, payments or address writes."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('CHECKOUT_TEST_URL', 'http://127.0.0.1:8051')
out = Path('audits/personal-checkout'); out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for width in [1440,390]:
  session={'user':{'id':'user-a','companyId':'company-a','fullName':'Deny Suhartana','email':'deny@example.test','whatsapp':'Belum dilengkapi','role':'company_admin','status':'active'},'company':{'id':'company-a','companyName':'Perusahaan Deny','industry':'','employeeCount':0,'phone':'','picName':'Deny Suhartana','picEmail':'deny@example.test','picWhatsapp':'Belum dilengkapi','addresses':[]}}
  sizes={s:0 for s in ['OS','XS','S','M','L','XL','2XL','3XL','4XL','5XL']};sizes['M']=1
  item={'id':'fixture','productId':'fixture','productSlug':'fixture','productName':'Kemeja Kantor','sku':'TEST-M','color':'Putih','sizes':sizes,'sizeMatrix':sizes,'totalQty':1,'unitPrice':85000,'estimatedPrice':85000,'regularPrice':85000,'finalUnitPrice':85000,'finalEstimatedTotal':85000,'selectedEmbroideryZones':[],'embroideryPlacements':[],'customization':None,'fulfillmentType':'READY_STOCK'}
  context=browser.new_context(viewport={'width':width,'height':1000},extra_http_headers={'x-ofissio-user-id':'user-a','x-ofissio-company-id':'company-a'})
  context.add_init_script('localStorage.setItem("ofissio-cart-v1", '+json.dumps(json.dumps({'state':{'items':[item]},'version':0}))+')')
  page=context.new_page(); errors=[]; payloads=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def api(route):
   path=route.request.url.split('/api/',1)[-1].split('?')[0]
   data={}
   if path=='auth/session':data={'provider':'supabase','session':{'kind':'customer','session':session}}
   elif path=='company/addresses':
    address=route.request.post_data_json;address['id']='address-a';session['company']['addresses']=[address];data={'ok':True}
   elif path=='company/profile':
    session['company'].update(route.request.post_data_json);data={'ok':True}
   elif path=='checkout/cart':
    payloads.append(route.request.post_data_json);data={'ok':True,'cartId':'cart-fixture','subtotal':85000,'discountTotal':0}
   elif path=='shipping/rates':data={'ok':True,'rates':[{'id':'rate-fixture','courier':'JNE','service':'REG','price':12000,'estimatedDays':'2–3 hari'}]}
   elif route.request.method!='GET':raise AssertionError('Unexpected write: '+path)
   route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
  page.route('**/api/**',api)
  page.goto(base+'/checkout',wait_until='networkidle',timeout=120000)
  expect(page.get_by_role('heading',name='Informasi customer')).to_be_visible()
  expect(page.get_by_text('Deny Suhartana',exact=True)).to_be_visible()
  expect(page.get_by_label('Nama penerima')).to_have_value('Deny Suhartana')
  expect(page.get_by_label('Nomor telepon')).to_have_value('')
  checkbox=page.get_by_role('checkbox',name='Saya memesan atas nama perusahaan')
  expect(checkbox).not_to_be_checked()
  expect(page.locator('#co-name')).to_have_count(0)
  page.get_by_label('Alamat',exact=True).fill('Jalan Contoh 123')
  checkbox.check()
  expect(page.get_by_role('heading',name='Lengkapi profil perusahaan')).to_be_visible()
  expect(page.get_by_role('button',name='Simpan profil perusahaan dahulu')).to_be_disabled()
  page.screenshot(path=str(out/f'company-{width}.png'),full_page=True)
  checkbox.uncheck()
  expect(page.get_by_label('Alamat',exact=True)).to_have_value('Jalan Contoh 123')
  page.get_by_label('Nomor telepon').fill('081234567890')
  page.get_by_label('Kota',exact=True).fill('Bandung')
  page.get_by_label('Kode pos').fill('40115')
  page.get_by_label('Provinsi').fill('Jawa Barat')
  page.get_by_role('button',name='Simpan informasi penerima').click()
  expect(page.get_by_role('button',name='Pilih pengiriman',exact=True)).to_be_enabled()
  page.get_by_role('button',name='Pilih pengiriman',exact=True).click()
  expect(page.get_by_role('button',name='Lanjut Pembayaran',exact=True)).to_be_enabled()
  assert payloads[-1]['customerType']=='individual'
  assert payloads[-1]['shippingAddressId']=='address-a'
  checkbox.check()
  expect(page.get_by_role('button',name='Simpan profil perusahaan dahulu')).to_be_disabled()
  page.locator('#co-name').fill('PT Contoh')
  page.locator('#co-industry').select_option(index=1)
  page.get_by_label('Jumlah Karyawan').fill('10')
  page.get_by_label('Telepon Perusahaan').fill('02112345678')
  page.get_by_label('WhatsApp PIC').fill('081234567890')
  page.get_by_role('button',name='Simpan Profil Perusahaan',exact=True).click()
  expect(page.get_by_role('button',name='Pilih pengiriman',exact=True)).to_be_enabled()
  page.get_by_role('button',name='Pilih pengiriman',exact=True).click()
  expect(page.get_by_role('button',name='Lanjut Pembayaran',exact=True)).to_be_enabled()
  assert payloads[-1]['customerType']=='company'
  page.locator('#co-name').fill('PT Perubahan Belum Disimpan')
  expect(page.get_by_role('button',name='Simpan profil perusahaan dahulu')).to_be_disabled()
  checkbox.uncheck()
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
  page.get_by_role('heading',name='Informasi customer').scroll_into_view_if_needed()
  page.screenshot(path=str(out/f'individual-{width}.png'),full_page=True)
  assert not errors,errors
  context.close()
 browser.close()
 print('PASS desktop/mobile: default personal, Google identity, blank phone, optional company gate, address survives toggle, address save and shipping payload; no real writes')
