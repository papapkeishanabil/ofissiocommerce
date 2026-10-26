"""Synthetic admin/API fixture: never sends writes to real product services."""
import atexit,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1]
route_file=root/'src/app/rgb-verification/page.tsx'
template=(root/'test-fixtures/product-variants/preview-page.tsx').read_text(encoding='utf-8').replace('mainImage: undefined, images: []','mainImage: undefined, images: [], productVariants: product.productVariants?.map(row => ({ ...row, fabricColor: "#987654" }))')
assert not route_file.exists(), 'Temporary verification route already exists'
route_file.parent.mkdir(parents=True)
route_file.write_text(template,encoding='utf-8')
def cleanup():
 if route_file.exists() and route_file.read_text(encoding='utf-8')==template:
  route_file.unlink()
  if not list(route_file.parent.iterdir()):route_file.parent.rmdir()
atexit.register(cleanup)
out=root/'artifacts/variant-colors';out.mkdir(exist_ok=True)
captured=[];errors=[]
def api(route):
 if route.request.method not in ['GET','HEAD']:
  body=route.request.post_data_json;captured.append({'url':route.request.url,'body':body})
  if route.request.url.endswith('/variants'):
   route.fulfill(json={'ok':True,'variants':[dict(row,id=9000+i) for i,row in enumerate(body['variants'])]})
  elif route.request.url.endswith('/woocommerce'):
   route.fulfill(json={'ok':True,'product':{'id':990001,'readiness':{'isVisibleInOfissio':False}}})
  else:route.fulfill(json={'ok':True,'images':[]})
 else:route.fulfill(json={'ok':True,'session':None,'notifications':[],'promotions':[],'items':[]})
with sync_playwright() as p:
 browser=p.chromium.launch()
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.route('**/api/**',api)
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:8000/rgb-verification',wait_until='networkidle',timeout=120000)
 page.get_by_role('radio',name='Dengan varian',exact=False).check()
 page.get_by_label('Nama produk',exact=False).fill('Kemeja uji warna')
 page.get_by_label('Kode model utama',exact=False).fill('RGB')
 page.get_by_label('Harga reguler',exact=False).first.fill('100000')
 for name in ['Berat per pcs','Panjang paket','Lebar paket','Tinggi paket']:page.get_by_label(name,exact=False).fill('10')
 page.get_by_role('checkbox',name='Kemeja',exact=True).check()
 page.get_by_role('checkbox',name='Corporate',exact=True).check()
 for index,(name,values) in enumerate([('Warna','Coksu,Milo'),('Ukuran','S,M')]):
  page.get_by_role('button',name='Tambah pilihan',exact=True).click()
  page.get_by_label(f'Nama pilihan {index+1}',exact=True).fill(name)
  page.get_by_label('Nilai pilihan, pisahkan dengan koma',exact=True).nth(index).fill(values)
  page.get_by_label(f'Nama pilihan {index+1}',exact=True).click()
 page.get_by_role('button',name='Buat / perbarui kombinasi',exact=True).click()
 for color in ['Coksu','Milo']:
  page.get_by_role('textbox',name=re.compile('^SKU varian — '+color)).fill('RGB-'+color.upper())
  page.get_by_role('button',name='Terapkan ke semua ukuran — '+color,exact=True).click()
 expect(page.get_by_label('HEX Coksu',exact=True)).to_have_value('#B69A84')
 page.get_by_label('HEX Coksu',exact=True).fill('#ABCDEF')
 expect(page.get_by_label('R Coksu',exact=True)).to_have_value('171')
 page.get_by_label('R Milo',exact=True).fill('152')
 page.get_by_label('G Milo',exact=True).fill('118')
 page.get_by_label('B Milo',exact=True).fill('84')
 expect(page.get_by_label('HEX Milo',exact=True)).to_have_value('#987654')
 page.get_by_label('HEX Coksu',exact=True).fill('#bad')
 page.get_by_role('button',name='Buat Produk',exact=True).click()
 assert not captured,'Invalid HEX must prevent saving'
 page.get_by_label('HEX Coksu',exact=True).fill('#ABCDEF')
 page.get_by_label('R Milo',exact=True).fill('256')
 page.get_by_role('button',name='Buat Produk',exact=True).click()
 assert not captured,'Invalid RGB must prevent saving'
 page.get_by_label('R Milo',exact=True).fill('152')
 for width in [1440,390]:
  page.set_viewport_size({'width':width,'height':1000})
  section=page.get_by_role('region',name='Warna tampilan varian')
  section.scroll_into_view_if_needed()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  section.screenshot(path=str(out/f'admin-rgb-{width}.png'))
 page.get_by_role('button',name='Buat Produk',exact=True).click()
 page.wait_for_timeout(1200)
 payload=next(item['body'] for item in captured if item['url'].endswith('/variants'))
 assert len(payload['variants'])==4
 for row in payload['variants']:assert row['fabricColor']==('#abcdef' if row['options']['Warna']=='Coksu' else '#987654')
 page.goto('http://127.0.0.1:8000/rgb-verification?view=card',wait_until='networkidle',timeout=120000)
 expect(page.locator('.catalog-product-card').get_by_role('img',name='Merah',exact=True)).to_have_css('background-color','rgb(152, 118, 84)')
 page.screenshot(path=str(out/'catalog-saved-rgb.png'))
 assert not errors,errors
 print(json.dumps({'status':'passed','adminWidths':[1440,390],'checks':['HEX and RGB synchronization','invalid HEX/RGB blocks save','all size rows include RGB in API payload','catalog uses saved RGB'],'realWrites':0,'browserErrors':errors}))
 browser.close()
