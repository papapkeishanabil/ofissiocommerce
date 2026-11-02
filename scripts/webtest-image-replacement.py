"""Synthetic edit/delete/upload/retry flow; all APIs mocked, zero real writes."""
import atexit,base64,copy,json,os
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1];out=root/'artifacts/kk007-images';out.mkdir(exist_ok=True)
base=os.environ.get('OFISSIO_IMAGE_TEST_BASE_URL','http://localhost:8000').rstrip('/')
remote=os.environ.get('OFISSIO_IMAGE_TEST_REMOTE')=='1'
images=[{'id':i+1,'src':f'https://images.example/old-{i+1}.png','name':f'Old {i+1}','alt':f'Old {i+1}'} for i in range(13)]
product={'id':990214,'name':'KK-007 fixture','slug':'kk007-fixture','sku':'KK-007','price':110000,'status':'draft','categories':[{'id':1,'name':'Kemeja','slug':'kemeja'}],'industries':['office'],'primaryImage':images[0],'readiness':{'isVisibleInOfissio':False,'status':'draft_woocommerce','statusLabel':'Draft','model3DStatus':'glb_missing','model3DStatusLabel':'Tidak ada','blockingIssues':[],'warnings':[]},'wooEditUrl':None,'productKind':'variable','modelCode':'KK-007','variantOptions':[{'name':'Warna','values':['Merah']},{'name':'Ukuran','values':['S']}],'productVariants':[{'id':990311,'sku':'KK-007-MERAH-S','options':{'Warna':'Merah','Ukuran':'S'},'regularPrice':110000,'imageSrc':images[0]['src']}],'defaultVariantSku':'KK-007-MERAH-S','description':'','shortDescription':'','weightGram':300,'lengthCm':30,'widthCm':20,'heightCm':3,'imageCount':13,'imageUrls':[i['src'] for i in images],'images':images,'attributes':[{'name':'Warna','slug':'warna','options':['Merah']},{'name':'Ukuran','slug':'ukuran','options':['S']}],'ofissioMeta':{'has3DModel':False,'model3DUrl':'','model3DStorageBucket':'','model3DStorageKey':'','model3DId':'','model3DVersion':'','model3DSource':'','model3DFilename':'','model3DUpdatedAt':'','moq':1,'leadTime':'7 hari','fulfillmentType':'ready_stock_with_customization','transactionMode':'hybrid','supportsEmbroidery':False,'supportsScreenPrinting':False,'supportsDtf':False,'embroideryZones':[],'hasLegacyEmbroideryPricing':False,'alwaysOrderable':True,'replenishmentPolicy':'internal_warning_only','processRoute':'fulfillment','gender':'unisex','sleeveType':'short','safetyFeatures':[],'quantityPricingEnabled':False,'quantityPricingMode':'fixed_unit_price','quantityBasis':'total_order_qty','quantityPricingTiers':[]}}
(out/'browser-product.json').write_text(json.dumps(product),encoding='utf-8')
route_file=root/'src/app/image-replacement-verification/page.tsx';template=(root/'test-fixtures/product-variants/image-replacement-page.tsx').read_text(encoding='utf-8')
if not remote:
 assert not route_file.exists();route_file.parent.mkdir();route_file.write_text(template,encoding='utf-8')
def cleanup():
 if remote:return
 if route_file.exists() and route_file.read_text(encoding='utf-8')==template:route_file.unlink();route_file.parent.rmdir()
 generated=root/'.next-dev/dev/types/app/image-replacement-verification/page.ts'
 if not route_file.exists() and generated.exists():generated.unlink()
