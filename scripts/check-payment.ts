import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const originalEnv = snapshotEnv([
  "DATABASE_PROVIDER",
  "STORAGE_PROVIDER",
  "PAYMENT_PROVIDER",
  "PAYMENT_MODE",
  "IPAYMU_ENABLED",
  "IPAYMU_MODE",
  "IPAYMU_BASE_URL",
  "IPAYMU_VA",
  "IPAYMU_API_KEY",
  "IPAYMU_NOTIFY_URL",
  "IPAYMU_CALLBACK_URL",
  "IPAYMU_RETURN_URL",
  "IPAYMU_CANCEL_URL",
]);

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Payment check gagal.";
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicIpaymuSecret();
  validateConfiguredMode();
  await runIsolatedCallbackSmoke();
  restoreEnv(originalEnv);
  await maybeCreateRealSandboxPayment();
}

async function runIsolatedCallbackSmoke() {
  Object.assign(process.env, {
    DATABASE_PROVIDER: "mock",
    STORAGE_PROVIDER: "mock",
    PAYMENT_PROVIDER: "ipaymu",
    PAYMENT_MODE: "sandbox",
    IPAYMU_ENABLED: "true",
    IPAYMU_MODE: "sandbox",
    IPAYMU_BASE_URL: "https://sandbox.ipaymu.com",
    IPAYMU_VA: "1179000000000000",
    IPAYMU_API_KEY: "isolated-check-only-not-a-real-secret",
    IPAYMU_NOTIFY_URL: "https://staging.example.test/api/payment/ipaymu/callback",
    IPAYMU_RETURN_URL: "http://localhost:8000/payment/return",
    IPAYMU_CANCEL_URL: "http://localhost:8000/payment/cancel",
  });
  delete process.env.IPAYMU_CALLBACK_URL;

  const [
    { buildCreatePaymentBody, mapIpaymuCreatePaymentResponse },
    { processIpaymuCallback },
    paymentService,
    store,
    tracking,
  ] =
    await Promise.all([
      import("../src/features/payment/providers/ipaymu.provider"),
      import("../src/features/payment/payment.webhook"),
      import("../src/features/payment/payment.service"),
      import("../src/features/payment/payment.store"),
      import("../src/features/tracking/tracking-payment.integration"),
    ]);

  const createOrder = buildOrder("create-idempotent", 410_000);
  store.cachePaymentOrder(createOrder);
  process.env.PAYMENT_PROVIDER = "mock";
  const created = await paymentService.createPaymentForOrder({
    orderId: createOrder.id,
    companyId: createOrder.companyId,
    userId: createOrder.userId,
  });
  const reused = await paymentService.createPaymentForOrder({
    orderId: createOrder.id,
    companyId: createOrder.companyId,
    userId: createOrder.userId,
  });
  assert.equal(created.amount, createOrder.calculation.grandTotal);
  assert.equal(reused.paymentId, created.paymentId);
  assert.equal(reused.idempotent, true);
  const invoicePayment = await paymentService.ensurePaymentForInvoice({
    orderId: createOrder.id,
    companyId: createOrder.companyId,
    userId: createOrder.userId,
  });
  assert.equal(invoicePayment.id, created.paymentId);
  assert.ok(invoicePayment.paymentUrl);
  const [{ repositoryRegistry }, documentService] = await Promise.all([
    import("../src/features/repositories/repository.factory"),
    import("../src/features/documents/document.service"),
  ]);
  await repositoryRegistry.orders.saveOrder?.({ paymentOrder: createOrder });
  const generatedInvoice = await documentService.generateInvoicePdf({
    orderId: createOrder.id,
    actorId: "payment-check-admin",
  });
  assert.equal(generatedInvoice.paymentIncluded, true);
  assert.equal(generatedInvoice.qrIncluded, true);
  assert.equal(generatedInvoice.document.metadata.paymentReference, invoicePayment.referenceId);
  const { getGeneratedPdfSignedUrl } = await import(
    "../src/features/documents/providers/storage-document.provider"
  );
  const invoicePdfUrl = await getGeneratedPdfSignedUrl({
    bucket: generatedInvoice.document.storageBucket,
    key: generatedInvoice.document.storageKey,
    mimeType: generatedInvoice.document.mimeType,
  });
  const invoicePdfBytes = await fetch(invoicePdfUrl.signedUrl).then((response) =>
    response.arrayBuffer(),
  );
  const invoicePdfSource = Buffer.from(invoicePdfBytes).toString("latin1");
  assert.match(invoicePdfSource, /\/Subtype \/Link/);
  assert.match(invoicePdfSource, /\/S \/URI/);
  assert.ok(invoicePdfSource.includes(invoicePayment.paymentUrl!));
  const reusedInvoice = await documentService.generateInvoicePdf({
    orderId: createOrder.id,
    actorId: "payment-check-admin",
  });
  assert.equal(reusedInvoice.document.id, generatedInvoice.document.id);
  assert.equal(reusedInvoice.idempotent, true);
  process.env.PAYMENT_PROVIDER = "ipaymu";
  console.log("PASS: create payment backend-priced dan pending session direuse secara idempotent.");
  console.log("PASS: generate invoice dapat memastikan payment link tanpa membuat payment ganda.");
  console.log("PASS: invoice PDF menyertakan payment link dan QR secara idempotent.");
  console.log("PASS: tombol, QR, dan URL invoice memiliki hyperlink PDF aktif.");

  const bodyOrder = buildOrder("body");
  const createInput = {
    paymentId: "pay_check_body",
    orderId: bodyOrder.id,
    referenceId: bodyOrder.orderNumber!,
    amount: bodyOrder.calculation.grandTotal,
    currency: "IDR" as const,
    order: bodyOrder,
    customer: { companyId: bodyOrder.companyId, userId: bodyOrder.userId },
  };
  const createBody = buildCreatePaymentBody(createInput, 60);
  assert.deepEqual(createBody.qty, [1]);
  assert.deepEqual(createBody.price, [bodyOrder.calculation.grandTotal]);
  assert.equal(createBody.notifyUrl, process.env.IPAYMU_NOTIFY_URL);
  assert.equal(createBody.expired, 1);
  assert.equal(buildCreatePaymentBody(createInput, 1440).expired, 24);
  assert.equal(buildCreatePaymentBody(createInput, 90).expired, 2);
  const beforeExpiry = Date.now();
  const mappedExpiry = mapIpaymuCreatePaymentResponse(createInput, {
    Status: 200,
    Data: { Url: "https://sandbox-payment.ipaymu.com/payment/fixture" },
  }, 90);
  assert.ok(Date.parse(mappedExpiry.expiredAt!) - beforeExpiry >= 2 * 60 * 60 * 1000);
  assert.ok(Date.parse(mappedExpiry.expiredAt!) - Date.now() <= 2 * 60 * 60 * 1000);
  console.log("PASS: create payload memakai grand total backend, bukan amount dari client.");
  console.log("PASS: masa berlaku Ofissio dalam menit dikirim ke iPaymu sebagai jam.");

  const paid = buildPaymentAndOrder("paid", 330_000);
  await store.savePaymentPersisted(paid.payment, paid.order);
  const paidPayload = callbackPayload(paid.payment.referenceId, 330_000, "1", "berhasil");
  const paidHeaders = signedHeaders(paidPayload, "evt-paid-1");
  const paidResult = await processIpaymuCallback(paidPayload, paidHeaders);
  assert.equal(paidResult.status, "paid");
  assert.equal(store.findPaymentById(paid.payment.id)?.status, "paid");
  assert.equal(store.findPaymentOrder(paid.order.id)?.status, "payment_received");
  assert.equal(tracking.getTrackingFromPaymentOrder(paid.order.id)?.paymentStatus, "paid");
  const paidEvents = await store.listPaymentEvents({
    companyId: paid.order.companyId,
    paymentId: paid.payment.id,
  });
  assert.equal(paidEvents.filter((event) => event.eventType === "payment_paid").length, 1);
  console.log("PASS: callback paid valid memperbarui payment, order, tracking, dan event.");

  const feeInclusive = buildPaymentAndOrder("fee-inclusive", 10_000);
  await store.savePaymentPersisted(feeInclusive.payment, feeInclusive.order);
  const feeInclusivePayload = {
    ...callbackPayload(feeInclusive.payment.referenceId, 10_000, "1", "berhasil"),
    amount: "10180",
    total: "10180",
    sub_total: "10000",
    fee: "250",
    paid_off: "9930",
    is_escrow: "true",
  };
  const feeInclusiveResult = await processIpaymuCallback(
    feeInclusivePayload,
    signedHeaders(feeInclusivePayload, "evt-fee-inclusive"),
  );
  assert.equal(feeInclusiveResult.status, "paid");
  assert.equal(store.findPaymentById(feeInclusive.payment.id)?.status, "paid");
  assert.equal(store.findPaymentOrder(feeInclusive.order.id)?.status, "payment_received");
  console.log(
    "PASS: callback dengan biaya escrow memvalidasi sub_total order dan tetap mencatat payment paid.",
  );

  const duplicate = await processIpaymuCallback(paidPayload, paidHeaders);
  assert.equal(duplicate.idempotent, true);
  const duplicateEvents = await store.listPaymentEvents({
    companyId: paid.order.companyId,
    paymentId: paid.payment.id,
  });
  assert.equal(
    duplicateEvents.filter((event) => event.eventType === "payment_paid").length,
    1,
  );
  console.log("PASS: duplicate callback idempotent dan tidak menggandakan payment_paid.");

  const retry = buildPaymentAndOrder("retry-late", 92_000);
  await store.savePaymentPersisted(retry.payment, retry.order);
  const interrupted = await paymentService.createPaymentForOrder({
    orderId: retry.order.id,
    companyId: retry.order.companyId,
    userId: retry.order.userId,
  });
  assert.equal(interrupted.paymentId, retry.payment.id);
  assert.equal(interrupted.idempotent, true);

  const firstFailure = callbackPayload(retry.payment.referenceId, 92_000, "-1", "gagal");
  await processIpaymuCallback(firstFailure, signedHeaders(firstFailure, "evt-retry-failed"));
  assert.equal(store.findPaymentById(retry.payment.id)?.status, "failed");
  assert.equal(store.findPaymentOrder(retry.order.id)?.status, "payment_failed");
  const replacement = {
    ...retry.payment,
    id: "pay_check_retry-late_2",
    referenceId: `${retry.order.orderNumber}-PAY-2`,
    status: "waiting_payment" as const,
    createdAt: new Date(Date.parse(retry.payment.createdAt) + 1000).toISOString(),
  };
  await store.savePaymentPersisted(
    replacement,
    store.findPaymentOrder(retry.order.id)!,
    { persistOrder: false },
  );
  const beforeLateSuccess = await paymentService.getPaymentStatus({
    orderId: retry.order.id,
    companyId: retry.order.companyId,
  });
  assert.equal(beforeLateSuccess?.paymentId, replacement.id);

  const oldSuccess = callbackPayload(retry.payment.referenceId, 92_000, "1", "berhasil");
  await processIpaymuCallback(oldSuccess, signedHeaders(oldSuccess, "evt-retry-old-paid"));
  assert.equal(store.findPaymentOrder(retry.order.id)?.status, "payment_received");
  const afterLateSuccess = await paymentService.getPaymentStatus({
    orderId: retry.order.id,
    companyId: retry.order.companyId,
  });
  assert.equal(afterLateSuccess?.paymentId, retry.payment.id);
  assert.equal(afterLateSuccess?.status, "paid");
  assert.equal((await repositoryRegistry.payments.getPaymentByOrderId?.({
    orderId: retry.order.id,
    companyId: retry.order.companyId,
  }))?.id, retry.payment.id);
  const retryAfterPaid = await paymentService.createPaymentForOrder({
    orderId: retry.order.id,
    companyId: retry.order.companyId,
    userId: retry.order.userId,
  });
  assert.equal(retryAfterPaid.paymentId, retry.payment.id);
  assert.equal(retryAfterPaid.idempotent, true);

  const newerFailure = callbackPayload(replacement.referenceId, 92_000, "-1", "gagal");
  await processIpaymuCallback(newerFailure, signedHeaders(newerFailure, "evt-retry-new-failed"));
  assert.equal(store.findPaymentOrder(retry.order.id)?.status, "payment_received");
  assert.equal((await paymentService.getPaymentStatus({
    orderId: retry.order.id,
    companyId: retry.order.companyId,
  }))?.status, "paid");
  console.log("PASS: koneksi putus memakai link sama; sukses link lama menang atas retry dan gagal terlambat.");

  const olderFailure = buildPaymentAndOrder("retry-old-failed", 94_000);
  await store.savePaymentPersisted(olderFailure.payment, olderFailure.order);
  const olderFailedPayload = callbackPayload(olderFailure.payment.referenceId, 94_000, "-1", "gagal");
  await processIpaymuCallback(olderFailedPayload, signedHeaders(olderFailedPayload, "evt-old-failed"));
  assert.equal(store.findPaymentOrder(olderFailure.order.id)?.status, "payment_failed");
  process.env.PAYMENT_PROVIDER = "mock";
  const newerAttempt = await paymentService.createPaymentForOrder({
    orderId: olderFailure.order.id,
    companyId: olderFailure.order.companyId,
    userId: olderFailure.order.userId,
  });
  process.env.PAYMENT_PROVIDER = "ipaymu";
  assert.notEqual(newerAttempt.paymentId, olderFailure.payment.id);
  assert.equal(store.findPaymentOrder(olderFailure.order.id)?.status, "waiting_payment");
  // Retry may be created within the same millisecond as the previous attempt.
  // The -PAY-2 reference must still outrank the old -PAY-1 callback.
  await store.updatePaymentRecordPersisted(newerAttempt.paymentId, {
    createdAt: olderFailure.payment.createdAt,
  });
  const lateFailure = callbackPayload(olderFailure.payment.referenceId, 94_000, "-2", "expired");
  await processIpaymuCallback(lateFailure, signedHeaders(lateFailure, "evt-old-expired"));
  assert.equal(store.findPaymentOrder(olderFailure.order.id)?.status, "waiting_payment");
  assert.equal((await paymentService.getPaymentStatus({
    orderId: olderFailure.order.id,
    companyId: olderFailure.order.companyId,
  }))?.paymentId, newerAttempt.paymentId);
  console.log("PASS: retry baru mengembalikan order menunggu pembayaran; callback gagal link lama tidak menimpa statusnya.");

  const doublePaid = buildPaymentAndOrder("retry-double", 93_000);
  await store.savePaymentPersisted(doublePaid.payment, doublePaid.order);
  const secondAttempt = {
    ...doublePaid.payment,
    id: "pay_check_retry-double_2",
    referenceId: `${doublePaid.order.orderNumber}-PAY-2`,
    createdAt: new Date(Date.parse(doublePaid.payment.createdAt) + 1000).toISOString(),
  };
  await store.savePaymentPersisted(secondAttempt, doublePaid.order, { persistOrder: false });
  const firstPaid = callbackPayload(doublePaid.payment.referenceId, 93_000, "1", "berhasil");
  await processIpaymuCallback(firstPaid, signedHeaders(firstPaid, "evt-double-first"));
  const secondPaid = callbackPayload(secondAttempt.referenceId, 93_000, "1", "berhasil");
  const doubleResult = await processIpaymuCallback(
    secondPaid, signedHeaders(secondPaid, "evt-double-second"),
  );
  assert.equal(doubleResult.manualReview, true);
  assert.equal(store.findPaymentById(secondAttempt.id)?.status, "manual_review");
  assert.ok(store.findPaymentById(secondAttempt.id)?.paidAt);
  assert.equal(store.findPaymentOrder(doublePaid.order.id)?.status, "payment_received");
  assert.equal((await paymentService.getPaymentStatus({
    orderId: doublePaid.order.id,
    companyId: doublePaid.order.companyId,
  }))?.status, "manual_review");
  const doubleEvents = await store.listPaymentEvents({
    companyId: doublePaid.order.companyId,
    orderId: doublePaid.order.id,
  });
  assert.equal(doubleEvents.filter((event) => event.eventType === "payment_paid").length, 1);
  console.log("PASS: pembayaran kedua pada order sama perlu verifikasi manual, bukan dua order lunas.");

  const { selectPaymentForOrder } = await import("../src/features/payment/payment-attempts");
  const deposit = { ...paid.payment, paymentPurpose: "deposit" as const, status: "paid" as const };
  const balance = {
    ...paid.payment,
    id: "pay_balance_pending",
    paymentPurpose: "balance" as const,
    status: "waiting_payment" as const,
    createdAt: new Date(Date.parse(paid.payment.createdAt) + 1000).toISOString(),
  };
  assert.equal(selectPaymentForOrder([deposit, balance])?.id, balance.id);
  console.log("PASS: tagihan pelunasan aktif tetap ditampilkan setelah DP diterima.");

  const invalid = buildPaymentAndOrder("invalid-signature", 125_000);
  await store.savePaymentPersisted(invalid.payment, invalid.order);
  const invalidPayload = callbackPayload(
    invalid.payment.referenceId,
    125_000,
    "1",
    "berhasil",
  );
  await assert.rejects(
    processIpaymuCallback(
      invalidPayload,
      new Headers({ "x-signature": "0".repeat(64), "x-external-id": "evt-invalid" }),
    ),
  );
  assert.equal(store.findPaymentById(invalid.payment.id)?.status, "waiting_payment");
  console.log("PASS: invalid signature ditolak dan order tetap waiting_payment.");

  const mismatch = buildPaymentAndOrder("amount-mismatch", 225_000);
  await store.savePaymentPersisted(mismatch.payment, mismatch.order);
  const mismatchPayload = callbackPayload(
    mismatch.payment.referenceId,
    225_001,
    "1",
    "berhasil",
  );
  const mismatchResult = await processIpaymuCallback(
    mismatchPayload,
    signedHeaders(mismatchPayload, "evt-mismatch"),
  );
  assert.equal(mismatchResult.status, "manual_review");
  assert.equal(store.findPaymentById(mismatch.payment.id)?.status, "manual_review");
  assert.equal(store.findPaymentOrder(mismatch.order.id)?.status, "waiting_payment");
  console.log("PASS: amount mismatch masuk manual_review dan tidak mengubah order menjadi paid.");

  const unknown = buildPaymentAndOrder("unknown", 175_000);
  await store.savePaymentPersisted(unknown.payment, unknown.order);
  const unknownPayload = callbackPayload(
    unknown.payment.referenceId,
    175_000,
    "99",
    "mystery",
  );
  const unknownResult = await processIpaymuCallback(
    unknownPayload,
    signedHeaders(unknownPayload, "evt-unknown"),
  );
  assert.equal(unknownResult.status, "manual_review");
  assert.equal(store.findPaymentOrder(unknown.order.id)?.status, "waiting_payment");
  console.log("PASS: unknown status tidak dianggap paid dan diarahkan ke manual_review.");

  await assertReturnAndCancelPagesAreReadOnly();
  console.log("PASS: return/cancel page read-only dan tidak menandai pembayaran lunas.");
}

