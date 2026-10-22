import json
import re
import atexit
from pathlib import Path
from playwright.sync_api import sync_playwright

# Uses a temporary, synthetic /variant-verification route. All API requests
# are intercepted; this script never writes to WooCommerce, Ginee or a real account.
ROOT=Path(__file__).resolve().parents[1]
route_file=ROOT/'src/app/variant-verification/page.tsx'
template=(ROOT/'test-fixtures/product-variants/preview-page.tsx').read_text(encoding='utf-8')
if route_file.exists() and route_file.read_text(encoding='utf-8') != template:
    raise RuntimeError('Preview route already exists with different content; refusing to overwrite it.')
route_file.parent.mkdir(parents=True,exist_ok=True)
route_file.write_text(template,encoding='utf-8')
def cleanup():
    if route_file.exists() and route_file.read_text(encoding='utf-8') == template:
        route_file.unlink()
        if not list(route_file.parent.iterdir()): route_file.parent.rmdir()
atexit.register(cleanup)
out=ROOT/'docs/previews/product-variants' 
out.mkdir(parents=True,exist_ok=True)
errors=[]
captured=[]
def api(route):
    if '/size-stock' in route.request.url:
        route.fulfill(json={'ok':True,'stock':{'color':'Merah','source':'ginee','checkedAt':'2026-10-22T00:00:00Z','rows':[{'size':'S','sku':'SN-MERAH-LPJ-NS-S','availableQty':5},{'size':'M','sku':'SN-MERAH-LPJ-NS-M','availableQty':8}]}})
    elif route.request.method not in ['GET','HEAD']:
        captured.append({'url':route.request.url,'body':route.request.post_data_json})
        route.fulfill(status=409,json={'ok':False,'message':'Permintaan pengujian berhasil ditangkap; tidak ada data asli diubah.'})
    else: route.fulfill(json={'ok':True,'session':None,'notifications':[],'promotions':[],'items':[]})

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.route('**/api/**',api)
    page.route('https://images.example/**',lambda route: route.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#d3dde5"/></svg>'))
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:8017/variant-verification',wait_until='networkidle',timeout=120000)
    page.get_by_role('heading',name='Jenis Produk',exact=True).wait_for()
    assert page.get_by_role('radio',name='Tanpa varian',exact=False).is_checked()
    assert page.get_by_role('textbox',name=re.compile('^SKU')).is_visible()
    page.get_by_role('radio',name='Dengan varian',exact=False).check()
    page.get_by_label('Nama produk',exact=False).fill('Kemeja Uji Varian')
    page.get_by_label('Kode model utama',exact=False).fill('SN')
    page.get_by_label('Harga reguler',exact=False).first.fill('100000')
    for name in ['Berat per pcs','Panjang paket','Lebar paket','Tinggi paket']:
        page.get_by_label(name,exact=False).fill('10')
    page.get_by_role('checkbox',name='Kemeja',exact=True).check()
    page.get_by_role('checkbox',name='Corporate',exact=True).check()
    for index,(name,values) in enumerate([('Warna','Merah'),('Lengan','Pendek,Panjang'),('Ukuran','S,M')]):
        page.get_by_role('button',name='Tambah pilihan',exact=True).click()
        page.get_by_label(f'Nama pilihan {index+1}',exact=True).fill(name)
        page.get_by_label('Nilai pilihan, pisahkan dengan koma',exact=True).nth(index).fill(values)
        page.get_by_label(f'Nama pilihan {index+1}',exact=True).click()
    page.get_by_role('button',name='Buat / perbarui kombinasi',exact=True).click()
    assert page.get_by_label('SKU stok',exact=True).count()==4
    for i,sku in enumerate(['SN-MERAH-LP-S','SN-MERAH-LP-M','SN-MERAH-LPJ-S','SN-MERAH-LPJ-M']):
        page.get_by_label('SKU stok',exact=True).nth(i).fill(sku)
    for width in [1440,390]:
        page.set_viewport_size({'width':width,'height':1000 if width>500 else 844})
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'admin overflow {width}'
        page.get_by_role('heading',name='Varian Produk',exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(out/f'admin-{width}.png'))
    page.get_by_role('button',name='Buat Produk',exact=True).click()
    page.wait_for_timeout(600)
    assert captured,'admin must send product payload'
    assert captured[0]['body']['productKind']=='variable'
    assert captured[0]['body']['modelCode']=='SN'
    assert captured[0]['body']['colors']==['Merah']
    assert captured[0]['body']['sizes']==['S','M']
    print(json.dumps({'admin_type_options_combinations_payload':'passed'}),flush=True)

    page.goto('http://127.0.0.1:8017/variant-verification?view=detail',wait_until='networkidle',timeout=120000)
    page.get_by_role('button',name='Panjang',exact=True).click()
    page.get_by_role('button',name='Tanpa Saku',exact=True).click()
    page.get_by_role('spinbutton',name='Quantity ukuran S',exact=True).fill('2')
    assert '120.000' in page.locator('.storefront-product-price').inner_text(), 'selected sleeve price must update'
    assert page.get_by_role('button',name='Panjang',exact=True).get_attribute('aria-pressed')=='true'
    for width in [1440,390]:
        page.set_viewport_size({'width':width,'height':1000 if width>500 else 844})
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'detail overflow {width}'
        page.get_by_role('button',name='Panjang',exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(out/f'detail-{width}.png'))
    print(json.dumps({'detail_options_quantity_responsive':'passed'}),flush=True)
    page.goto('http://127.0.0.1:8017/variant-verification?view=simple',wait_until='networkidle',timeout=120000)
    assert page.get_by_role('spinbutton',name='Jumlah produk',exact=True).count()==1
    page.get_by_role('spinbutton',name='Jumlah produk',exact=True).fill('3')
    assert page.get_by_text('SKU: KL-003',exact=True).is_visible()
    assert page.get_by_role('button',name='Lihat size chart lengkap',exact=True).count()==0
    print(json.dumps({'simple_direct_quantity':'passed'}),flush=True)
    page.goto('http://127.0.0.1:8017/variant-verification?view=card',wait_until='networkidle',timeout=120000)
    page.screenshot(path=str(out/'catalog-card.png'))
    assert page.get_by_text('Lengan',exact=True).is_visible()
    assert page.get_by_text('Pendek',exact=True).is_visible()
    assert page.get_by_text('Panjang',exact=True).is_visible()
    page.screenshot(path=str(out/'catalog-card.png'))
    assert not errors,errors
    print(json.dumps({'card_options':'passed','browser_errors':errors,'real_writes':0}),flush=True)
    browser.close()
