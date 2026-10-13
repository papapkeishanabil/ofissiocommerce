// Read-only regression checks. No credentials, remote API calls or writes to a database.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

async function main() {
  const mode = process.argv[2];
  if (!mode) {
    for (const environment of ['production', 'development']) {
      const result = spawnSync(process.execPath, [
        '--require', path.resolve('scripts/register-server-only.cjs'),
        '--require', 'tsx/cjs', __filename, environment,
      ], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: environment }, stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Regression failed: ${environment}`);
    }
    return;
  }
  assert.equal(process.env.NODE_ENV, mode);
  const tracking = require('../src/features/tracking/tracking.service.ts');
  const { loadCustomerTrackingSnapshot } = require('../src/features/tracking/tracking-client.ts');
  const demo = require('../src/features/tracking/mock-tracking-data.ts');
  const scope = { companyId: 'customer-a', companyName: 'Company A' };
  const examples = demo.createMockTrackingOrders(scope.companyId, scope.companyName);
  const active = { ...examples[0], id: 'real-active', orderNumber: 'REAL-001' };
  const history = { ...examples.find(order => order.currentStageId === 'completed'), id: 'real-history', orderNumber: 'REAL-002' };
  const other = { ...active, id: 'other-order', companyId: 'customer-b' };
  const realQuotation = { ...demo.createMockQuotationTracking(scope.companyId, scope.companyName)[0], id: 'real-quotation', quotationNumber: 'REAL-Q-001' };
  const otherQuotation = { ...realQuotation, id: 'other-quotation', companyId: 'customer-b' };
  const stored = new Map();
  let reads = 0;
  let writes = 0;
  global.window = { localStorage: {
    getItem: key => { reads++; return stored.get(key) ?? null; },
    setItem: (key, value) => { writes++; stored.set(key, value); },
  }};
  stored.set('ofissio-mock:tracking-orders', JSON.stringify(examples));
  stored.set('ofissio-mock:orders', JSON.stringify({
    orders: [{ id: 'legacy-order', code: 'LEGACY-001', companyId: scope.companyId, userId: 'user-a', type: 'READY_STOCK', status: 'paid', items: [], subtotal: 1, tax: 0, shippingCost: 0, total: 1, createdAt: '2026-10-08', updatedAt: '2026-10-08' }],
    quotations: [{ id: 'legacy-quotation', code: 'LEGACY-Q-001', companyId: scope.companyId, userId: 'user-a', status: 'submitted', items: [], createdAt: '2026-10-08' }],
  }));
  const snapshot = tracking.getDashboardTrackingSnapshot(scope, [active, active, history, other], [realQuotation, realQuotation, otherQuotation]);
  if (mode === 'production') {
    const empty = tracking.getDashboardTrackingSnapshot(scope);
    assert.deepEqual([empty.activeOrders.length, empty.orderHistory.length, empty.quotations.length], [0, 0, 0]);
    assert.deepEqual(snapshot.activeOrders.map(order => order.id), ['real-active']);
    assert.deepEqual(snapshot.orderHistory.map(order => order.id), ['real-history']);
    assert.deepEqual(snapshot.quotations.map(quotation => quotation.id), ['real-quotation']);
    assert.equal(tracking.getTrackingOrder('OF-ORD-RS-001', scope), null);
    assert.equal(tracking.getTrackingOrder('real-active', scope, [active]), active);
    assert.equal(tracking.getTrackingOrder('REAL-001', scope, [active]), active);
    assert.equal(tracking.getTrackingOrder('other-order', scope, [other]), null);
    const unscoped = tracking.getDashboardTrackingSnapshot(undefined, [active], [realQuotation]);
    assert.deepEqual([unscoped.companyId, unscoped.activeOrders.length, unscoped.quotations.length], ['', 0, 0]);
    tracking.cacheClientTrackingOrders([active]);
    assert.equal(reads, 0, 'Production must not read editable mock localStorage');
    assert.equal(writes, 0, 'Production must not cache customer transactions in mock storage');
    assert.equal(tracking.getOfistantOrderStatusText(scope).order, null);
    assert.equal(tracking.getOfistantOrderStatusText(scope, [active]).order.id, active.id);
    console.log('PASS: production empty account, real orders/history/quotations, company isolation, detail, Ofistant and poisoned cache.');
  } else {
    assert(snapshot.activeOrders.some(order => order.orderNumber === 'OF-ORD-RS-001'));
    assert(snapshot.activeOrders.some(order => order.id === 'legacy-order'));
    assert(snapshot.quotations.some(quotation => quotation.id === 'legacy-quotation'));
    assert(snapshot.quotations.some(quotation => quotation.id === 'real-quotation'));
    assert(!snapshot.activeOrders.some(order => order.id === 'other-order'));
    assert(!snapshot.quotations.some(quotation => quotation.id === 'other-quotation'));
    tracking.cacheClientTrackingOrders([active]);
    assert(writes > 0);
    console.log('PASS: development demo/legacy/cache preserved; external records remain company-scoped.');
  }
  const record = {
    id: 'api-quotation', quotationNumber: 'API-Q-001', companyId: scope.companyId,
    companyName: scope.companyName, status: 'quoted', items: [], createdAt: '2026-10-08',
    requestedProcessRoute: 'fulfillment', grandTotal: 100, customerNotes: null, convertedOrderId: null,
  };
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json(String(url).startsWith('/api/tracking/')
      ? { ok: true, dynamicOrders: [active, other] }
      : { ok: true, quotations: [record, { ...record, id: 'other-api-quotation', companyId: 'customer-b' }] });
  };
  const input = { ...scope, userId: 'user-a', signal: new AbortController().signal, fetcher };
  const fromApi = await loadCustomerTrackingSnapshot(input);
  assert(fromApi.activeOrders.some(order => order.id === active.id));
  assert(fromApi.quotations.some(quotation => quotation.id === record.id));
  assert(!fromApi.activeOrders.some(order => order.companyId === 'customer-b'));
  assert(!fromApi.quotations.some(quotation => quotation.companyId === 'customer-b'));
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(new URL(request.url, 'https://example.invalid').searchParams.get('companyId'), scope.companyId);
    assert.equal(request.options.cache, 'no-store');
  }
  for (const makeResponse of [
    () => new Response(null, { status: 500 }),
    () => new Response(null, { status: 401 }),
    () => Response.json({ ok: false }),
    () => Response.json({ ok: true }),
    () => new Response('invalid JSON'),
  ]) {
    await assert.rejects(loadCustomerTrackingSnapshot({ ...input, fetcher: async () => makeResponse() }));
  }
  await assert.rejects(loadCustomerTrackingSnapshot({ ...input, fetcher: async () => { throw new Error('network unavailable'); } }));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadCustomerTrackingSnapshot({ ...input, signal: controller.signal, fetcher: async (_, options) => { options.signal.throwIfAborted(); return Response.json({}); } }));
  await assert.rejects(loadCustomerTrackingSnapshot({ ...input, companyId: '' }));
  console.log(`PASS: ${mode} API-backed loading, quotation mapping, HTTP/JSON/network failures and cancellation.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
