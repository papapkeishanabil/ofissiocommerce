"""Verify actual cart/checkout plus quotation, tracking, and server-signed admin summaries. APIs mocked."""
import atexit,json,re,os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('OFISSIO_TEST_OUT',str(root/'artifacts/embroidery-thumbnails-everywhere')));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('OFISSIO_TEST_BASE','http://localhost:8029');path='/product/embroidery-summary-fixture'
route_file=root/'src/app/product/embroidery-summary-fixture/page.tsx';template='export { default } from "../../../../test-fixtures/product-variants/embroidery-summary-page";\n'
created=os.environ.get('OFISSIO_TEST_FIXTURES_READY')!='1'
if created:
 assert not route_file.exists();route_file.parent.mkdir();route_file.write_text(template)
def cleanup():
 if created and route_file.exists() and route_file.read_text()==template:route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
session={'user':{'id':'fixture-user','role':'customer_admin','email':'fixture@example.test','fullName':'Customer Fixture'},'company':{'id':'fixture-company','companyName':'Fixture Company','addresses':[],'phone':'081234567890','picName':'Customer Fixture','picEmail':'fixture@example.test','picWhatsapp':'081234567890','industry':'Corporate','employeeCount':8}}
def svg(color,letter):return f'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" rx="12" fill="{color}"/><text x="60" y="56" font-size="48" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="white">{letter}</text></svg>'.encode()
images={'logo-a':svg('#142766','M'),'logo-b':svg('#b42318','C')};errors=[];writes=[];checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for width in [1440,390,320]:
  print('Summary check',width,flush=True)
  context=browser.new_context(viewport={'width':width,'height':1100},reduced_motion='reduce')
  requested=[];denied=set();library_requests=[]
  def api(route):
   request=route.request;url=urlparse(request.url)
   if url.path=='/api/auth/session':route.fulfill(json={'ok':True,'provider':'supabase','session':{'kind':'customer','session':session}});return
   if '/signed-url' in url.path:
    file_id=url.path.split('/')[3];requested.append(file_id);assert file_id in images,file_id
    if file_id in denied:route.fulfill(status=404,json={'ok':False});return
    route.fulfill(json={'ok':True,'fileId':file_id,'signedUrl':f'/fixture-logo/{file_id}.svg'});return
   if url.path=='/api/company/logos':library_requests.append(url.path)
   if request.method not in ['GET','HEAD','OPTIONS']:writes.append(request.url)
   route.fulfill(json={'ok':True,'items':[],'files':[],'orders':[],'notifications':[],'company':session['company'],'addresses':[]})
  context.route('**/api/**',api)
  context.route('**/fixture-logo/*.svg',lambda route:route.fulfill(content_type='image/svg+xml',body=images[Path(urlparse(route.request.url).path).stem]))
  page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+path,wait_until='networkidle',timeout=120000)
  def seed(label,expected_id):
   button=page.get_by_role('button',name=label,exact=True)
   page.wait_for_function("label=>Array.from(document.querySelectorAll('button')).some(e=>e.textContent===label&&Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onClick==='function'))",arg=label)
   button.click()
   page.wait_for_function("id=>JSON.parse(localStorage.getItem('ofissio-cart-v1')).state.items[0].id===id",arg=expected_id)
  def verify(scope,count=2):
   scope.scroll_into_view_if_needed()
   logos=scope.get_by_role('img',name=re.compile('^Logo Dada'))
   expect(logos).to_have_count(count)
   for position,file_id in [('Dada Kiri','logo-a'),('Dada Kanan','logo-b')][-count:]:
    image=scope.get_by_role('img',name=f'Logo {position} — Logo Perusahaan Final.svg',exact=True)
    image.scroll_into_view_if_needed();expect(image).to_have_attribute('src',f'/fixture-logo/{file_id}.svg');image.evaluate('img=>img.decode()')
   expect(scope.get_by_role('img',name=re.compile('Punggung'))).to_have_count(0)
  for label in ['Fixture tracking','Fixture quotation','Fixture admin']:
   scope=page.get_by_role('region',name=label,exact=True);verify(scope)
   expect(scope).to_contain_text('NAMA TIM');expect(scope).to_contain_text('Logo biru di dada kiri.')
  seed('Isi keranjang','summary-fixture')
  page.wait_for_function("JSON.parse(localStorage.getItem('ofissio-cart-v1')).state.items.length===1")
  for destination in ['/cart','/checkout']:
   print('Actual page',width,destination,flush=True)
   # Render the real checkout component in the fixture; /checkout middleware requires a real server session.
   target=path+'?view=checkout' if destination=='/checkout' else destination
   page.goto(base+target,wait_until='networkidle',timeout=120000)
   group=page.get_by_role('group',name='Ringkasan bordir',exact=True).first
   try:expect(group).to_have_attribute('open','')
   except Exception:
    print(page.url,page.locator('body').inner_text()[:2000],flush=True);page.screenshot(path=str(out/'failure.png'));raise
   verify(group)
   expect(group).to_contain_text('NAMA TIM');expect(group).to_contain_text('Logo biru di dada kiri.');expect(group).to_contain_text('7 × 4 cm')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,destination)
   group.screenshot(path=str(out/f'{destination.strip("/")}-{width}.png'))
   page.screenshot(path=str(out/f'{destination.strip("/")}-page-{width}.png'),style='nextjs-portal{visibility:hidden!important}')
  page.goto(base+path,wait_until='networkidle')
  seed('Isi keranjang 3D lama','legacy-fixture')
  for destination in ['/cart','/checkout']:
   page.goto(base+(path+'?view=checkout' if destination=='/checkout' else destination),wait_until='networkidle')
   verify(page.get_by_role('group',name='Ringkasan bordir',exact=True).first,1)
  page.goto(base+path,wait_until='networkidle');seed('Isi keranjang','summary-fixture')
  denied.add('logo-a')
  page.goto(base+'/cart',wait_until='networkidle')
  group=page.get_by_role('group',name='Ringkasan bordir',exact=True).first
  left_row=group.locator('li').filter(has=page.get_by_text('Dada Kiri',exact=True))
  expect(left_row.get_by_text('Pratinjau tidak tersedia',exact=True)).to_be_visible()
  expect(group.get_by_role('img',name=re.compile('^Logo Dada Kiri'))).to_have_count(0)
  image=group.get_by_role('img',name=re.compile('^Logo Dada Kanan'));image.scroll_into_view_if_needed();image.evaluate('img=>img.decode()')
  assert not library_requests,'Summary previews must never guess a file from its filename'
  assert set(requested)=={'logo-a','logo-b'}
  checks.append({'width':width,'actualCartThumbnails':True,'checkoutComponentThumbnails':True,'quotationAndTrackingThumbnails':True,'adminSignedPreviews':True,'summaryOpenByDefault':True,'sameFilenameResolvedById':True,'legacy3DFallback':True,'textEmbroideryAndNotesPreserved':True,'unavailableLogoHasFallback':True,'noOverflow':True})
  context.close()
 # Internal admin previews are server-signed and must render without a customer session.
 context=browser.new_context(viewport={'width':390,'height':1100})
 context.route('**/api/**',lambda route:route.fulfill(json={'ok':True,'provider':'supabase','session':None,'items':[],'files':[]}))
 context.route('**/fixture-logo/*.svg',lambda route:route.fulfill(content_type='image/svg+xml',body=images[Path(urlparse(route.request.url).path).stem]))
 page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.goto(base+path,wait_until='networkidle')
 scope=page.get_by_role('region',name='Fixture admin',exact=True)
 for image in scope.get_by_role('img',name=re.compile('^Logo Dada')).all():image.scroll_into_view_if_needed();image.evaluate('img=>img.decode()')
 expect(scope.get_by_role('img',name=re.compile('^Logo Dada'))).to_have_count(2)
 context.close();browser.close()
assert not errors,errors
assert not writes,writes
result={'status':'passed','checks':checks,'adminWithoutCustomerSession':True,'browserErrors':errors,'realWrites':0};(out/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
