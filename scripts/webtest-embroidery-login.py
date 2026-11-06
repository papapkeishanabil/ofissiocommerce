"""Mock email/registration/OAuth round trips. No real accounts or uploads."""
import atexit,json,re,os
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('OFISSIO_TEST_OUT',str(root/'artifacts/embroidery-login-continuation')));out.mkdir(parents=True,exist_ok=True)
route_file=root/'src/app/product/embroidery-login-fixture/page.tsx'
template='export { default } from "../../../../test-fixtures/product-variants/embroidery-without-3d-page";\n'
created=os.environ.get('OFISSIO_TEST_FIXTURES_READY')!='1' and not route_file.exists()
if created:route_file.parent.mkdir(parents=True);route_file.write_text(template,encoding='utf-8')
def cleanup():
 if created and route_file.exists() and route_file.read_text(encoding='utf-8')==template:
  route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
base=os.environ.get('OFISSIO_TEST_BASE','http://localhost:8029');path='/product/embroidery-login-fixture?next=%2Fcart&campaign=fixture'
session={'user':{'id':'fixture-user','role':'customer_admin','email':'fixture@example.test','fullName':'Customer Fixture'},'company':{'id':'fixture-company','companyName':'Fixture Company','addresses':[]}}
checks=[];errors=[];unexpected=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 cases=[(width,flow) for width in [1440,390,320] for flow in ['email','google']]+[(390,'register'),(390,'header')]
 for width,flow in cases:
  print('Checking',width,flow,flush=True)
  context=browser.new_context(viewport={'width':width,'height':1000 if width>500 else 844},reduced_motion='reduce')
  page=context.new_page();page.set_default_timeout(30000);page.on('pageerror',lambda e:errors.append(str(e)))
  state={'authed':False,'attempts':0,'googleNext':None}
  def api(route):
   request=route.request;url=urlparse(request.url)
   if url.path=='/api/auth/session':route.fulfill(json={'ok':True,'provider':'supabase','session':{'kind':'customer','session':session} if state['authed'] else None});return
   if url.path=='/api/auth/login':
    state['attempts']+=1
    if state['attempts']==1:route.fulfill(status=401,json={'ok':False,'message':'Fixture password salah'});return
    state['authed']=True;route.fulfill(json={'ok':True,'kind':'customer','session':session});return
   if url.path=='/api/auth/register':state['authed']=True;route.fulfill(json={'ok':True,'kind':'customer','session':session});return
   if url.path=='/api/auth/google':
    state['googleNext']=parse_qs(url.query)['next'][0];state['authed']=True
    route.fulfill(json={'url':base+state['googleNext']});return
   if request.method not in ['GET','HEAD','OPTIONS']:unexpected.append(request.url)
   route.fulfill(json={'ok':True,'files':[],'items':[],'notifications':[]})
  context.route('**/api/**',api)
  page.goto(base+path,wait_until='networkidle',timeout=120000)
  page.wait_for_function("Array.from(document.querySelectorAll('input[type=number]')).some(e=>Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onChange==='function'))")
  page.get_by_role('spinbutton',name='Quantity ukuran S',exact=True).fill('4');expect(page.locator('[data-part=total-value]')).to_have_text('4 pcs')
  page.get_by_role('spinbutton',name='Quantity ukuran M',exact=True).fill('4');expect(page.locator('[data-part=total-value]')).to_have_text('8 pcs')
  page.get_by_role('textbox',name='Catatan pesanan',exact=True).fill('Pisahkan per ukuran.')
  panel=page.get_by_role('region',name='Pilihan bordir produk',exact=True)
  panel.get_by_role('button',name=re.compile('^Tambahkan bordir')).click()
  panel.get_by_role('button',name='Punggung Atas',exact=True).click()
  panel.get_by_role('radio',name='Tulisan / nama',exact=True).check()
  panel.get_by_role('textbox',name=re.compile('Nama untuk preview')).fill('NAMA TIM')
  panel.get_by_role('button',name='Terapkan ke preview',exact=True).click()
  panel.get_by_role('button',name='Simpan bordir punggung atas',exact=True).click()
  panel.get_by_role('button',name='Dada Kanan',exact=True).click()
  editor=panel.get_by_role('region',name='Pengaturan Dada Kanan',exact=True)
  expect(editor.get_by_role('heading',name='Dada Kanan',exact=True)).to_be_focused()
  page.wait_for_function("(()=>{const e=document.querySelector('[data-configuration-editor]');const panel=e.closest('[aria-label=\"Pilihan bordir produk\"]');const top=document.querySelector('[data-workspace-scroll]').getBoundingClientRect().top;return panel.getBoundingClientRect().top>=top&&e.getBoundingClientRect().top<innerHeight-140})()")
  editor.get_by_role('radio',name='Atur ukuran sendiri').check()
  editor.get_by_role('spinbutton',name='Lebar (cm)').fill('7')
  editor.get_by_role('spinbutton',name='Tinggi (cm)').fill('4')
  editor.get_by_role('textbox',name='Catatan posisi (opsional)').fill('Di atas saku kanan.')
  login=editor.get_by_role('button',name='Masuk / Daftar',exact=True)
  login.scroll_into_view_if_needed();expect(login).to_be_visible()
  colors=login.evaluate('(e)=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})')
  assert colors=={'background':'rgb(20, 39, 102)','color':'rgb(255, 255, 255)'},colors
  before_top=editor.evaluate('(e)=>e.getBoundingClientRect().top')
  if flow=='header':page.locator('button[aria-label="Masuk"]:visible').first.click()
  else:login.click()
  dialog=page.get_by_role('dialog');expect(dialog).to_be_visible()
  if flow=='google':
   dialog.get_by_role('button',name='Lanjutkan dengan Google',exact=True).click()
   page.wait_for_load_state('networkidle')
   assert state['googleNext']==path,state['googleNext']
  elif flow=='register':
   dialog.get_by_role('button',name='Daftar',exact=True).click()
   dialog.locator('#reg-name').fill('Customer Fixture');dialog.locator('#reg-email').fill('fixture@example.test');dialog.locator('#reg-wa').fill('081234567890')
   dialog.locator('#reg-password').fill('FixturePass123');dialog.locator('#reg-confirm').fill('FixturePass123')
   dialog.locator('button[type=submit]').click()
  else:
   dialog.locator('#login-email').fill('fixture@example.test');dialog.locator('#login-password').fill('FixturePass123')
   dialog.locator('button[type=submit]').click();expect(dialog.get_by_role('alert')).to_contain_text('Fixture password salah')
   assert page.url==base+path
   dialog.locator('button[type=submit]').click()
  expect(page.get_by_role('dialog')).to_have_count(0)
  expect(editor).to_be_visible();expect(editor.get_by_role('button',name=re.compile('^Unggah Logo'))).to_be_enabled()
  assert page.url==base+path,page.url
  expect(panel.get_by_role('button',name='Dada Kanan',exact=True)).to_have_attribute('aria-pressed','true')
  expect(editor.get_by_role('spinbutton',name='Lebar (cm)')).to_have_value('7')
  expect(editor.get_by_role('spinbutton',name='Tinggi (cm)')).to_have_value('4')
  expect(editor.get_by_role('textbox',name='Catatan posisi (opsional)')).to_have_value('Di atas saku kanan.')
  expect(panel.get_by_label('Ringkasan bordir tersimpan')).to_contain_text('NAMA TIM')
  expect(page.get_by_role('spinbutton',name='Quantity ukuran S',exact=True)).to_have_value('4')
  expect(page.get_by_role('spinbutton',name='Quantity ukuran M',exact=True)).to_have_value('4')
  expect(page.get_by_role('textbox',name='Catatan pesanan',exact=True)).to_have_value('Pisahkan per ukuran.')
  page.wait_for_function('sessionStorage.getItem("ofissio-configuration-login-v1")===null')
  after_top=editor.evaluate('(e)=>e.getBoundingClientRect().top')
  assert abs(after_top-before_top)<15,(flow,width,before_top,after_top)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if flow=='email':editor.screenshot(path=str(out/f'logged-in-{width}.png'),style='nextjs-portal{visibility:hidden!important}')
  checks.append({'width':width,'flow':flow,'loginButtonVisible':True,'sameProductAndZone':True,'draftAndSizesPreserved':True,'savedPositionsPreserved':True,'scrollDelta':round(after_top-before_top,1),'noUnexpectedRedirect':True})
  context.close()
 browser.close()
assert not errors,errors
assert not unexpected,unexpected
result={'status':'passed','checks':checks,'browserErrors':errors,'realWrites':0}
(out/'browser-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
