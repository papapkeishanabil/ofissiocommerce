from playwright.sync_api import sync_playwright,expect
from urllib.parse import urlparse,parse_qs
import json
from pathlib import Path
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page();stage=['valid'];cursors=[];errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  if '/api/auth/session' in r.request.url:r.fulfill(json={'session':None});return
  cursors.append(parse_qs(urlparse(r.request.url).query).get('after',['0'])[0])
  if stage[0]=='expired':r.fulfill(status=401,json={'message':'expired'});return
  r.fulfill(json={'result':{'conversation':{'id':'11111111-1111-4111-8111-111111111111','customerName':'Customer','status':'active'},'messages':[{'id':'m1','sequence':1,'role':'user','name':'Customer','text':'Riwayat tetap tersedia','ts':1,'context':False}],'next':1,'more':False}})
 page.route('**/api/ofistant/support*',route);page.route('**/api/auth/session',route)
 page.goto('http://127.0.0.1:8054/session-recovery-demo')
 expect(page.get_by_text('Riwayat tetap tersedia',exact=True)).to_be_visible(timeout=60000)
 stage[0]='expired';page.get_by_role('button',name='Retry').click()
 expect(page.get_by_test_id('auth')).to_have_text('true');expect(page.get_by_text('Riwayat tetap tersedia',exact=True)).to_have_count(0)
 stage[0]='valid';page.get_by_role('button',name='Retry').click()
 expect(page.get_by_text('Riwayat tetap tersedia',exact=True)).to_be_visible();expect(page.get_by_test_id('auth')).to_have_text('false');assert cursors[-1]=='0',cursors
 assert not errors,errors
 out=Path('.artifacts/chat-session');out.mkdir(exist_ok=True);(out/'browser-results.json').write_text(json.dumps({'recoveryAfter401':True,'historyRestoredFromStart':True,'errors':errors}))
 browser.close();print('PASS: failed session clears display; retry reloads history from zero and recovers chat')
