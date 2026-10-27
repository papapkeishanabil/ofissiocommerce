"""Verify legacy and flexible color pickers using synthetic products and mocked APIs."""
import atexit,json,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1]
route_file=root/'src/app/color-picker-verification/page.tsx'
template=(root/'test-fixtures/product-variants/color-picker-page.tsx').read_text(encoding='utf-8')
assert not route_file.exists(),'Temporary route already exists'
route_file.parent.mkdir(parents=True)
route_file.write_text(template,encoding='utf-8')
def cleanup():
 if route_file.exists() and route_file.read_text(encoding='utf-8')==template:
  route_file.unlink();route_file.parent.rmdir()
atexit.register(cleanup)
out=root/'artifacts/series-color-design/verification';out.mkdir(exist_ok=True)
errors=[];stock_queries=[];writes=[]
def api(route):
 if route.request.method not in ['GET','HEAD']:
  writes.append(route.request.url);route.fulfill(status=409,json={'ok':False});return
 if '/size-stock' in route.request.url:
  stock_queries.append(route.request.url)
  route.fulfill(json={'ok':True,'stock':{'color':'Milo','source':'ginee','checkedAt':'2026-10-27T00:00:00Z','rows':[{'size':size,'sku':'TEST-'+size,'availableQty':20} for size in ['S','M']]}})
 else:route.fulfill(json={'ok':True,'session':None,'notifications':[],'promotions':[],'items':[]})
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.route('**/api/**',api)
 page.route('https://images.example/**',lambda route:route.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><path fill="#987654" d="M40 10L10 35L25 60L35 50V150H85V50L95 60L110 35L80 10L60 25Z"/></svg>'))
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:8000/color-picker-verification',wait_until='networkidle',timeout=120000)
 group=page.get_by_role('group',name='Pilihan warna',exact=True)
 expect(group.locator('button')).to_have_count(3)
 coksu=group.get_by_role('button',name='Pilih warna Coksu',exact=True)
 milo=group.get_by_role('button',name='Pilih warna Milo',exact=True)
 bronze=group.get_by_role('button',name='Pilih warna Bronze',exact=True)
 expect(coksu.locator('img')).to_have_attribute('src','https://images.example/Coksu-Pendek.svg')
 expect(bronze.locator('img')).to_have_count(0)
 expect(bronze.locator('span[aria-hidden=true]')).to_have_css('background-color','rgb(152, 118, 84)')
 expect(page.get_by_text('Warna: Coksu',exact=True)).to_be_visible()
 quantity=page.get_by_role('spinbutton',name='Quantity ukuran S',exact=True)
 quantity.fill('2')
 milo.click()
 expect(milo).to_have_attribute('aria-pressed','true')
 expect(coksu).to_have_attribute('aria-pressed','false')
 expect(quantity).to_have_value('')
 expect(page.get_by_text('Warna: Milo',exact=True)).to_be_visible()
 expect(page.locator('[aria-label="Galeri foto produk"] img').last).to_have_attribute('src','https://images.example/Milo-Pendek.svg')
 page.get_by_role('button',name='Panjang',exact=True).click()
 expect(milo.locator('img')).to_have_attribute('src','https://images.example/Milo-Panjang.svg')
 expect(page.locator('[aria-label="Galeri foto produk"] img').last).to_have_attribute('src','https://images.example/Milo-Panjang.svg')
 expect(page.locator('.storefront-product-price')).to_contain_text('120.000')
 quantity.fill('2')
 expect(page.get_by_text('SKU: TEST-Milo-Panjang-S',exact=True)).to_be_visible()
 bronze.focus();page.keyboard.press('Enter')
 expect(bronze).to_have_attribute('aria-pressed','true')
 expect(quantity).to_have_value('')
 for width in [1440,390,320]:
  page.set_viewport_size({'width':width,'height':1000})
  group.scroll_into_view_if_needed()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
  group.screenshot(path=str(out/f'flexible-{width}.png'))
 classes=bronze.get_attribute('class')
 page.goto('http://127.0.0.1:8000/color-picker-verification?mode=legacy',wait_until='networkidle',timeout=120000)
 expect(group.locator('button')).to_have_count(3)
 expect(milo.locator('img')).to_have_count(1)
 bronze.click()
 expect(bronze).to_have_attribute('aria-pressed','true')
 assert bronze.get_attribute('class')==classes,'Legacy and generic buttons must share presentation'
 expect(page.get_by_text('SKU: LEGACY-Bronze',exact=True).first).to_be_visible()
 group.screenshot(path=str(out/'legacy-320.png'))
 assert any('Milo' in url and 'Panjang' in url for url in stock_queries),stock_queries
 assert not errors,errors
 assert not writes,writes
 result={'status':'passed','widths':[1440,390,320],'checks':['one button per color across sizes','matching sleeve thumbnails','saved RGB fallback','keyboard selection','gallery and price update','size reset and selected SKU','stock selection query','same legacy and flexible presentation'],'browserErrors':errors,'realWrites':0}
 (out/'verification.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result),flush=True)
 browser.close()
