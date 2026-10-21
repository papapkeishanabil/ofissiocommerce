// Exercise the real invoice mapper, PDF renderer and generation service with scoped fixtures.
// No credentials, outgoing requests or real payment creation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
require('./register-server-only.cjs');
require('tsx/cjs');

const companyId = '2b458a02-fd05-41f3-b7e1-71bc50551511';
const userId = 'f212d3e4-70d9-42e6-8510-c12c09f6c84a';
const order = {
  id: 'order-invoice-fixture', orderNumber: 'OF-QUO-001-ECBED9', companyId, userId,
  cartId: 'cart-fixture', quotationId: 'quotation-fixture', status: 'waiting_payment',
  processRoute: 'customization', shippingRateId: null,
  items: [{ productId: 'ks-004', productName: 'Kemeja Safety KS-004', sku: 'KS-004',
    selectedColor: 'Merah-Navy', sizeMatrix: { S: 9 }, totalQty: 9, priceFrom: 150000,
    finalUnitPrice: 150000, embroideryTotal: 45000, customizationTotal: 45000,
    embroideryPlacements: [{ zone: 'right_chest', technique: 'embroidery', logoFileName: 'logo512.png',
      widthCm: 8, heightCm: 8, rotation: 0, notes: null }],
  }],
  calculation: { itemSubtotal: 1350000, customizationFee: 45000, shippingFee: 0,
    tax: 153450, taxEnabled: true, taxRate: 11, grandTotal: 1548450 },
  createdAt: '2026-10-10T01:48:00.000Z', updatedAt: '2026-10-10T01:48:00.000Z',
};
const payment = {
  id: 'payment-existing', orderId: order.id, companyId, provider: 'ipaymu',
  referenceId: order.orderNumber, amount: 1548450, status: 'waiting_payment',
  paymentUrl: 'https://payment.example.invalid/invoice-fixture',
  expiredAt: '2026-10-11T01:48:00.000Z', uniqueCode: 0,
};
let company = { id: companyId, name: 'Perusahaan Deny', pic_name: 'Deny', pic_whatsapp: '081321268297' };
let addresses = [{ id: 'billing-fixture', company_id: companyId, label: 'Rumah',
  recipient_name: 'Deny', phone: '081321268297', address_line: 'Jl. Melati 1 No 21',
  city: 'Kab. Bandung', province: 'Jawa Barat', postal_code: '40623', is_default_billing: true }];
let records = [{ id: 'old-document', companyId, entityType: 'order', entityId: order.id,
  documentType: 'invoice_pdf', documentNumber: 'INV-CUS-2610-001', status: 'generated', deletedAt: null,
  metadata: { rendererVersion: 'invoice-payment-links-v1', paymentReference: payment.referenceId,
    paymentLinkAvailable: true, paymentQrAvailable: true } }];
let uploaded;
let ensureCalls = 0;
const originalLoad = Module._load;
const registry = {
  provider: 'supabase',
  company: { getCompanyById: async id => { assert.equal(id, companyId); return company; } },
  orders: { listAll: async () => [order], updateOrderProcess: async input => {
    assert.equal(input.companyId, companyId); assert.equal(input.orderId, order.id);
    assert.equal(input.patch.invoicePdfDocumentId, records[0].id);
    assert.equal(input.patch.status, undefined); return order;
  } },
  payments: { updatePayment: async input => {
    assert.equal(input.paymentId, payment.id); assert.equal(input.companyId, companyId);
    assert.deepEqual(Object.keys(input.patch), ['invoiceDocumentId']); return payment;
  } },
  documents: {
    listByEntity: async input => { assert.equal(input.companyId, companyId); return records; },
    save: async record => { records.unshift(record); return record; },
    update: async (id, patch) => { Object.assign(records.find(r => r.id === id), patch); },
    listAll: async () => records,
  },
};
Module._load = function(request, parent, main) {
  if (request === '@/features/repositories/repository.factory') return { repositoryRegistry: registry };
  if (request === '@/features/database/supabase-admin.client') return { getSupabaseAdminClient: () => ({
    select: async (table, options) => {
      if (table === 'company_addresses') {
        assert.deepEqual(options.filters, { company_id: companyId }); return addresses;
      }
      if (table === 'user_profiles') {
        assert.deepEqual(options.filters, { id: userId }); return [{ id: userId, name: 'Deny' }];
      }
      throw new Error('Unexpected query: ' + table);
    },
  }) };
  if (request === '@/features/payment/payment.service') return {
    ensurePaymentForInvoice: async input => {
      ensureCalls++; assert.deepEqual(input, { orderId: order.id, companyId, userId }); return payment;
    }, recordPaymentEvent: () => {},
  };
  if (request === '@/lib/security/audit-log') return { logAuditEvent: () => {} };
  if (request === './providers/storage-document.provider') return {
    uploadGeneratedPdf: async input => {
      assert.equal(input.companyId, companyId); uploaded = input;
      return { id: 'file-fixture', storageBucket: 'private-documents', storageKey: 'fixture.pdf', sizeBytes: input.data.length };
    },
  };
  return originalLoad.call(this, request, parent, main);
};
global.fetch = async () => { throw new Error('Network is forbidden in invoice regression tests'); };

