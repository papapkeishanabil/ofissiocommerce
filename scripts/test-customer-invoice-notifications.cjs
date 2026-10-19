// Regression fixtures only. No remote requests, email, payment creation or database writes.
const assert = require('node:assert/strict');
const Module = require('node:module');
process.env.NODE_ENV = 'production';
require('./register-server-only.cjs');
require('tsx/cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const calls = [];
let documents = [];
let logs = [];
let failRead = false;
const registry = {
  provider: 'supabase',
  documents: { async listByCompany(companyId) { calls.push(['documents',companyId]); if(failRead) throw new Error('Unavailable'); return documents; } },
  emailLogs: { async listByCompany(companyId) { calls.push(['logs',companyId]); return logs; } },
};
const originalLoad = Module._load;
Module._load = function(request, parent, ...args) {
  if (request.includes('repository.factory')) return { repositoryRegistry: registry };
  if (request.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
  if (request.includes('CompanyLogoLibrary')) return { CompanyLogoLibrary: () => React.createElement('div',null,'Logo Library') };
  if (request === 'next/link') return { __esModule: true, default: ({children,...props}) => React.createElement('a',props,children) };
  return originalLoad.call(this,request,parent,...args);
};
global.fetch = async () => { throw new Error('Remote API forbidden in notification tests'); };
const { enrichTrackingInvoices } = require('../src/features/tracking/tracking-invoice.server.ts');
const { getPendingInvoiceOrders } = require('../src/features/dashboard/components/invoice-notifications.ts');
const { DashboardOverview } = require('../src/features/dashboard/components/DashboardOverview.tsx');
const { createMockTrackingOrders } = require('../src/features/tracking/mock-tracking-data.ts');
const companyId = 'company-a';
const base = {
  ...createMockTrackingOrders(companyId,'Company A')[0],
  id:'order-a', orderNumber:'OF-TEST-001', paymentStatus:'waiting_payment', orderStatus:'waiting_payment',
  currentStageId:'order_received', total:1548450,
};
const doc = {
  id:'invoice-a', companyId, entityType:'order', entityId:base.id,
  documentType:'invoice_pdf', documentNumber:'INV-TEST-001', filename:'invoice-test.pdf',
  status:'generated', deletedAt:null, createdAt:'2026-10-10T01:00:00Z',
  storageKey:'PRIVATE-storage-key', metadata:{internalNote:'PRIVATE-note'},
};
const log = {
  id:'email-a', companyId, status:'sent', sentAt:'2026-10-10T01:05:00Z',
  createdAt:'2026-10-10T01:04:00Z', to:['PRIVATE-email@example.invalid'],
  safeMetadata:{emailPurpose:'invoice_ready',orderId:base.id, invoiceDocumentId:doc.id},
};
async function main() {
  const foreign = {...base,id:'order-b',companyId:'company-b'};
  assert.deepEqual(await enrichTrackingInvoices('',[base]),[]);
  assert.deepEqual(await enrichTrackingInvoices(companyId,[]),[]);
  assert.equal(calls.length,0);
  let result = await enrichTrackingInvoices(companyId,[base,foreign]);
  assert.equal(result.length,1);
  assert.equal(result[0].invoiceNotification,null);
  assert.equal(result[0].documents.find(d=>d.type==='invoice').status,'pending');
  assert.equal(getPendingInvoiceOrders(companyId,result).length,0);
  documents=[doc];
  result=await enrichTrackingInvoices(companyId,[base]);
  assert.equal(result[0].documents.find(d=>d.type==='invoice').status,'available');
  assert.equal(result[0].invoiceNotification,null,'Generated draft is not sent');
  logs=[{...log,status:'failed'},{...log,status:'queued'},{...log,status:'mocked'},
    {...log,companyId:'company-b'}, {...log,safeMetadata:{...log.safeMetadata,emailPurpose:'payment_received'}},
    {...log,safeMetadata:{...log.safeMetadata,orderId:foreign.id}}];
  result=await enrichTrackingInvoices(companyId,[base]);
  assert.equal(result[0].invoiceNotification,null);
  logs=[log];
  result=await enrichTrackingInvoices(companyId,[base,foreign]);
  const notified=result[0];
  assert.deepEqual(notified.invoiceNotification,{documentId:doc.id,invoiceNumber:doc.documentNumber,sentAt:log.sentAt});
  assert.equal(getPendingInvoiceOrders(companyId,[notified,notified]).length,1,'No duplicate notification on resend');
  assert.equal(getPendingInvoiceOrders('company-b',[notified]).length,0);
  for(const status of ['paid','deposit_paid','verified','failed','not_required']) {
    assert.equal(getPendingInvoiceOrders(companyId,[{...notified,paymentStatus:status}]).length,0,status);
  }
  for(const status of ['cancelled','refunded','failed']) {
    assert.equal(getPendingInvoiceOrders(companyId,[{...notified,orderStatus:status}]).length,0,status);
  }
  const serialized=JSON.stringify(notified);
  assert(!serialized.includes('PRIVATE-'),'Notification must not expose internal storage or recipients');
  assert.deepEqual(base.invoiceNotification,undefined,'Read enrichment does not modify persisted tracking');
  assert(calls.every(([,id])=>id===companyId),'Every read uses authenticated company');
  console.log('PASS: existing sent invoice visible; no draft/failed/mock/foreign notification; paid and cancelled actions cleared; resend deduplicated.');

  documents=[{...doc,id:'invoice-new',createdAt:'2026-10-10T02:00:00Z',filename:'invoice-new.pdf'},{...doc,status:'expired',deletedAt:'2026-10-10T02:00:00Z'}];
  result=await enrichTrackingInvoices(companyId,[base]);
  assert.equal(result[0].invoiceNotification.documentId,'invoice-new','Regenerated PDF remains available without resending old email');
  for(const patch of [{companyId:'company-b'},{entityId:foreign.id},{status:'failed'},{deletedAt:'2026-10-10'}]) {
    documents=[{...doc,...patch}];
    assert.equal((await enrichTrackingInvoices(companyId,[base]))[0].invoiceNotification,null);
  }
  documents=[doc]; failRead=true;
  await assert.rejects(enrichTrackingInvoices(companyId,[base]),/Unavailable/);
  failRead=false;
  console.log('PASS: correct latest PDF, deleted/foreign records rejected, unavailable repository does not silently report empty notifications.');

  const session={user:{fullName:'Deny Test',id:'user-a',email:'test@example.invalid'},company:{id:companyId,companyName:'Company A'}};
  for(const view of ['overview','orders','quotes','logos']) {
    const html=renderToStaticMarkup(React.createElement(DashboardOverview,{
      session,profileComplete:true,orders:[notified],history:[],quotations:[],initialView:view,
    }));
    assert(html.includes('aria-label="Pemberitahuan invoice"'),view);
    assert(html.includes('INV-TEST-001'),view);
    assert(html.includes('/orders/order-a#order-documents'),view);
    assert(html.includes('1 invoice menunggu pembayaran'),view);
    assert(html.includes('Lihat invoice &amp; pembayaran'),view);
  }
  const paidHtml=renderToStaticMarkup(React.createElement(DashboardOverview,{
    session,profileComplete:true,orders:[{...notified,paymentStatus:'paid'}],history:[],quotations:[],initialView:'quotes',
  }));
  assert(!paidHtml.includes('aria-label="Pemberitahuan invoice"'));
  const failedHtml=renderToStaticMarkup(React.createElement(DashboardOverview,{
    session,profileComplete:true,orders:[notified],history:[],quotations:[],refreshFailed:true,
  }));
  assert(failedHtml.includes('Pembaruan data belum berhasil'));
  assert(failedHtml.includes('INV-TEST-001'),'Last successful snapshot stays visible on refresh error');
  console.log('PASS: invoice banner and badge in Ringkasan/Pesanan/Penawaran/Logo Library; order link, payment completion, refresh failure message.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
