from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json,sys,time
from datetime import datetime, timezone
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8054'
out=Path('.artifacts/chat-redesign');out.mkdir(parents=True,exist_ok=True)
cid='11111111-1111-4111-8111-111111111111';waiting='22222222-2222-4222-8222-222222222222';closed='33333333-3333-4333-8333-333333333333'
js='''window.__popups=[]; window.__tones=0; window.__pushSaves=0;
class FakeAudio {state='running';currentTime=0;destination={};async resume(){} createOscillator(){return {type:'sine',frequency:{value:0},connect(){},start(){window.__tones++},stop(){}}} createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}}
window.AudioContext=FakeAudio;
let subscribed=false; const sub={endpoint:'https://push.test/device',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'test',auth:'test'}}},async unsubscribe(){subscribed=false;return true}};
const registration={async showNotification(title,options){window.__popups.push({title,options})},pushManager:{async getSubscription(){return subscribed?sub:null},async subscribe(){subscribed=true;return sub}}};
Object.defineProperty(window,'PushManager',{value:function(){},configurable:true});
Object.defineProperty(window,'Notification',{value:{permission:'default',async requestPermission(){this.permission='granted';return 'granted'}},configurable:true});
Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>registration,ready:Promise.resolve(registration)},configurable:true});'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 reports=[]
 for width,height,label in [(1440,1000,'desktop'),(390,844,'mobile')]:
  context=browser.new_context(viewport={'width':width,'height':height})
  context.add_init_script(js)
  state={'invalid':False,'notices':[],'sent':0,'saves':0,'deletes':0,'failSend':True}
  conversations={cid:{'id':cid,'customerName':'Deny Suhartana','status':'active','staffId':'staff-1','staffName':'Staf Uji','updatedAt':'2026-11-06T07:30:00Z'},waiting:{'id':waiting,'customerName':'Rina Putri','status':'waiting','staffId':None,'staffName':None,'updatedAt':'2026-11-06T07:31:00Z'},closed:{'id':closed,'customerName':'Budi Santoso','status':'closed','staffId':'staff-1','staffName':'Staf Uji','updatedAt':'2026-11-05T07:30:00Z'}}
  messages={key:[{'id':key+'-old','sequence':1,'role':'user','name':c['customerName'],'text':'Pesan lama tetap tersimpan. Saya ingin memesan seragam kantor.','ts':1793949000000,'context':True},{'id':key+'-ai','sequence':2,'role':'assistant','name':'Ofistant AI','text':'Saya bantu hubungkan dengan tim Ofissio.','ts':1793949060000,'context':True},{'id':key+'-staff','sequence':3,'role':'staff','name':'Staf Uji','text':'Selamat siang, ada yang bisa saya bantu?','ts':1793949120000,'context':False}] for key,c in conversations.items()}
  def route(r):
   from urllib.parse import urlparse,parse_qs
   url=urlparse(r.request.url);q=parse_qs(url.query);path=url.path;method=r.request.method
   if path.startswith('/api/admin/') and state['invalid']:r.fulfill(status=401,json={'message':'Sesi berakhir'});return
   if path=='/api/admin/notifications/summary':r.fulfill(json={'chatUnread':sum(n['status']=='unread' for n in state['notices']),'chatUnreadByConversation':{waiting:sum(n['status']=='unread' for n in state['notices'])},'totalUnread':len(state['notices']),'latestChatNotifications':state['notices'],'latestNotifications':[]});return
   if path=='/api/admin/notifications/push-subscription':
    if method=='POST':state['saves']+=1
    if method=='DELETE':state['deletes']+=1
    r.fulfill(json={'ok':True,'configured':True,'publicKey':'B'+'A'*86});return
   if path.startswith('/api/admin/notifications/'):
    for notice in state['notices']:
     if notice['id'] in path:notice['status']='read'
    r.fulfill(json={'ok':True});return
   if path=='/api/admin/chats':
    if method=='POST':
     data=r.request.post_data_json;key=data['conversationId'];action=data['action'];c=conversations[key]
     if action=='send':
      if state['failSend']:state['failSend']=False;r.fulfill(status=503,json={'message':'Koneksi uji terputus. Coba lagi.'});return
      state['sent']+=1;messages[key].append({'id':data['messageId'],'sequence':len(messages[key])+1,'role':'staff','name':'Staf Uji','text':data['text'],'ts':1793949300000,'context':False})
     elif action=='claim':c.update(status='active',staffId='staff-1',staffName='Staf Uji')
     elif action=='close':c['status']='closed'
     after=data.get('after',0)
    elif 'conversationId' in q:key=q['conversationId'][0];after=int(q.get('after',['0'])[0])
    else:r.fulfill(json={'ok':True,'result':{'conversations':[c for c in conversations.values() if c['status']==q.get('status',['waiting'])[0]]}});return
    r.fulfill(json={'ok':True,'result':{'conversation':conversations[key],'messages':[m for m in messages[key] if m['sequence']>after],'next':len(messages[key]),'more':False}});return
   if path.startswith('/api/'):
    r.fulfill(json={'ok':True,'user':None,'authenticated':False});return
   r.continue_()
  context.route('**/api/**',route)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/notice-demo?conversation='+cid,wait_until='networkidle');page.bring_to_front()
  expect(page.get_by_role('heading',name='Deny Suhartana')).to_be_visible(timeout=60000)
  expect(page.get_by_text('Pesan lama tetap tersimpan. Saya ingin memesan seragam kantor.',exact=True)).to_be_visible()
  expect(page.get_by_label('Balasan Anda',exact=True)).to_be_enabled()
  page.screenshot(path=str(out/f'implemented-{label}.png'),full_page=True)
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),label
  page.get_by_role('button',name='Aktifkan suara',exact=True).click();expect(page.get_by_role('button',name='Suara aktif',exact=True)).to_have_attribute('aria-pressed','true')
  assert page.evaluate('window.__tones')==3
  page.get_by_role('button',name='Tes suara',exact=True).click();assert page.evaluate('window.__tones')==6
  page.get_by_role('button',name='Aktifkan notifikasi',exact=True).last.click();expect(page.get_by_role('button',name='Notifikasi aktif',exact=True).last).to_be_visible();assert state['saves']>0
  page.get_by_role('button',name='Tes popup perangkat',exact=True).click();assert page.evaluate('window.__popups.length')==1
  assert page.evaluate('window.__popups[0].options.silent') is False
  state['notices']=[{'id':'chat-event-new','type':'system_warning','status':'unread','entityType':'ofistant_chat_event','metadata':{'source':'ofistant_live_chat','conversationId':waiting,'adminUrl':'/admin/chats?conversation='+waiting},'createdAt':datetime.now(timezone.utc).isoformat()}]
  # Trigger existing visibility refresh instead of waiting for a 15-second timer.
  page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
  page.wait_for_function('window.__tones === 9')
  if label=='desktop':
   expect(page.get_by_role('link',name='Chat Customer',exact=False).get_by_label('1 notifikasi chat belum dibaca')).to_be_visible()
   expect(page.get_by_role('heading',name='Chat customer baru',exact=True)).to_be_visible()
   page.get_by_role('button',name='Tutup popup chat').click()
   expect(page.get_by_role('heading',name='Chat customer baru',exact=True)).to_have_count(0)
  page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");page.wait_for_timeout(300);assert page.evaluate('window.__tones')==9
  page.get_by_role('button',name='Suara aktif',exact=True).click();expect(page.get_by_role('button',name='Aktifkan suara',exact=True)).to_have_attribute('aria-pressed','false')
  page.get_by_label('Balasan Anda',exact=True).fill('Balasan pengujian tersimpan')
  page.get_by_role('button',name='Kirim balasan',exact=True).click();expect(page.get_by_text('Koneksi uji terputus. Coba lagi.',exact=False)).to_be_visible();expect(page.get_by_label('Balasan Anda',exact=True)).to_have_value('Balasan pengujian tersimpan')
  page.get_by_label('Balasan Anda',exact=True).press('Control+Enter');expect(page.get_by_label('Balasan Anda',exact=True)).to_have_value('');assert state['sent']==1
  page.get_by_role('button',name='Selesaikan chat',exact=True).click();expect(page.get_by_text('Percakapan selesai. Riwayat tetap tersimpan.',exact=True)).to_be_visible()
  if label=='mobile':page.get_by_role('button',name='Kembali ke daftar',exact=True).click()
  page.get_by_role('button',name='Selesai',exact=True).click();page.get_by_role('button',name='Budi Santoso',exact=False).click()
  expect(page.get_by_text('Pesan lama tetap tersimpan. Saya ingin memesan seragam kantor.',exact=True)).to_be_visible()
  expect(page.get_by_label('Balasan Anda',exact=True)).to_be_disabled()
  if label=='mobile':page.get_by_role('button',name='Kembali ke daftar',exact=True).click()
  page.get_by_role('button',name='Menunggu',exact=True).click();page.get_by_placeholder('Cari nama customer...').fill('Rina');page.get_by_role('button',name='Rina Putri',exact=False).click()
  page.get_by_role('button',name='Ambil percakapan',exact=True).click();expect(page.get_by_label('Balasan Anda',exact=True)).to_be_enabled()
  page.get_by_role('button',name='Notifikasi aktif',exact=True).last.click();expect(page.get_by_role('button',name='Aktifkan notifikasi',exact=True).last).to_be_visible();assert state['deletes']==1
  state['invalid']=True
  page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
  # Queue poll also recognizes expired sessions; no customer data remains visible.
  expect(page.get_by_role('link',name='Masuk kembali sebagai admin').last).to_be_visible(timeout=20000)
  assert not errors,errors
  reports.append({'viewport':label,'deepLink':True,'historyPreserved':True,'replyRetry':True,'claimClose':True,'pushOptInOut':True,'soundOptInDedupMute':True,'noOverflow':True,'sessionRecovery':True})
  context.close()
 browser.close()
 (out/'browser-results.json').write_text(json.dumps(reports,indent=2))
 print(json.dumps(reports))