function validateConfiguredMode() {
  const provider = process.env.PAYMENT_PROVIDER === "ipaymu" ? "ipaymu" : "mock";
  console.log(`PAYMENT_PROVIDER=${provider}`);
  if (provider === "mock") {
    console.log("OK: mode aplikasi mock; transaksi iPaymu nyata tidak dibuat.");
    return;
  }

  const required = [
    "PAYMENT_MODE",
    "IPAYMU_ENABLED",
    "IPAYMU_MODE",
    "IPAYMU_BASE_URL",
    "IPAYMU_VA",
    "IPAYMU_API_KEY",
    "IPAYMU_NOTIFY_URL",
    "IPAYMU_RETURN_URL",
    "IPAYMU_CANCEL_URL",
  ] as const;
  const missing = required.filter((name) => !process.env[name]?.trim());
  assert.deepEqual(missing, [], `Env iPaymu belum lengkap: ${missing.join(", ")}`);
  assert.equal(process.env.IPAYMU_ENABLED, "true", "IPAYMU_ENABLED harus true.");
  assert.ok(["sandbox", "live"].includes(process.env.PAYMENT_MODE ?? ""));
  assert.equal(process.env.PAYMENT_MODE, process.env.IPAYMU_MODE);
  const mode = process.env.IPAYMU_MODE;
  const baseHost = new URL(process.env.IPAYMU_BASE_URL!).hostname;
  assert.equal(
    baseHost,
    mode === "live" ? "my.ipaymu.com" : "sandbox.ipaymu.com",
    "Host iPaymu tidak sesuai mode.",
  );
  const notify = new URL(process.env.IPAYMU_NOTIFY_URL!);
  assert.equal(notify.protocol, "https:");
  assert.ok(!["localhost", "127.0.0.1", "::1"].includes(notify.hostname));
  console.log(`OK: konfigurasi ${mode} lengkap dan notify URL publik.`);
}

