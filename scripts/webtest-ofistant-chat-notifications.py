from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
out=Path('.artifacts/ofistant-chat-notifications');out.mkdir(exist_ok=True);checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 for width in [1440,390]:
  mode={'count':0,'unauthorized':False,'requests':0}
  context=b.new_context(viewport={'width':width,'height':950},extra_http_headers={'x-ofissio-internal-role':'sales','x-ofissio-internal-user-id':'staff-1'})
  def api(route):
   path=route.request.url
   if '/api/admin/chats' in path:
    mode['requests']+=1
    if mode['unauthorized']:route.fulfill(status=401,json={'message':'Sesi pengguna belum valid.'});return
    route.fulfill(json={'ok':True,'result':{'conversations':[{'id':'00000000-0000-4000-8000-000000000043','customerName':'Customer Uji','status':'waiting','staffId':None,'staffName':None,'updatedAt':'2026-11-06T06:00:00Z'}] if mode['count'] else []}});return
   route.fulfill(json={'ok':True,'totalUnread':0,'latestNotifications':[]})
  context.route('**/api/**',api)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8054/notice-demo',wait_until='networkidle',timeout=120000)
  expect(page.get_by_role('link',name='Chat masuk',exact=False)).to_have_count(0)
  mode['count']=1
  expect(page.get_by_role('link',name='Chat masuk',exact=False)).to_be_visible(timeout=20000)
  expect(page.get_by_label('1 customer menunggu',exact=True)).to_be_visible()
  expect(page.get_by_role('button',name='Customer Uji',exact=False)).to_be_visible()
  page.screenshot(path=str(out/f'waiting-{width}.png'),full_page=True)
  mode['count']=0
  expect(page.get_by_role('link',name='Chat masuk',exact=False)).to_have_count(0,timeout=20000)
  mode['unauthorized']=True
  expect(page.get_by_role('link',name='Masuk kembali sebagai admin').first).to_be_visible(timeout=20000)
  expect(page.get_by_text('Jika sedang menguji akun customer, gunakan Incognito atau profil browser terpisah.')).to_be_visible()
  expect(page.get_by_text('Sistem akan mencoba lagi otomatis.',exact=False)).to_have_count(0)
  before=mode['requests'];page.wait_for_timeout(11500);assert mode['requests']==before,'Unauthorized requests must stop'
  page.screenshot(path=str(out/f'session-changed-{width}.png'),full_page=True)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  assert not errors,errors
  checks.append({'width':width,'newChatIndicator':True,'sidebarBadge':True,'clearsAfterClaim':True,'sessionChangeLoginLink':True,'unauthorizedPollingStops':True,'errors':errors});context.close()
 b.close()
(out/'browser-results.json').write_text(json.dumps({'passed':True,'checks':checks},indent=2));print(json.dumps(checks))
