"""Mock uploads and private previews; verify exact file-to-position mapping without real writes."""
import atexit,json,re,os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('OFISSIO_TEST_OUT',str(root/'artifacts/embroidery-logo-thumbnail')));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('OFISSIO_TEST_BASE','http://localhost:8029');path='/product/embroidery-thumbnail-fixture'
route_file=root/'src/app/product/embroidery-thumbnail-fixture/page.tsx'
template='export { default } from "../../../../test-fixtures/product-variants/embroidery-without-3d-page";\n'
created=os.environ.get('OFISSIO_TEST_FIXTURES_READY')!='1'
if created:
 assert not route_file.exists();route_file.parent.mkdir();route_file.write_text(template)
def cleanup():
 if created and route_file.exists() and route_file.read_text()==template:route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
session={'user':{'id':'fixture-user','role':'customer_admin','email':'fixture@example.test','fullName':'Customer Fixture'},'company':{'id':'fixture-company','companyName':'Fixture Company','addresses':[]}}
def svg(color,letter):return f'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect x="6" y="6" width="108" height="68" rx="12" fill="{color}"/><text x="60" y="56" font-size="48" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="white">{letter}</text></svg>'.encode()
images={'logo-1':svg('#142766','M'),'logo-2':svg('#b42318','C'),'logo-3':svg('#247a55','N')}
errors=[];unexpected=[];checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for width in [1440,390,320]:
  print('Thumbnail check',width,flush=True)
  context=browser.new_context(viewport={'width':width,'height':1100},reduced_motion='reduce')
  uploads=[];requested=[];denied=set()
  def api(route):
   req=route.request;url=urlparse(req.url)
   if url.path=='/api/auth/session':route.fulfill(json={'ok':True,'provider':'supabase','session':{'kind':'customer','session':session}});return
   if url.path=='/api/files/upload':
    uploads.append(req.url);route.fulfill(json={'ok':True,'file':{'id':f'logo-{len(uploads)}','originalFilename':'Logo Perusahaan Final.svg'}});return
   if '/signed-url' in url.path:
    file_id=url.path.split('/')[3];requested.append(file_id)
    if file_id in denied:route.fulfill(status=404,json={'ok':False});return
    assert file_id in images,file_id
    route.fulfill(json={'ok':True,'fileId':file_id,'signedUrl':f'/fixture-logo/{file_id}.svg'});return
   if req.method not in ['GET','HEAD','OPTIONS']:unexpected.append(req.url)
   route.fulfill(json={'ok':True,'files':[],'items':[],'notifications':[]})
  context.route('**/api/**',api)
  context.route('**/fixture-logo/*.svg',lambda route:route.fulfill(content_type='image/svg+xml',body=images[Path(urlparse(route.request.url).path).stem]))
  page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+path,wait_until='networkidle',timeout=120000)
  page.wait_for_function("Array.from(document.querySelectorAll('input[type=number]')).some(e=>Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onChange==='function'))")
  for size,total in [('S',4),('M',8)]:
   page.get_by_role('spinbutton',name='Quantity ukuran '+size,exact=True).fill('4');expect(page.locator('[data-part=total-value]')).to_have_text(f'{total} pcs')
  panel=page.get_by_role('region',name='Pilihan bordir produk',exact=True)
  panel.get_by_role('button',name=re.compile('^Tambahkan bordir')).click()
  for position,file_id in [('Dada Kiri','logo-1'),('Dada Kanan','logo-2')]:
   panel.locator('[aria-label="Pilih posisi bordir"]').get_by_role('button',name=position,exact=True).click()
   panel.locator('input[type=file]').first.set_input_files({'name':'Logo Perusahaan Final.svg','mimeType':'image/svg+xml','buffer':images[file_id]})
   save=panel.get_by_role('button',name='Simpan bordir '+position.lower(),exact=True);expect(save).to_be_enabled();save.click()
  summary=panel.get_by_role('region',name='Ringkasan bordir tersimpan',exact=True)
  def row(position):return summary.get_by_role('article',name='Bordir '+position,exact=True)
  def image_ready(locator):
   expect(locator).to_be_visible();locator.evaluate('(img)=>img.decode()')
  left=row('Dada Kiri').get_by_role('img');right=row('Dada Kanan').get_by_role('img')
  image_ready(left);image_ready(right)
  initial_left=left.get_attribute('src');initial_right=right.get_attribute('src')
  assert initial_left.startswith('blob:') and initial_right.startswith('blob:') and initial_left!=initial_right
  assert requested==[],'Freshly uploaded logos should use their local previews'
  row('Dada Kiri').get_by_role('button',name='Edit',exact=True).click()
  expect(panel.locator('[data-configuration-editor]').get_by_role('img',name='Logo Perusahaan Final.svg',exact=True)).to_have_attribute('src',initial_left)
  panel.get_by_role('button',name='Batal',exact=True).click()
  summary.screenshot(path=str(out/f'thumbnails-{width}.png'))
  page.get_by_role('button',name=re.compile('Tambahkan ke Keranjang')).click()
  page.wait_for_function("JSON.parse(localStorage.getItem('ofissio-cart-v1')).state.items.length===1")
  stored=page.evaluate("JSON.parse(localStorage.getItem('ofissio-cart-v1')).state.items[0]")
  assert all(p.get('logoPreviewUrl','').startswith('blob:') for p in stored['embroideryPlacements'])
  # One saved URL expires after navigation; the second emulates an older item without any preview.
  page.evaluate("(()=>{const cart=JSON.parse(localStorage.getItem('ofissio-cart-v1'));delete cart.state.items[0].embroideryPlacements[1].logoPreviewUrl;localStorage.setItem('ofissio-cart-v1',JSON.stringify(cart))})()")
  edit_path=base+path+'?studio=1&line='+stored['id']
  page.goto(edit_path,wait_until='networkidle')
  for position,file_id in [('Dada Kiri','logo-1'),('Dada Kanan','logo-2')]:
   img=row(position).get_by_role('img');expect(img).to_have_attribute('src',f'/fixture-logo/{file_id}.svg');image_ready(img)
  assert set(requested)=={'logo-1','logo-2'},requested
  summary.screenshot(path=str(out/f'restored-{width}.png'))
  denied.add('logo-1')
  page.goto(edit_path+'&retry=unavailable',wait_until='networkidle')
  expect(row('Dada Kiri').get_by_text('Pratinjau tidak tersedia',exact=True)).to_be_visible()
  expect(row('Dada Kiri').get_by_role('img')).to_have_count(0)
  image_ready(row('Dada Kanan').get_by_role('img'))
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  row('Dada Kanan').get_by_role('button',name='Edit',exact=True).click()
  panel.locator('input[type=file]').first.set_input_files({'name':'Logo Perusahaan Final.svg','mimeType':'image/svg+xml','buffer':images['logo-3']})
  save=panel.get_by_role('button',name='Simpan bordir dada kanan',exact=True);expect(save).to_be_enabled();save.click()
  image_ready(row('Dada Kanan').get_by_role('img'))
  assert row('Dada Kanan').get_by_role('img').get_attribute('src').startswith('blob:')
  assert len(uploads)==3
  checks.append({'width':width,'distinctLogoPerPosition':True,'sameFilenameDoesNotConfuseImages':True,'previewPreservedWhenSaved':True,'editShowsSameLogo':True,'expiredAndMissingPreviewsRestoredByFileId':True,'unavailableLogoHasClearFallback':True,'replacementUpdatesThumbnail':True,'noOverflow':True})
  context.close()
 browser.close()
assert not errors,errors
assert not unexpected,unexpected
result={'status':'passed','checks':checks,'browserErrors':errors,'realWrites':0};(out/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