async function maybeCreateRealSandboxPayment() {
  if (process.env.IPAYMU_TEST_CREATE_PAYMENT !== "true") {
    console.log("SKIP: transaksi sandbox nyata (IPAYMU_TEST_CREATE_PAYMENT=false). ");
    return;
  }
  assert.equal(process.env.PAYMENT_PROVIDER, "ipaymu");
  assert.equal(process.env.PAYMENT_MODE, "sandbox");
  assert.equal(process.env.IPAYMU_MODE, "sandbox");
  const { createPaymentLink } = await import(
    "../src/features/payment/providers/ipaymu.provider"
  );
  const referenceId = `OF-CHECK-${Date.now()}`;
  const result = await createPaymentLink({
    paymentId: `pay_${referenceId}`,
    orderId: `ord_${referenceId}`,
    referenceId,
    amount: 10_000,
    currency: "IDR",
    customer: { companyId: "payment-check", userId: "payment-check" },
  });
  assert.ok(result.paymentUrl);
  console.log("PASS: sesi pembayaran sandbox nyata dibuat atas flag eksplisit.");
  console.log(`Reference ID: ${referenceId}`);
  console.log(`Session ID: ${result.providerPaymentId ?? "tidak dikembalikan iPaymu"}`);
  console.log(`Payment URL: ${result.paymentUrl}`);
  console.log(
    "INFO: sesi provider-only ini tidak disimpan sebagai order/payment Ofissio; gunakan payment link dari Admin Order untuk callback end-to-end.",
  );
}

