from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, base64
out=Path('.artifacts/chat-context');out.mkdir(parents=True,exist_ok=True)
cid='11111111-1111-4111-8111-111111111111';rid='22222222-2222-4222-8222-222222222222'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True); reports=[]
 for width in [2560,1920,1366,390]:
  context=browser.new_context(viewport={'width':width,'height':950})
  profile={'name':'Deny','email':'deny@example.test','whatsapp':'08123456789','notes':'PIC pengadaan seragam. Memerlukan sampel fisik sebelum order massal.'}
  conversation={'id':cid,'customerName':'Deny','status':'active','staffId':'staff-1','staffName':'Staf','updatedAt':'2026-11-07T08:00:00Z'}
  messages=[{'id':'ai-example','sequence':1,'role':'assistant','name':'Ofistant AI','text':'Halo! Ada yang bisa Ofistant bantu mengenai layanan Ofissio hari ini?','ts':1794038400000,'context':True},{'id':'user-example','sequence':2,'role':'user','name':'Deny','text':'Halo, saya butuh panduan ukuran untuk kemeja seragam kantor yang baru.','ts':1794038460000,'context':False},{'id':'system-example','sequence':3,'role':'system','name':'Ofissio','text':'Percakapan diambil alih oleh Anda','ts':1794038520000,'context':False}];sent=[]; archived=[]
  def route(r):
   from urllib.parse import urlparse,parse_qs
   u=urlparse(r.request.url);q=parse_qs(u.query);path=u.path
   if path.endswith('/material'):
    r.fulfill(content_type='image/png',body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII='));return
   if path=='/api/admin/chats/context':
    if r.request.method=='POST':
     data=r.request.post_data_json
     if data['action']=='profile':profile.update(data['profile']);conversation['customerName']=profile['name']
     elif data['action']=='send':
      sent.append(data);card={'kind':'product' if data['kind']=='product' else 'pdf','title':'Kemeja Ofissio' if data['kind']=='product' else 'Panduan bordir','resourceId':rid,'url':'/product/kemeja','price':85000}
      messages.append({'id':data['messageId'],'sequence':len(messages)+1,'role':'staff','name':'Staf','text':card['title'],'ts':1794038400000,'context':False,'attachment':card})
     r.fulfill(json={'ok':True});return
    tab=q.get('tab',['orders'])[0]
    result=[{'id':'p1','title':'Kemeja Ofissio','price':85000,'url':'/product/kemeja'}] if tab=='products' else [{'id':rid,'title':'Panduan bordir','kind':'pdf','category':'Panduan','active':True},{'id':'chart:verified','title':'Ukuran kemeja','kind':'chart','category':'Ukuran','active':True}] if tab=='materials' else {'profile':profile,'orders':[{'id':'o1','number':'OFS-001','status':'completed','date':'2026-11-07','total':85000,'products':[{'name':'Kemeja Ofissio','image':'/api/admin/chats/material?id=order-thumbnail'},{'name':'Produk tanpa gambar','image':None}]}],'moreOrders':False}
    r.fulfill(json={'result':result});return
   if path=='/api/admin/chats':
    if 'conversationId' in q:r.fulfill(json={'ok':True,'result':{'conversation':conversation,'messages':[m for m in messages if m['sequence']>int(q.get('after',['0'])[0])],'next':len(messages),'more':False}})
    else:r.fulfill(json={'ok':True,'result':{'conversations':[conversation]}})
    return
   if path.endswith('/notifications/summary'):r.fulfill(json={'totalUnread':0,'latestNotifications':[],'latestChatNotifications':[]});return
   if path.endswith('/push-subscription'):r.fulfill(json={'configured':False});return
   if path.startswith('/api/'):r.fulfill(json={'ok':True});return
   r.continue_()
  context.route('**/api/**',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8054/notice-demo?conversation='+cid,wait_until='networkidle')
  expect(page.get_by_role('heading',name='Deny',exact=True)).to_be_visible(timeout=60000)
  if width<=1500:page.get_by_role('button',name='Info customer',exact=True).click()
  panel=page.get_by_role('complementary',name='Informasi customer')
  expect(panel.get_by_text('OFS-001',exact=True)).to_be_visible()
  if width>1500:
   assert page.locator('[class*=customerMessage] [class*=bubble]').first.evaluate('(el)=>getComputedStyle(el).fontSize')=='14px'
   assert panel.locator('[class*=notes] p').evaluate('(el)=>getComputedStyle(el).fontSize')=='14px'
  expect(panel.get_by_role('img',name='Kemeja Ofissio',exact=True)).to_be_visible()
  expect(panel.get_by_role('img',name='Gambar Produk tanpa gambar tidak tersedia',exact=True)).to_be_visible()
  if width>1500:assert panel.bounding_box()['width']>=460
  page.screenshot(path=str(out/f'orders-{width}.png'),full_page=True)
  panel.get_by_role('button',name='Edit customer',exact=True).click()
  panel.get_by_label('Nama tampilan',exact=True).fill('Deny Suhartana')
  panel.get_by_label('WhatsApp',exact=True).fill('08123456789')
  panel.get_by_label('Catatan internal',exact=True).fill('Customer seragam kantor')
  panel.get_by_role('button',name='Simpan',exact=True).click()
  expect(panel.get_by_text('Informasi customer disimpan.',exact=True)).to_be_visible()
  assert profile['name']=='Deny Suhartana' and profile['email']=='deny@example.test'
  panel.get_by_role('button',name='Produk',exact=True).click()
  panel.get_by_role('button',name='Kirim ke chat',exact=True).click()
  expect(panel.get_by_text('Berhasil dikirim ke chat.',exact=True)).to_be_visible();assert len(sent)==1
  panel.get_by_role('button',name='Pusat Informasi',exact=True).click()
  expect(panel.get_by_text('Panduan bordir',exact=True)).to_be_visible()
  page.screenshot(path=str(out/f'faithful-{width}.png'),full_page=True)
  panel.get_by_role('button',name='Favorit Panduan bordir',exact=True).click()
  panel.get_by_role('button',name='Favorit',exact=True).click()
  expect(panel.get_by_text('Ukuran kemeja',exact=True)).to_have_count(0)
  panel.get_by_role('button',name='Pratinjau Panduan bordir',exact=True).click()
  expect(page.get_by_role('dialog')).to_be_visible()
  page.get_by_role('dialog').get_by_role('button',name='Kirim ke chat',exact=True).click()
  expect(page.get_by_role('dialog')).not_to_be_visible();assert len(sent)==2
  assert sent[0]['messageId']!=sent[1]['messageId']
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
  page.screenshot(path=str(out/f'context-{width}.png'),full_page=True)
  if width<=1500:panel.get_by_role('button',name='Tutup informasi customer').click()
  expect(page.get_by_role('link',name='Lihat produk',exact=True)).to_be_visible()
  expect(page.get_by_role('link',name='Buka / unduh',exact=True)).to_be_visible()
  assert not errors,errors
  reports.append({'width':width,'profileEdit':True,'orders':True,'productSend':True,'materialPreviewSend':True,'favorites':True,'noOverflow':True})
  context.close()
 browser.close();(out/'browser-results.json').write_text(json.dumps(reports,indent=2));print(json.dumps(reports))
