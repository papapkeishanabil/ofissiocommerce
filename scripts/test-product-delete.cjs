// Scoped fixtures only: no live products or external requests.
const assert = require('node:assert/strict');
const Module = require('node:module');
require('./register-server-only.cjs');
require('tsx/cjs');
const { createApiError } = require('../src/lib/security/safe-error-response.ts');
let authorized = true;
let status = 'publish';
let resultStatus = 'trash';
let fail = false;
let calls = 0;
const audits = [];
const upstreamCalls = [];
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/features/commerce/commerce.config') return { getCommerceRuntimeConfig: () => ({ woocommerce: {
    enabled: true, isConfigured: true, baseUrl: 'https://woo.example.invalid', consumerKey: 'fixture', consumerSecret: 'fixture',
  }}) };
  if (request === './woocommerce-http') return {
    applyWooCommerceLoopbackAuth: () => false,
    allowSelfSignedTlsForWooUrl: () => false,
    requestWooCommerceJson: async (url, options) => {
      upstreamCalls.push({ url, options });
      return { ok: true, status: 200, data: { id: 7, status: 'trash' } };
    },
  };
  if (request === '@/features/admin/admin.service') return { requireInternalAdmin: (_request, permission) => {
    assert.equal(permission, 'admin:catalog:update');
    if (!authorized) throw createApiError('FORBIDDEN');
    return { id: 'test-admin' };
  }};
  if (request === '@/lib/security/audit-log') return { logAuditEvent: event => audits.push(event), logSecurityEvent() {} };
  if (request === '@/lib/security/rate-limit') return { createRateLimitKey: () => 'fixture', rateLimitOrThrow() {} };
  if (request === './woocommerce.client') return { woocommerceClient: {
    getProductById: async id => ({ id, sku: 'TEST-DELETE', status }),
    trashProduct: async id => {
      calls++;
      if (fail) throw createApiError('PROVIDER_UNAVAILABLE');
      const previousStatus = status;
      status = resultStatus;
      return { id, status: previousStatus };
    },
    getProducts: async () => [{ id: 7, status: 'trash' }],
  }};
  return originalLoad.call(this, request, parent, isMain);
};

async function main() {
  const { woocommerceClient } = require('../src/features/products/woocommerce/woocommerce.client.ts');
  await woocommerceClient.trashProduct(7);
  assert.equal(upstreamCalls.length, 1);
  assert.equal(upstreamCalls[0].url.searchParams.get('force'), 'false', 'Admin deletion must use recoverable trash');
  assert.equal(upstreamCalls[0].options.method, 'DELETE');
  assert.equal(upstreamCalls[0].url.pathname, '/wp-json/wc/v3/products/7');
  const { DELETE } = require('../src/app/api/admin/products/woocommerce/[id]/route.ts');
  const service = require('../src/features/products/woocommerce/woocommerce-product-admin.service.ts');
  const invoke = (id = '7', body = { confirmed: true }) => DELETE(new Request('https://ofissio.test/api/admin/products/woocommerce/' + id, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
  authorized = false;
  assert.equal((await invoke()).status, 403);
  authorized = true;
  assert.equal((await invoke('invalid')).status, 400);
  assert.equal((await invoke('7', {})).status, 400);
  assert.equal((await invoke('7', { confirmed: false })).status, 400);
  assert.equal(calls, 0, 'Rejected requests must not delete products');
  const success = await invoke();
  assert.equal(success.status, 200);
  assert.equal((await success.json()).product.id, 7);
  assert.equal(calls, 1);
  assert.equal(status, 'trash', 'Deletion succeeds even when DELETE returns pre-trash status');
  assert(audits.some(event => event.action === 'product_trashed' && event.actorId === 'test-admin'));
  status = 'trash';
  assert.equal((await invoke()).status, 200);
  assert.equal(calls, 1, 'Already trashed products need no second mutation');
  assert.deepEqual(await service.listAdminWooCommerceProducts(), [], 'Trash must not appear in admin list');
  status = 'publish';
  resultStatus = 'publish';
  assert.equal((await invoke()).status, 502, 'Do not report deletion if provider kept product published');
  fail = true;
  assert.equal((await invoke()).status, 503);
  assert(audits.some(event => event.action === 'product_delete_failed'));
  console.log('PASS: delete authorization, confirmation, ID validation, trash, repeat request, hidden list, provider rejection and audit logs');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