async function assertReturnAndCancelPagesAreReadOnly() {
  const files = [
    "src/app/payment/return/page.tsx",
    "src/app/payment/success/page.tsx",
    "src/app/payment/cancel/page.tsx",
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /updatePayment|completeMockPayment|processIpaymuCallback/);
  }
  const returnSource = await readFile(files[0]!, "utf8");
  assert.match(returnSource, /sedang memverifikasi pembayaran/i);
}

function buildPaymentAndOrder(suffix: string, amount: number) {
  const order = buildOrder(suffix, amount);
  const now = new Date().toISOString();
  return {
    order,
    payment: {
      id: `pay_check_${suffix}`,
      orderId: order.id,
      companyId: order.companyId,
      provider: "ipaymu" as const,
      referenceId: `${order.orderNumber}-PAY-1`,
      providerPaymentId: `sid_${suffix}`,
      providerTransactionId: null,
      amount,
      currency: "IDR" as const,
      status: "waiting_payment" as const,
      paymentUrl: `https://sandbox.ipaymu.com/payment/${suffix}`,
      paymentQrUrl: null,
      paymentQrDataUrl: null,
      paymentQrString: null,
      paymentMethod: null,
      paymentChannel: null,
      uniqueCode: 0,
      expiredAt: new Date(Date.now() + 3_600_000).toISOString(),
      paidAt: null,
      failedAt: null,
      cancelledAt: null,
      callbackReceivedAt: null,
      callbackStatus: null,
      callbackReference: null,
      callbackAmount: null,
      callbackRawSafeJson: null,
      invoiceDocumentId: null,
      rawProviderResponse: { sandboxCheck: true },
      createdAt: now,
      updatedAt: now,
    },
  };
}