async function main() {
  const { generateInvoicePdf, mapOrderToInvoicePdfData } = require('../src/features/documents/document.service.ts');
  const { getAdminOrderCustomerSnapshot } = require('../src/features/admin/admin-order-workbench.service.ts');
  const customer = await getAdminOrderCustomerSnapshot({ order, tracking: null });
  const data = mapOrderToInvoicePdfData({ order, customer, payment,
    invoiceNumber: 'INV-CUS-2610-001', generatedAt: '2026-10-10T02:30:00.000Z' });
  assert.equal(data.companyName, 'Perusahaan Deny');
  assert.equal(data.picName, 'Deny');
  assert.equal(data.picPhone, '081321268297');
  assert.equal(data.companyAddress, 'Jl. Melati 1 No 21, Kab. Bandung, Jawa Barat, 40623');
  assert.equal(data.subtotal, 1350000); assert.equal(data.customizationTotal, 45000);
  assert.equal(data.taxTotal, 153450); assert.equal(data.grandTotal, 1548450);
  assert.equal(data.paymentExpiry, payment.expiredAt); assert.equal(data.dueDate, null);
  assert.equal(data.paymentLink, payment.paymentUrl);
  assert(data.items[0].description.includes('Dada Kanan'));
  assert(data.items[0].description.includes('8x8 cm'));
  console.log('PASS: company, PIC, phone and complete billing address resolve from company-scoped data; amounts and payment fields stay unchanged.');

  assert.throws(() => mapOrderToInvoicePdfData({ order, customer: { ...customer, companyId: 'foreign-company' }, payment }), /perusahaan order/);
  const fallback = mapOrderToInvoicePdfData({ order, payment, customer: {
    ...customer, companyName: companyId, picName: userId, billingAddress: null,
  } });
  assert.equal(fallback.companyName, 'Customer Ofissio'); assert.equal(fallback.picName, null);
  assert.equal(fallback.companyAddress, null);
  console.log('PASS: foreign-company recipients are rejected and internal IDs cannot appear as company/PIC names.');

  await generateInvoicePdf({ orderId: order.id, actorId: 'admin-fixture' });
  assert.equal(records[0].documentNumber, 'INV-CUS-2610-001');
  assert.equal(records[0].metadata.paymentId, payment.id);
  assert.equal(records[0].metadata.rendererVersion, 'invoice-customer-details-v3');
  assert.equal(records[1].status, 'expired');
  const pdf = Buffer.from(uploaded.data).toString('latin1');
  for (const value of ['Perusahaan Deny', 'Deny', 'Jl. Melati 1 No 21', '40623',
    payment.paymentUrl, '/Subtype /Link', 'LINK EXPIRES', '11 Oktober 2026']) assert(pdf.includes(value), value);
  assert(!pdf.includes(companyId)); assert(!pdf.includes(userId));
  const saved = records[0];
  const reused = await generateInvoicePdf({ orderId: order.id, actorId: 'admin-fixture' });
  assert.equal(reused.idempotent, true); assert.equal(reused.document.id, saved.id);
  assert.equal(payment.status, 'waiting_payment'); assert.equal(order.status, 'waiting_payment');
  console.log('PASS: old PDF version is replaced with the same invoice number; existing payment is retained, hyperlink/QR are present, repeated generation is idempotent.');

  addresses = [];
  const before = ensureCalls;
  await assert.rejects(generateInvoicePdf({ orderId: order.id, actorId: 'admin-fixture' }), /alamat penagihan/);
  assert.equal(ensureCalls, before);
  addresses = [{ ...customer.billingAddress, address_line: 'Jl. Melati 1 No 21' }];
  company = { ...company, name: companyId };
  await assert.rejects(generateInvoicePdf({ orderId: order.id, actorId: 'admin-fixture' }), /nama perusahaan/);
  assert.equal(ensureCalls, before);
  console.log('PASS: incomplete production recipients fail before requesting payment or uploading a PDF.');

  if (process.argv[2]) fs.writeFileSync(process.argv[2], uploaded.data);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
