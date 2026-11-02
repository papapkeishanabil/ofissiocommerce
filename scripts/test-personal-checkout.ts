import assert from "node:assert/strict";
import { resolveCheckoutCustomer } from "../src/features/checkout/checkout-customer.service";
import { checkoutPhone, isCheckoutCompanyComplete } from "../src/features/checkout/checkout-customer";
import { mapPaymentOrderToWooCommerceOrder } from "../src/features/orders/order.mapper";
import { mapOrderToInvoicePdfData } from "../src/features/documents/document.service";
import { getAdminOrderCustomerSnapshot } from "../src/features/admin/admin-order-workbench.service";
import type { PaymentOrderRecord, PaymentRecord } from "../src/features/payment/payment.types";
import type { AuthSession } from "../src/features/auth/auth.types";

async function main() {
  Object.assign(process.env, { DATABASE_PROVIDER: "supabase", NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture", SUPABASE_SERVICE_ROLE_KEY: "fixture" });
  const session: AuthSession = { userId: "user-a", companyId: "company-a", name: "Deny Suhartana", email: "deny@example.test", companyName: "Perusahaan Deny", provider: "supabase", role: "company_admin" };
  let completeCompany = false;
  let addressMissing = false;
  let companyReads = 0;
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "fixture.invalid");
    let rows: unknown[];
    if (url.pathname.endsWith("company_addresses")) {
      assert.equal(url.searchParams.get("company_id"), "eq.company-a");
      assert.equal(url.searchParams.get("id"), "eq.address-a");
      rows = addressMissing ? [] : [{ id: "address-a", label: "Rumah", recipient_name: "Penerima Lain", phone: "081234567890", address_line: "Jalan Contoh 123", city: "Bandung", province: "Jawa Barat", postal_code: "40115" }];
    } else {
      assert.equal(url.pathname, "/rest/v1/companies");
      assert.equal(url.searchParams.get("id"), "eq.company-a");
      companyReads++;
      rows = completeCompany ? [{ name: "PT Contoh", industry: "retail", employee_count: 10, phone: "02112345678", pic_name: "PIC Perusahaan", pic_email: "pic@example.test", pic_whatsapp: "081234567890" }] : [{}];
    }
    return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const individual = await resolveCheckoutCustomer(session, "individual", "address-a");
    assert.equal(individual.name, "Deny Suhartana");
    assert.equal(individual.companyName, undefined);
    assert.equal(individual.shippingAddress.recipientName, "Penerima Lain");
    assert.equal(companyReads, 0, "personal checkout must not require company profile");
    await assert.rejects(resolveCheckoutCustomer(session, "company", "address-a"), /Lengkapi/);
    completeCompany = true;
    const company = await resolveCheckoutCustomer(session, "company", "address-a");
    assert.equal(company.companyName, "PT Contoh");
    assert.equal(company.name, "PIC Perusahaan");
    assert.equal(isCheckoutCompanyComplete({ id: "company-a", companyName: "PT Contoh", industry: "retail", employeeCount: 10, npwp: null, phone: "02112345678", picName: "PIC Perusahaan", picEmail: "pic@example.test", picWhatsapp: "081234567890", profileCompletedAt: null, addresses: [], createdAt: "", updatedAt: "" }), true, "NPWP remains optional when Supabase returns null");
    addressMissing = true;
    await assert.rejects(resolveCheckoutCustomer(session, "individual", "address-a"), /tidak ditemukan/);
    await assert.rejects(resolveCheckoutCustomer(session, "individual"), /Simpan alamat/);
    assert.equal(checkoutPhone("Belum dilengkapi"), "");
    assert.equal(checkoutPhone("+62 812-3456-7890"), "+62 812-3456-7890");
    const order = { id: "order-fixture", companyId: session.companyId, userId: session.userId, customer: individual, items: [], calculation: { itemSubtotal: 100, shippingFee: 10, tax: 11, grandTotal: 121 }, status: "waiting_payment" } as unknown as PaymentOrderRecord;
    const payment = { status: "pending", provider: "mock" } as PaymentRecord;
    const woo = mapPaymentOrderToWooCommerceOrder({ order, payment, companyName: "Perusahaan Otomatis", picName: "Nama Lama" });
    assert.equal(woo.billing?.first_name, "Deny Suhartana");
    assert.equal(woo.billing?.company, undefined);
    assert.equal(woo.shipping?.first_name, "Penerima Lain");
    assert.equal(woo.shipping?.address_1, "Jalan Contoh 123");
    assert.ok(!woo.customer_note?.includes("Perusahaan Otomatis"));
    const invoice = mapOrderToInvoicePdfData({ order, payment: null, invoiceNumber: "INV-TEST", generatedAt: "2026-11-02T00:00:00Z" });
    assert.equal(invoice.companyName, "Deny Suhartana");
    assert.ok(invoice.companyAddress?.includes("Jalan Contoh 123"));
    const admin = await getAdminOrderCustomerSnapshot({ order, tracking: null });
    assert.equal(admin.companyName, "Deny Suhartana");
    assert.equal(admin.shippingAddress?.id, "address-a");
    const corporate = mapPaymentOrderToWooCommerceOrder({ order: { ...order, customer: company }, payment });
    assert.equal(corporate.billing?.company, "PT Contoh");
    console.log("PASS: personal/company checkout, tenant address isolation, account identity, WooCommerce and invoice snapshots, phone placeholders");
  } finally { global.fetch = originalFetch; }
}
void main();