function buildOrder(suffix: string, amount = 330_000) {
  const now = new Date().toISOString();
  return {
    id: `ord_check_${suffix}`,
    orderNumber: `OF-CHECK-${suffix.toUpperCase()}`,
    cartId: `cart_check_${suffix}`,
    companyId: `company_check_${suffix}`,
    userId: `user_check_${suffix}`,
    items: [],
    shippingRateId: null,
    calculation: {
      itemSubtotal: amount,
      customizationFee: 0,
      shippingFee: 0,
      tax: 0,
      grandTotal: amount,
    },
    status: "waiting_payment" as const,
    quotationId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function callbackPayload(
  referenceId: string,
  amount: number,
  statusCode: string,
  status: string,
) {
  return {
    reference_id: referenceId,
    referenceId,
    amount: String(amount),
    total: String(amount),
    sub_total: String(amount),
    status,
    status_code: statusCode,
    transaction_status_code: statusCode,
    trx_id: String(Math.abs(hashCode(referenceId))),
    sid: `SID-${referenceId}`,
    paid_off: String(amount),
    is_escrow: "0",
    additional_info: [],
  };
}

function signedHeaders(payload: Record<string, unknown>, externalId: string) {
  return new Headers({
    "x-signature": signCallback(payload, process.env.IPAYMU_VA!),
    "x-external-id": externalId,
  });
}

function signCallback(payload: Record<string, unknown>, va: string) {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "is_escrow") {
      normalized[key] = value === true || value === "true" || value === "1" || value === 1;
    } else if (["trx_id", "status_code", "transaction_status_code", "paid_off"].includes(key)) {
      normalized[key] = Number.parseInt(String(value), 10);
    } else if (key === "additional_info") {
      normalized[key] = value === "[]" || value == null ? [] : value;
    } else if (value === null) {
      normalized[key] = "null";
    } else {
      normalized[key] = String(value);
    }
  }
  if (!("additional_info" in normalized)) normalized.additional_info = [];
  const sorted = Object.keys(normalized)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = normalized[key];
      return result;
    }, {});
  const json = JSON.stringify(sorted).replace(/\//g, "\\/");
  return createHmac("sha256", va).update(json).digest("hex");
}

function assertNoPublicIpaymuSecret() {
  const forbidden = [
    "NEXT_PUBLIC_IPAYMU_API_KEY",
    "NEXT_PUBLIC_IPAYMU_VA",
    "NEXT_PUBLIC_IPAYMU_SECRET",
  ];
  const found = forbidden.filter((name) => process.env[name]?.trim());
  assert.deepEqual(found, [], `Forbidden public payment secret: ${found.join(", ")}`);
}

function snapshotEnv(names: string[]) {
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function hashCode(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return hash || 1;
}

function printHeader() {
  const title = "Ofissio payment hardening check";
  console.log(title);
  console.log("-".repeat(title.length));
}
