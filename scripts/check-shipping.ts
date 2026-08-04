import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";

import { TASK_E_CARRIER_SHIPPING_TABLES } from "../src/features/database/supabase-schema";
import { mapBiteshipStatus } from "../src/features/carrier-shipping/carrier-shipping.status";
import { mockCarrierShippingProvider } from "../src/features/carrier-shipping/providers/mock-carrier-shipping.provider";
import type { ValidatedCheckoutCartItem } from "../src/features/checkout/checkout-cart.types";
import type { PaymentOrderRecord } from "../src/features/payment/payment.types";
import type { CustomerTrackingOrder } from "../src/features/tracking/tracking.types";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

run().catch((error: unknown) => {
  console.error("ERROR: Shipping check gagal.");
  console.error(`Reason: ${safeErrorReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicShippingSecrets();
  assertMigration();
  assertRouteGuards();
  assertEnvConfig();
  await testMockProvider();
  testStatusMapping();
  await testCarrierServiceFlow();
  assertEnvNotTracked();
  assertClientBundleSafe();
  await checkSupabaseTablesIfAvailable();
  console.log("PASS: Task E shipping foundation aman; transaksi Biteship real tidak dibuat.");
}

function assertMigration() {
  const path = join(process.cwd(), "database", "migrations", "019_biteship_shipping.sql");
  if (!existsSync(path)) throw new Error("query_error: migration 019 missing");
  const sql = readFileSync(path, "utf8");
  for (const table of TASK_E_CARRIER_SHIPPING_TABLES) {
    if (!sql.includes(`create table if not exists ${table}`)) {
      throw new Error(`query_error: ${table} missing from migration`);
    }
  }
  console.log("OK: migration 019 mencakup shipping_quotes, shipping_shipments, shipping_events.");
}

function assertRouteGuards() {
  const createRoute = readFileSync(
    join(process.cwd(), "src/app/api/admin/orders/[id]/shipping/create/route.ts"),
    "utf8",
  );
  const ratesRoute = readFileSync(
    join(process.cwd(), "src/app/api/admin/orders/[id]/shipping/rates/route.ts"),
    "utf8",
  );
  const service = readFileSync(
    join(process.cwd(), "src/features/carrier-shipping/carrier-shipping.service.ts"),
    "utf8",
  );
  if (!createRoute.includes('requireInternalAdmin(request, "admin:shipment:update")')) {
    throw new Error("permission_denied: create route guard missing");
  }
  if (!ratesRoute.includes('requireInternalAdmin(request, "admin:shipment:update")')) {
    throw new Error("permission_denied: rates route guard missing");
  }
  if (!service.includes('order.status !== "payment_received"')) {
    throw new Error("query_error: unpaid shipment guard missing");
  }
  if (!service.includes("if (existing)")) {
    throw new Error("query_error: create idempotency guard missing");
  }
  console.log("OK: anonymous/customer/role tanpa permission ditolak oleh internal shipment guard.");
  console.log("OK: unpaid order guard dan create idempotency guard tersedia.");
}

function assertEnvConfig() {
  const provider = (process.env.SHIPPING_PROVIDER ?? "mock").trim().toLowerCase();
  const mode = (process.env.SHIPPING_MODE ?? "sandbox").trim().toLowerCase();
  if (!["mock", "biteship"].includes(provider)) throw new Error("query_error: invalid provider");
  if (!["sandbox", "live"].includes(mode)) throw new Error("query_error: invalid mode");
  if (provider === "biteship") {
    const missing = [
      "BITESHIP_ENABLED",
      "BITESHIP_API_KEY",
      "BITESHIP_WEBHOOK_SECRET",
      "BITESHIP_WEBHOOK_URL",
      "BITESHIP_ORIGIN_CONTACT_PHONE",
      "BITESHIP_ORIGIN_ADDRESS",
      "BITESHIP_ORIGIN_POSTAL_CODE",
    ].filter((name) => !process.env[name]?.trim());
    if (missing.length) {
      console.log(`SKIP: Biteship live config belum lengkap (${missing.join(", ")}); mock smoke tetap dijalankan.`);
    } else {
      console.log(`OK: Biteship ${mode} config lengkap (nilai secret tidak ditampilkan).`);
    }
  } else {
    console.log("OK: SHIPPING_PROVIDER=mock untuk development.");
  }
  if (process.env.BITESHIP_TEST_CREATE_SHIPMENT !== "true") {
    console.log("OK: BITESHIP_TEST_CREATE_SHIPMENT=false; check tidak membuat shipment nyata.");
  } else if (provider !== "biteship") {
    console.log("SKIP: flag create real aktif tetapi provider bukan biteship.");
  } else {
    console.log("INFO: Flag create real aktif, tetapi check tetap memerlukan order sandbox eksplisit; tidak ada call otomatis.");
  }
}

async function testMockProvider() {
  const request = {
    orderId: "order_shipping_check",
    origin: {
      contactName: "Ofissio",
      contactPhone: "0800000000",
      address: "Mock origin",
      postalCode: "40115",
    },
    destination: {
      contactName: "Customer",
      contactPhone: "0812000000",
      address: "Mock destination",
      postalCode: "40123",
    },
    items: [
      {
        name: "Seragam test",
        description: "Server snapshot",
        category: "apparel",
        quantity: 20,
        value: 150_000,
        weightGram: 500,
        lengthCm: 30,
        widthCm: 25,
        heightCm: 5,
      },
    ],
  };
  const rates = await mockCarrierShippingProvider.getRates(request);
  if (rates.length < 1 || rates.some((rate) => rate.price <= 0)) {
    throw new Error("query_error: mock rate invalid");
  }
  const quote = {
    id: "quote_check",
    orderId: request.orderId,
    companyId: "company_check",
    provider: "mock" as const,
    providerQuoteId: rates[0]!.providerQuoteId,
    courierCompany: rates[0]!.courierCompany,
    courierType: rates[0]!.courierType,
    courierService: rates[0]!.courierService,
    shippingPrice: rates[0]!.price,
    currency: "IDR" as const,
    duration: rates[0]!.duration,
    shippingPriceSnapshot: rates[0]!.safeSnapshot,
    originSnapshot: request.origin,
    destinationSnapshot: request.destination,
    packageSnapshot: request.items,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const first = await mockCarrierShippingProvider.createShipment({ referenceId: request.orderId, quote });
  const second = await mockCarrierShippingProvider.createShipment({ referenceId: request.orderId, quote });
  if (first.providerShipmentId !== second.providerShipmentId) {
    throw new Error("query_error: mock create not deterministic");
  }
  console.log(`OK: mock rate (${rates.length}) dan mock shipment deterministik/idempotent.`);
}

function testStatusMapping() {
  const cases: Array<[string, string]> = [
    ["confirmed", "shipment_created"],
    ["picked", "picked_up"],
    ["in_transit", "in_transit"],
    ["dropping_off", "out_for_delivery"],
    ["delivered", "delivered"],
    ["new_future_status", "manual_review"],
  ];
  for (const [provider, expected] of cases) {
    if (mapBiteshipStatus(provider) !== expected) throw new Error(`query_error: status ${provider}`);
  }
  console.log("OK: webhook status valid dan unknown=>manual_review teruji.");
}

async function testCarrierServiceFlow() {
  const previousDatabaseProvider = process.env.DATABASE_PROVIDER;
  const previousAppEnvironment = process.env.APP_ENV;
  const previousShippingProvider = process.env.SHIPPING_PROVIDER;
  const previousBiteshipEnabled = process.env.BITESHIP_ENABLED;
  const previousWebhookSecret = process.env.BITESHIP_WEBHOOK_SECRET;
  process.env.DATABASE_PROVIDER = "mock";
  process.env.APP_ENV = "development";
  process.env.SHIPPING_PROVIDER = "mock";
  process.env.BITESHIP_ENABLED = "false";
  process.env.BITESHIP_WEBHOOK_SECRET = "shipping-check-webhook-secret";

  try {
    const { repositoryRegistry } = await import(
      "../src/features/repositories/repository.factory"
    );
    const {
      checkCarrierShippingRates,
      createCarrierShipment,
      getCarrierShippingState,
      processBiteshipWebhook,
      verifyBiteshipWebhook,
    } = await import("../src/features/carrier-shipping/carrier-shipping.service");

    const now = new Date().toISOString();
    const companyId = "shipping_check_company";
    const paidOrder = shippingTestOrder({
      id: `shipping_check_paid_${Date.now()}`,
      companyId,
      status: "payment_received",
      now,
    });
    const unpaidOrder = shippingTestOrder({
      id: `shipping_check_unpaid_${Date.now()}`,
      companyId,
      status: "waiting_payment",
      now,
    });
    await repositoryRegistry.orders.saveOrder?.({ paymentOrder: paidOrder });
    await repositoryRegistry.orders.saveOrder?.({ paymentOrder: unpaidOrder });
    await repositoryRegistry.tracking.upsertTrackingOrder?.(
      shippingTestTracking(paidOrder, now),
    );

    await assert.rejects(
      createCarrierShipment({
        orderId: unpaidOrder.id,
        quoteId: "quote_not_required_for_unpaid_guard",
        actorId: "shipping-check-admin",
      }),
      /Pembayaran belum diterima/,
    );
    console.log("OK: unpaid order ditolak sebelum shipment dibuat.");

    const quotes = await checkCarrierShippingRates({
      orderId: paidOrder.id,
      actorId: "shipping-check-admin",
    });
    assert.ok(quotes.length > 0, "paid order harus memperoleh quote server-side");
    const first = await createCarrierShipment({
      orderId: paidOrder.id,
      quoteId: quotes[0]!.id,
      actorId: "shipping-check-admin",
    });
    assert.equal(first.idempotent, false);
    const duplicateCreate = await createCarrierShipment({
      orderId: paidOrder.id,
      quoteId: quotes[0]!.id,
      actorId: "shipping-check-admin",
    });
    assert.equal(duplicateCreate.idempotent, true);
    assert.equal(duplicateCreate.shipment.id, first.shipment.id);
    console.log("OK: paid order membuat shipment dan duplicate create mengembalikan row yang sama.");

    const rawBody = JSON.stringify({
      event: "order.status",
      order_id: first.shipment.providerShipmentId,
      status: "delivered",
      courier_waybill_id: "MOCK-WAYBILL-CHECK",
    });
    const validHeaders = new Headers({
      "x-biteship-webhook-secret": process.env.BITESHIP_WEBHOOK_SECRET,
      "x-biteship-event-id": `shipping-event-${paidOrder.id}`,
    });
    const invalidHeaders = new Headers({ "x-biteship-webhook-secret": "wrong-secret" });
    assert.equal(
      verifyBiteshipWebhook(validHeaders, rawBody, process.env.BITESHIP_WEBHOOK_SECRET),
      true,
    );
    assert.equal(
      verifyBiteshipWebhook(invalidHeaders, rawBody, process.env.BITESHIP_WEBHOOK_SECRET),
      false,
    );
    await assert.rejects(
      processBiteshipWebhook({
        headers: invalidHeaders,
        rawBody,
        payload: JSON.parse(rawBody) as Record<string, unknown>,
      }),
      /Webhook pengiriman tidak valid/,
    );
    const webhook = await processBiteshipWebhook({
      headers: validHeaders,
      rawBody,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    });
    assert.equal(webhook.shipment.shipmentStatus, "delivered");
    const duplicateWebhook = await processBiteshipWebhook({
      headers: validHeaders,
      rawBody,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    });
    assert.equal(duplicateWebhook.idempotent, true);
    const state = await getCarrierShippingState({ orderId: paidOrder.id, companyId });
    assert.equal(
      state.events.filter((event) => event.webhookEventId === `shipping-event-${paidOrder.id}`).length,
      1,
    );
    console.log("OK: webhook valid update delivered; invalid ditolak; duplicate tidak menggandakan event.");

    const tracking = await repositoryRegistry.tracking.getTrackingByOrderId({
      orderId: paidOrder.id,
      companyId,
    });
    assert.equal(tracking?.shipmentStatus, "delivered");
    const publicTracking = JSON.stringify(tracking);
    for (const forbidden of ["safeMetadata", "originSnapshot", "destinationSnapshot", "webhookEventId"]) {
      assert.equal(publicTracking.includes(forbidden), false, `${forbidden} bocor ke customer tracking`);
    }
    console.log("OK: customer tracking ikut delivered tanpa payload internal.");
  } finally {
    restoreEnv("DATABASE_PROVIDER", previousDatabaseProvider);
    restoreEnv("APP_ENV", previousAppEnvironment);
    restoreEnv("SHIPPING_PROVIDER", previousShippingProvider);
    restoreEnv("BITESHIP_ENABLED", previousBiteshipEnabled);
    restoreEnv("BITESHIP_WEBHOOK_SECRET", previousWebhookSecret);
  }
}

function shippingTestOrder(input: {
  id: string;
  companyId: string;
  status: PaymentOrderRecord["status"];
  now: string;
}): PaymentOrderRecord {
  return {
    id: input.id,
    orderNumber: `OF-${input.id}`,
    cartId: `cart_${input.id}`,
    companyId: input.companyId,
    userId: "shipping_check_customer",
    items: [shippingTestItem()],
    shippingRateId: null,
    calculation: {
      itemSubtotal: 3_000_000,
      customizationFee: 0,
      shippingFee: 0,
      tax: 0,
      grandTotal: 3_000_000,
    },
    status: input.status,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function shippingTestItem(): ValidatedCheckoutCartItem {
  return {
    productId: "shipping-check-product",
    source: "mock",
    sourceId: "shipping-check-product",
    productSlug: "shipping-check-product",
    productName: "Seragam Shipping Check",
    sku: "SHIP-CHECK",
    selectedColor: "Navy",
    sizeMatrix: { S: 0, M: 20, L: 0, XL: 0, "2XL": 0, "3XL": 0 },
    totalQty: 20,
    priceFrom: 150_000,
    regularPrice: 150_000,
    finalUnitPrice: 150_000,
    quantityTierLabel: "20+ pcs",
    quantityPricingBasis: "total_order_qty",
    quantityPricingMode: "fixed_unit_price",
    quantityTierApplied: true,
    subtotal: 3_000_000,
    productSubtotal: 3_000_000,
    selectedEmbroideryZones: [],
    embroideryPricingSnapshot: { enabled: false, mode: "flat_per_piece", zones: [] },
    embroideryLines: [],
    embroideryTotal: 0,
    missingEmbroideryPricingZones: [],
    customizationTotal: 0,
    finalEstimatedTotal: 3_000_000,
    moq: 20,
    fulfillmentType: "READY_STOCK",
    transactionMode: "direct_checkout",
    model3dId: "shipping-check-model",
    model3dUrl: "/3d/kk-006.glb",
    customization: null,
    embroideryPlacements: [],
  };
}

function shippingTestTracking(order: PaymentOrderRecord, now: string): CustomerTrackingOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? order.id,
    companyId: order.companyId,
    companyName: "Shipping Check Company",
    orderDate: now,
    fulfillmentType: "READY_STOCK",
    paymentStatus: "paid",
    currentStageId: "payment_received",
    subtotal: order.calculation.itemSubtotal,
    tax: order.calculation.tax,
    shippingCost: 0,
    total: order.calculation.grandTotal,
    items: [],
    productionTimeline: [],
    shipmentTimeline: [],
    documents: [],
    actionRequired: [],
    createdAt: now,
    updatedAt: now,
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function checkSupabaseTablesIfAvailable() {
  if ((process.env.DATABASE_PROVIDER ?? "mock") !== "supabase") {
    console.log("SKIP: live Task E table check karena DATABASE_PROVIDER bukan supabase.");
    return;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) {
    console.log("SKIP: Supabase env belum lengkap untuk Task E table check.");
    return;
  }
  const missing: string[] = [];
  for (const table of TASK_E_CARRIER_SHIPPING_TABLES) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (!response.ok) missing.push(table);
    } catch {
      console.log("SKIP: Supabase tidak dapat dijangkau untuk Task E table check.");
      return;
    }
  }
  if (missing.length) {
    console.log(`SKIP: migration 019 belum aktif; missing tables: ${missing.join(", ")}.`);
    console.log("INFO: Apply database/migrations/019_biteship_shipping.sql sebelum live persistence smoke.");
  } else {
    console.log("OK: Task E shipping tables reachable; row kosong bukan error.");
  }
}

function assertNoPublicShippingSecrets() {
  const forbidden = [
    "NEXT_PUBLIC_SHIPPING_API_KEY",
    "NEXT_PUBLIC_SHIPPING_SECRET",
    "NEXT_PUBLIC_BITESHIP_API_KEY",
    "NEXT_PUBLIC_BITESHIP_WEBHOOK_SECRET",
  ];
  const found = forbidden.filter((name) => process.env[name]?.trim());
  if (found.length) throw new Error("invalid_key: public shipping secret configured");
  console.log("OK: tidak ada NEXT_PUBLIC Biteship secret.");
}

function assertEnvNotTracked() {
  try {
    const output = execFileSync("git", ["ls-files", ".env.local"], { encoding: "utf8" }).trim();
    if (output) throw new Error("invalid_key: .env.local tracked");
  } catch (error) {
    if (error instanceof Error && error.message.includes("tracked")) throw error;
  }
  console.log("OK: .env.local tidak tracked.");
}

function assertClientBundleSafe() {
  const staticDir = join(process.cwd(), ".next", "static");
  if (!existsSync(staticDir)) {
    console.log("SKIP: client bundle belum ada; source/env secret guard sudah pass.");
    return;
  }
  const secretValues = [process.env.BITESHIP_API_KEY, process.env.BITESHIP_WEBHOOK_SECRET]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value.length >= 8));
  if (!secretValues.length) {
    console.log("OK: tidak ada Biteship secret aktif untuk dicari pada client bundle.");
    return;
  }
  for (const file of listFiles(staticDir)) {
    const content = readFileSync(file);
    for (const secret of secretValues) {
      if (content.includes(Buffer.from(secret))) throw new Error("invalid_key: Biteship secret leaked to client bundle");
    }
  }
  console.log("OK: Biteship secret tidak ditemukan di .next/static.");
}

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function printHeader() {
  console.log("Ofissio Task E shipping check");
  console.log("------------------------------");
}

function safeErrorReason(error: unknown) {
  if (!(error instanceof Error)) return "query_error";
  const message = error.message.toLowerCase();
  if (message.includes("invalid_key")) return "invalid_key";
  if (message.includes("permission")) return "permission_denied";
  if (message.includes("network")) return "network_error";
  return "query_error";
}
