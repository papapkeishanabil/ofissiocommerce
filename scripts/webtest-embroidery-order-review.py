"""Exercise the real review/checkout/cart components. All APIs are intercepted."""
import json,os,re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect

out=Path(os.environ['REVIEW_TEST_OUT']);out.mkdir(parents=True,exist_ok=True)
base=os.environ['REVIEW_TEST_BASE'].rstrip('/')
meta=json.loads(Path(os.environ['REVIEW_TEST_RELEASE']).read_text())
fixture='/product/embroidery-review-fixture'
session={'user':{'id':'fixture-user','role':'customer_admin','email':'fixture@example.test','fullName':'Customer Fixture'},'company':{'id':'fixture-company','companyName':'Fixture Company','addresses':[],'phone':'081234567890','picName':'Customer Fixture','picEmail':'fixture@example.test','picWhatsapp':'081234567890','industry':'Corporate','employeeCount':8}}
errors=[];unexpected=[];payloads=[];checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for width in [1440,390,320]:
  print('Review check',width,flush=True)
  context=browser.new_context(viewport={'width':width,'height':1100},reduced_motion='reduce')
  def api(route):
   request=route.request;path=urlparse(request.url).path
   if path=='/api/auth/session':route.fulfill(json={'ok':True,'provider':'supabase','session':{'kind':'customer','session':session}});return
   if '/signed-url' in path:
    file_id=path.split('/')[3];assert file_id in ['logo-a','logo-b']
    route.fulfill(json={'ok':True,'fileId':file_id,'signedUrl':f'/fixture-logo/{file_id}.svg'});return
   if path=='/api/quotation/request':
    assert request.method=='POST';payloads.append(request.post_data_json)
    route.fulfill(status=400,json={'ok':False,'message':'Fixture: permintaan tercatat dalam pengujian.'});return
   if request.method not in ['GET','HEAD','OPTIONS']:unexpected.append(request.url)
   route.fulfill(json={'ok':True,'items':[],'files':[],'orders':[],'notifications':[],'company':session['company'],'addresses':[]})
  context.route('**/api/**',api)
  def logo(route):
   file_id=Path(urlparse(route.request.url).path).stem
   color,letter=('#142766','M') if file_id=='logo-a' else ('#b42318','C')
   route.fulfill(content_type='image/svg+xml',body=f'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="{color}"/><text x="60" y="56" text-anchor="middle" font-size="48" fill="white">{letter}</text></svg>')
  context.route('**/fixture-logo/*.svg',logo)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  def seed(kind):
   page.goto(base+fixture,wait_until='networkidle',timeout=120000)
   page.wait_for_function("kind=>Array.from(document.querySelectorAll('button')).some(e=>e.textContent===kind&&Object.keys(e).some(k=>k.startsWith('__reactProps')&&typeof e[k]?.onClick==='function'))",arg=kind)
   page.get_by_role('button',name=kind,exact=True).click()
   expect(page.get_by_role('heading',name='Tinjau Pesanan Bordir',exact=True)).to_be_visible()
  def complete_review():
   expect(page.get_by_text('Jenis kebutuhan',exact=True)).to_have_count(0)
   row=page.get_by_role('listitem',name='Rincian Kemeja Kantor Wanita SN-Basic - Pink-Red Series',exact=True)
   for text in ['SKU: SN-MERAH-CABE','Warna: Merah Cabe · 8 pcs','Jumlah per ukuran','Lengan: Panjang','Pisahkan per ukuran.','Rp 680.000','Rp 160.000']:
    expect(row).to_contain_text(text)
   expect(row.get_by_text('4 pcs',exact=True)).to_have_count(2)
   group=row.get_by_role('group',name='Ringkasan bordir',exact=True)
   expect(group).to_have_attribute('open','')
   for position,file_id in [('Dada Kiri','logo-a'),('Dada Kanan','logo-b')]:
    img=group.get_by_role('img',name=f'Logo {position} — Logo Final.svg',exact=True)
    img.scroll_into_view_if_needed();expect(img).to_have_attribute('src',f'/fixture-logo/{file_id}.svg');img.evaluate('img=>img.decode()')
   for text in ['TIM OFISSIO','Jangan melewati saku.','Rata dengan dada kiri.','7 × 4 cm']:expect(group).to_contain_text(text)
   expect(page.get_by_text('Rp 92.400',exact=True)).to_be_visible()
   expect(page.get_by_text('Rp 932.400',exact=True)).to_be_visible()
   expect(page.locator('#quote-notes')).to_have_value('Hubungi PIC sebelum kirim.')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  for kind in ['recommended','manual','legacy','unpriced']:
   seed(kind);complete_review()
   if kind in ['recommended','unpriced']:
    expect(page.get_by_role('button',name='Lanjut ke checkout',exact=True)).to_have_count(0)
    if kind=='recommended':expect(page.get_by_role('group',name='Ringkasan bordir')).to_contain_text('Diserahkan kepada Ofissio')
    button=page.get_by_role('button',name='Kirim untuk konfirmasi',exact=True)
   else:
    expect(page.get_by_role('button',name='Lanjut ke checkout',exact=True)).to_be_visible()
    button=page.get_by_role('button',name='Minta penawaran resmi',exact=True)
   note='n'*999+'!';page.locator('#quote-notes').fill(note)
   button.click();expect(page.get_by_role('alert').filter(has_text='Fixture: permintaan tercatat')).to_be_visible()
   payload=payloads[-1];assert payload['customerNotes']==note
   assert payload['requirementType']=='standard_customization'
   item=payload['items'][0];assert item['sizeMatrix']['S']==4 and item['sizeMatrix']['M']==4
   assert item['selectedOptions']=={'Warna':'Merah Cabe','Lengan':'Panjang'}
   assert item['customization']=='Pisahkan per ukuran.'
   placements=item['embroideryPlacements'];assert len(placements)==3
   assert [p['logoFileId'] for p in placements[:2]]==['logo-a','logo-b']
   assert placements[0]['notes']=='Jangan melewati saku.' and placements[2]['textBordir']['name']=='TIM OFISSIO'
   if kind=='recommended':assert placements[0]['sizingMode']=='ofissio' and placements[0]['widthCm'] is None
   else:assert placements[0]['widthCm']==8
   page.screenshot(path=str(out/f'review-{kind}-{width}.png'),full_page=True)
  seed('manual')
  page.goto(base+fixture+'?view=checkout',wait_until='networkidle')
  expect(page.get_by_text('Detail atau biaya bordir memerlukan konfirmasi Ofissio sebelum pembayaran.',exact=True)).to_have_count(0)
  expect(page.get_by_role('group',name='Ringkasan bordir')).to_contain_text('8 × 5 cm')
  seed('recommended')
  page.goto(base+fixture+'?view=checkout',wait_until='networkidle')
  expect(page.get_by_text('Detail atau biaya bordir memerlukan konfirmasi Ofissio sebelum pembayaran.',exact=True)).to_be_visible()
  page.goto(base+'/cart',wait_until='networkidle')
  expect(page.get_by_role('button',name=re.compile('^Tinjau Pesanan Bordir$'))).to_have_count(2)
  page.get_by_role('button',name='Tinjau Pesanan Bordir',exact=True).first.click()
  page.wait_for_url('**/quote',timeout=30000)
  expect(page.get_by_role('heading',name='Tinjau Pesanan Bordir')).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  checks.append({'width':width,'completeReview':True,'logosResolvedByFileId':True,'sizeBreakdownAndNotes':True,'taxTotalMatchesCart':True,'allFourRoutes':True,'legacyPayload':True,'thousandCharacterNotes':True,'checkoutGuard':True,'cartToReview':True,'noOverflow':True})
  context.close()
 browser.close()
assert not errors,errors
assert not unexpected,unexpected
result={'status':'passed','testedCommit':meta['commit'],'checks':checks,'browserErrors':errors,'interceptedSubmissions':len(payloads),'realWrites':0}
(out/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