atexit.register(cleanup)
requests=[];errors=[];upload_attempts=0;server_product=copy.deepcopy(product)
def api(route):
 global upload_attempts
 req=route.request;url=req.url;method=req.method
 if method not in ['GET','HEAD']:requests.append((method,url))
 if url.endswith('/images') and method=='POST':
  upload_attempts+=1
  raw=b'Content-Type: '+req.headers['content-type'].encode()+b'\r\nMIME-Version: 1.0\r\n\r\n'+req.post_data_buffer
  parts=list(BytesParser(policy=default).parsebytes(raw).iter_parts())
  retained=next(part.get_payload(decode=True) for part in parts if part.get_param('name',header='content-disposition')=='retainedImages')
  assert json.loads(retained)==[],'Deleted photos must not be included in upload count'
  assert len([part for part in parts if part.get_param('name',header='content-disposition')=='files'])==11
  if upload_attempts==1:route.fulfill(status=503,json={'ok':False,'message':'WordPress Media sedang tidak tersedia.'});return
  new=[{'id':1000+i,'src':f'https://images.example/new-{i}.png','name':f'New {i}','alt':f'New {i}'} for i in range(11)]
  server_product['images']=new;server_product['imageUrls']=[i['src'] for i in new]
  route.fulfill(json={'ok':True,'images':new,'uploadedImages':new});return
 if url.endswith('/variants'):
  body=req.post_data_json
  assert not any(row['imageSrc'].startswith('blob:') for row in body['variants'])
  assert body['variants'][0]['imageSrc']=='https://images.example/new-0.png'
  route.fulfill(json={'ok':True,'variants':body['variants']});return
 if url.endswith('/woocommerce/990214'):route.fulfill(json={'ok':True,'product':server_product});return
 route.fulfill(json={'ok':True,'session':None,'notifications':[],'promotions':[],'items':[]})

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000})
 page.route('**/api/**',api);page.route('https://images.example/**',lambda r:r.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#123456"/></svg>'))
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('requestfailed',lambda req:print('FAILED ASSET',req.url,req.failure,flush=True) if '/_next/' in req.url else None)
 page.goto(base+'/image-replacement-verification?empty=1',wait_until='networkidle',timeout=120000)
 page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Simpan Perubahan') && Object.keys(b).some(k => k.startsWith('__reactProps') && typeof b[k]?.type === 'string'))",timeout=30000)
 expect(page.get_by_text('Belum ada kombinasi varian.',exact=False)).to_be_visible()
 page.get_by_role('button',name='Simpan Perubahan',exact=True).click()
 expect(page.get_by_text('Kombinasi varian belum dibuat.',exact=False).first).to_be_visible()
 assert not requests,'Empty variants must stop before any product/photo write'
 expect(page.locator('#product-variants')).to_be_focused()
 page.locator('#product-variants').screenshot(path=str(out/'empty-variants-guidance.png'))
 page.get_by_role('button',name='Buat / perbarui kombinasi',exact=True).click()
 expect(page.get_by_text('Belum ada kombinasi varian.',exact=False)).to_have_count(0)
 expect(page.get_by_label('SKU stok',exact=True)).to_have_count(1)
 page.goto(base+'/image-replacement-verification',wait_until='networkidle',timeout=120000)
 gallery=page.get_by_role('region',name='Foto Produk',exact=True)
 expect(gallery.locator('ol > li')).to_have_count(13)
 page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b => b.getAttribute('aria-label') === 'Hapus Foto' && Object.keys(b).some(k => k.startsWith('__reactProps') && typeof b[k]?.onClick === 'function'))",timeout=30000)
 for i in range(13):
  gallery.get_by_role('button',name='Hapus Foto',exact=True).first.click()
  expect(gallery.locator('ol > li')).to_have_count(12-i)
 expect(gallery.get_by_text('Belum ada foto produk.',exact=True)).to_be_visible()
 png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMgoAAAAASUVORK5CYII=')
 gallery.get_by_label('Upload Foto Tambahan',exact=False).set_input_files([{'name':f'replacement-{i}.png','mimeType':'image/png','buffer':png} for i in range(11)])
 expect(gallery.locator('ol > li')).to_have_count(11)
 picker=page.get_by_role('combobox',name='Foto semua ukuran — Merah',exact=True)
 first_photo=picker.locator('option').evaluate_all("options=>options.map(o=>o.value).find(v=>v.startsWith('blob:'))")
 assert first_photo;picker.select_option(first_photo)
 page.get_by_role('button',name='Terapkan ke semua ukuran — Merah',exact=True).click()
 save=page.get_by_role('button',name='Simpan Perubahan',exact=True)
 save.click()
 warning=page.get_by_text('Data utama produk tersimpan, tetapi',exact=False).first
 expect(warning).to_contain_text('WordPress Media sedang tidak tersedia.')
 expect(warning).to_contain_text('varian belum disimpan karena menunggu foto')
 assert not any(url.endswith('/variants') for _,url in requests)
 expect(gallery.get_by_text('Belum diupload',exact=True)).to_have_count(11)
 warning.screenshot(path=str(out/'upload-error-1440.png'))
 save.click()
 expect(gallery.get_by_text('Foto produk berhasil disimpan ke WooCommerce.',exact=True)).to_be_visible()
 expect(gallery.get_by_text('Belum diupload',exact=True)).to_have_count(0)
 assert upload_attempts==2
 assert sum(url.endswith('/variants') for _,url in requests)==1
 assert not any(method=='PATCH' and url.endswith('/images') for method,url in requests),'Final upload already matches final gallery'
 for width in [1440,390]:
  page.set_viewport_size({'width':width,'height':1000});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  gallery.get_by_text('Foto produk berhasil disimpan ke WooCommerce.',exact=True).screenshot(path=str(out/f'saved-{width}.png'))
 assert not errors,errors
 result={'status':'passed','checks':['empty variants explained in Indonesian before writes','focus moves to variant editor','generate combinations action works','delete 13 and upload 11','upload includes retained gallery','provider error visible','variants skipped after photo failure','pending files survive retry','uploaded variant URL resolved','no unnecessary gallery write','desktop/mobile no overflow'],'browserErrors':errors,'realWrites':0}
 (out/'browser-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True);browser.close()
