"""Reproduce tall-description / expanding purchase-column geometry; APIs read-only mocked."""
import atexit,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('OFISSIO_TEST_OUT',str(root/'artifacts/embroidery-login-continuation/scroll')));out.mkdir(parents=True,exist_ok=True)
route_file=root/'src/app/product/embroidery-scroll-fixture/page.tsx';template='export { default } from "../../../../test-fixtures/product-variants/embroidery-scroll-page";\n'
created=os.environ.get('OFISSIO_TEST_FIXTURES_READY')!='1'
if created:
 assert not route_file.exists();route_file.parent.mkdir();route_file.write_text(template,encoding='utf-8')
def cleanup():
 if created and route_file.exists() and route_file.read_text(encoding='utf-8')==template:route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
errors=[];writes=[];checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for width in [1920,1440,390,320]:
  print('Scroll regression',width,flush=True)
  page=browser.new_page(viewport={'width':width,'height':1080 if width>500 else 844},reduced_motion='reduce')
  page.on('pageerror',lambda error:errors.append(str(error)))
  def api(route):
   if route.request.method not in ['GET','HEAD','OPTIONS']:writes.append(route.request.url)
   route.fulfill(json={'ok':True,'provider':'supabase','session':None,'files':[],'items':[]})
  page.route('**/api/**',api)
  page.goto(os.environ.get('OFISSIO_TEST_BASE','http://localhost:8029')+'/product/embroidery-scroll-fixture',wait_until='networkidle',timeout=120000)
  page.wait_for_function("Array.from(document.querySelectorAll('input[type=number]')).some(e=>Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onChange==='function'))")
  panel=page.get_by_role('region',name='Pilihan bordir produk',exact=True)
  toggle=panel.get_by_role('button',name='Tambahkan bordir Opsional',exact=True)
  toggle.click();expect(toggle).to_have_attribute('aria-expanded','true')
  target=300 if width>500 else 120
  panel.evaluate('(el,target)=>{const s=document.querySelector("[data-workspace-scroll]");s.scrollTop+=el.getBoundingClientRect().top-target}',target)
  def measure():return panel.evaluate('''el=>({top:el.getBoundingClientRect().top,scrollTop:document.querySelector('[data-workspace-scroll]').scrollTop,position:getComputedStyle(el.closest('.storefront-product-panel').parentElement).position,leftTop:document.querySelector('.rich-text')?.getBoundingClientRect().top,editorTop:el.querySelector('[data-configuration-editor]')?.getBoundingClientRect().top})''')
  before=measure();assert before['position']!='sticky',before
  page.screenshot(path=str(out/f'before-{width}.png'),style='nextjs-portal{visibility:hidden!important}')
  positions=panel.locator('[aria-label="Pilih posisi bordir"]')
  positions.get_by_role('button',name='Dada Kiri',exact=True).click()
  expect(panel.get_by_role('heading',name='Dada Kiri',exact=True)).to_be_focused()
  expect(panel.get_by_role('region',name='Pengaturan Dada Kiri')).to_be_visible()
  after=measure()
  assert abs(before['top']-after['top'])<2,(width,before,after)
  assert abs(before['scrollTop']-after['scrollTop'])<2,(width,before,after)
  if width>500:assert abs(before['leftTop']-after['leftTop'])<2
  expect(positions.get_by_role('button',name='Dada Kiri',exact=True)).to_be_in_viewport()
  expect(positions.get_by_role('button',name='Dada Kanan',exact=True)).to_be_in_viewport()
  expect(panel.get_by_role('heading',name='Dada Kiri',exact=True)).to_be_in_viewport()
  page.screenshot(path=str(out/f'after-{width}.png'),style='nextjs-portal{visibility:hidden!important}')
  positions.get_by_role('button',name='Dada Kanan',exact=True).click()
  expect(panel.get_by_role('heading',name='Dada Kanan',exact=True)).to_be_in_viewport()
  assert abs(measure()['top']-before['top'])<2
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  checks.append({'width':width,'panelShift':round(after['top']-before['top'],2),'scrollShift':round(after['scrollTop']-before['scrollTop'],2),'positionButtonsAndFormVisible':True,'normalFlow':True})
  page.close()
 browser.close()
assert not errors,errors
assert not writes,writes
result={'status':'passed','checks':checks,'browserErrors':errors,'realWrites':0};(out/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
