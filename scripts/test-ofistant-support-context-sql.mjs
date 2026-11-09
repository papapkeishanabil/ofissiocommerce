// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || process.argv[2] || '@electric-sql/pglite');
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
await db.exec(readFileSync('database/migrations/041_ofistant_history.sql', 'utf8'));
await db.exec(readFileSync('database/migrations/042_ofistant_support.sql', 'utf8'));
await db.exec(readFileSync('database/migrations/044_ofistant_customer_context.sql', 'utf8'));
const id = randomUUID();
const customer = ['customer-1', 'company-1', false, 'Deny'];
const staff = ['staff-1', '', true, 'Rina'];
async function rpc(actor, action, payload = {}) {
  const { rows } = await db.query('select public.ofistant_support_command($1,$2,$3,$4,$5,$6::jsonb) as result', [...actor, action, JSON.stringify({ conversationId: id, ...payload })]);
  return rows[0].result;
}
async function ai(conversationId=id) {
  const turnId=randomUUID();
  return db.query('select public.ofistant_history_command($1,$2,$3,$4::jsonb)', ['customer-1','company-1','append',JSON.stringify({ conversationId,turnId,title:'Baju kantor',messages:[{id:turnId+'u',role:'user',text:'Ada ukuran M?',ts:Date.now()},{id:turnId+'a',role:'assistant',text:'Silakan pilih produk.',ts:Date.now()+1}]})]);
}
assert.equal((await rpc(customer,'read')).conversation,null);
await ai();
await assert.rejects(rpc(staff,'read'),/SUPPORT_NOT_FOUND/);
let result=await rpc(customer,'start');
assert.equal(result.conversation.status,'waiting');
assert.equal(result.messages.filter(m=>m.context).length,2);
assert.equal((await rpc(customer,'start')).messages.length,3);
for(const actor of [['other','company-1',false,'Other'],['customer-1','other',false,'Other']]) {
  for(const action of ['read','start','send','close']) await assert.rejects(rpc(actor,action,{messageId:randomUUID(),text:'attack'}),/SUPPORT_NOT_FOUND/);
}
await assert.rejects(rpc(customer,'list'),/SUPPORT_FORBIDDEN/);
await assert.rejects(ai(),/SUPPORT_ACTIVE/);
await assert.rejects(rpc(staff,'send',{messageId:randomUUID(),text:'Before claim'}),/SUPPORT_ASSIGNED/);
const messageId=randomUUID();
await rpc(customer,'send',{messageId,text:'Tolong bantu'});
await rpc(customer,'send',{messageId,text:'Tolong bantu'});
assert.equal((await rpc(customer,'read')).messages.filter(m=>m.id===messageId).length,1);
await rpc(staff,'claim');
const cardId = randomUUID();
const card = {kind:'pdf', title:'Panduan', resourceId:randomUUID()};
await rpc(staff,'send',{messageId:cardId,text:'Panduan',attachment:card});
await rpc(staff,'send',{messageId:cardId,text:'Panduan',attachment:card});
assert.deepEqual((await rpc(customer,'read')).messages.find(m=>m.id===cardId).attachment,card);
assert.equal((await rpc(customer,'read')).messages.filter(m=>m.id===cardId).length,1);
await assert.rejects(rpc(customer,'send',{messageId:randomUUID(),text:'Forged',attachment:card}),/SUPPORT_FORBIDDEN/);
await db.query('select ofistant_contact_update($1,$2,$3,$4,$5)',[id,'Deny Edited','08123','Internal only','staff-1']);
assert.equal((await rpc(customer,'read')).conversation.customerName,'Deny Edited');
assert(!JSON.stringify(await rpc(customer,'read')).includes('Internal only'));

await assert.rejects(rpc(['staff-2','',true,'Budi'],'claim'),/SUPPORT_ASSIGNED/);
await assert.rejects(rpc(['staff-2','',true,'Budi'],'send',{messageId:randomUUID(),text:'Other staff'}),/SUPPORT_ASSIGNED/);
result=await rpc(staff,'send',{messageId:randomUUID(),text:'Halo Deny, saya Rina.'});
assert.equal(result.messages.at(-1).name,'Rina');
assert.equal(result.messages.at(-1).role,'staff');
assert.equal((await rpc(staff,'list',{status:'active'})).conversations.length,1);
for(let i=0;i<105;i++) await rpc(customer,'send',{messageId:randomUUID(),text:`Pesan ${i}`});
const first=await rpc(customer,'read');
assert.equal(first.messages.length,100);assert.equal(first.more,true);
const second=await rpc(customer,'read',{after:first.next});
assert.ok(second.messages.length>0);assert.equal(second.more,false);
assert.ok(second.messages.every(m=>m.sequence>first.next));
await rpc(staff,'close');
await assert.rejects(rpc(customer,'send',{messageId:randomUUID(),text:'Closed'}),/SUPPORT_CLOSED/);
await rpc(customer,'send',{messageId,text:'Tolong bantu'}); // Retry after close is idempotent.
await ai();
await rpc(customer,'start');
assert.equal((await rpc(customer,'read')).conversation.staffId,null);
assert.equal((await db.query('select count(*)::int as n from public.ofistant_support_messages where is_context')).rows[0].n,4);
await rpc(customer,'close');
const privateId=randomUUID(); await ai(privateId);
await assert.rejects(rpc(staff,'read',{conversationId:privateId}),/SUPPORT_NOT_FOUND/);
for(const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(rpc(customer,'read'),/permission denied/);
  await assert.rejects(db.query('select * from public.ofistant_support_messages'),/permission denied/);
  await assert.rejects(db.query('select * from public.ofistant_customer_contacts'),/permission denied/);
  await assert.rejects(db.query('select * from public.ofistant_materials'),/permission denied/);
  await assert.rejects(db.query('select ofistant_contact_update($1,$2,$3,$4,$5)',[id,'Attack','','','fake']),/permission denied/);
  await db.exec('reset role');
}
console.log('PASS: ownership, opt-in history, AI guard, claims, replies, idempotency, pagination, closure, RLS/RPC restrictions');
await db.close();
