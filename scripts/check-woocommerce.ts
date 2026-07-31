import { Buffer } from "node:buffer";

import { loadEnvConfig } from "@next/env";

import { validateRawWooCommerceProductForOfissio } from "../src/features/products/woocommerce/woocommerce-product-readiness";
import {
  allowSelfSignedTlsForWooUrl,
  requestWooCommerceJson,
} from "../src/features/products/woocommerce/woocommerce-http";
import type {
  WooCommerceCreateOrderInput,
  WooCommerceMetaData,
  WooCommerceOrder,
  WooCommerceProduct,
} from "../src/features/products/woocommerce/woocommerce.types";

type WooCheckReason =
  | "skipped_env_missing"
  | "skipped_disabled"
  | "connected"
  | "auth_failed"
  | "endpoint_unreachable"
  | "invalid_response"
  | "network_error";

interface WooOrderForCheck extends WooCommerceOrder {
  billing?: {
    email?: string;
  };
  customer_note?: string;
}

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

run().catch((error: unknown) => {
  console.error("ERROR: WooCommerce check gagal.");
  console.error(`Reason: ${safeReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoForbiddenPublicSecrets();

  const productSource = process.env.PRODUCT_SOURCE?.trim() || "mock";
  const enabled = process.env.WOOCOMMERCE_ENABLED?.trim() === "true";
  const syncOrders = process.env.WOOCOMMERCE_SYNC_ORDERS?.trim() === "true";
  const testWrite = process.env.WOOCOMMERCE_TEST_WRITE?.trim() === "true";
  const baseUrl =
    process.env.WOOCOMMERCE_BASE_URL?.trim() ||
    process.env.WOO_API_URL?.trim()?.replace(/\/wp-json\/wc\/v3\/?$/, "") ||
    "";
  const consumerKey =
    process.env.WOOCOMMERCE_CONSUMER_KEY?.trim() ||
    process.env.WOO_CONSUMER_KEY?.trim() ||
    "";
  const consumerSecret =
    process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim() ||
    process.env.WOO_CONSUMER_SECRET?.trim() ||
    "";

  if (!enabled && productSource !== "woocommerce" && !syncOrders && !testWrite) {
    printResult("skipped_disabled", "WooCommerce belum aktif; mode mock tetap valid.");
    return;
  }

  const missing = [
    ["WOOCOMMERCE_BASE_URL", baseUrl],
    ["WOOCOMMERCE_CONSUMER_KEY", consumerKey],
    ["WOOCOMMERCE_CONSUMER_SECRET", consumerSecret],
  ].filter(([, value]) => !value);
  if (missing.length > 0) {
    printResult(
      "skipped_env_missing",
      `Env WooCommerce belum lengkap: ${missing.map(([name]) => name).join(", ")}.`,
    );
    return;
  }

  const products = await wooFetch<WooCommerceProduct[]>(
    baseUrl,
    consumerKey,
    consumerSecret,
    "/products",
    {
      status: "publish",
      per_page: "20",
    },
  );
  if (!Array.isArray(products)) {
    printResult("invalid_response", "Response /products bukan array.");
    process.exitCode = 1;
    return;
  }

  const validated = products.map((product) => ({
    product,
    validation: validateRawWooCommerceProductForOfissio(product),
  }));
  const validProducts = validated
    .filter((row) => row.validation.ok)
    .map((row) => row.product);
  const invalidProducts = validated.filter((row) => !row.validation.ok);
  printResult(
    "connected",
    `Products endpoint reachable. Valid GLB products: ${validProducts.length}; filtered invalid/missing GLB: ${invalidProducts.length}.`,
  );
  if (validProducts.length > 0) {
    console.log(
      `OK: Valid product refs: ${validProducts
        .slice(0, 5)
        .map((product) => `#${product.id}:${product.sku || product.slug || "tanpa-sku"}`)
        .join(", ")}`,
    );
  }

  if (invalidProducts.length > 0) {
    const reasons = countInvalidReasons(invalidProducts);
    console.log(
      `INFO: Filtered product reasons: ${Object.entries(reasons)
        .map(([reason, count]) => `${reason}=${count}`)
        .join(", ")}`,
    );
  }

  const ordersRead = await wooFetch<unknown[]>(
    baseUrl,
    consumerKey,
    consumerSecret,
    "/orders",
    { per_page: "1" },
  );
  if (!Array.isArray(ordersRead)) {
    printResult("invalid_response", "Response /orders bukan array.");
    process.exitCode = 1;
    return;
  }
  console.log("OK: Orders endpoint reachable untuk read permission.");

  if (productSource === "woocommerce" && validProducts.length === 0) {
    console.log("ERROR: PRODUCT_SOURCE=woocommerce tetapi belum ada produk published dengan metadata GLB valid.");
    process.exitCode = 1;
  }

  if (testWrite) {
    await runWriteSmoke({
      baseUrl,
      consumerKey,
      consumerSecret,
      validProducts,
    });
  } else if (syncOrders) {
    console.log(
      "SKIP: WOOCOMMERCE_SYNC_ORDERS=true tetapi WOOCOMMERCE_TEST_WRITE=false; write order smoke tidak dijalankan.",
    );
  } else {
    console.log("SKIP: WOOCOMMERCE_SYNC_ORDERS=false; order write sync tidak diuji.");
  }
}

async function runWriteSmoke(input: {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  validProducts: WooCommerceProduct[];
}) {
  const product = input.validProducts[0];
  if (!product) {
    printResult(
      "invalid_response",
      "WOOCOMMERCE_TEST_WRITE=true tetapi tidak ada produk valid untuk order test.",
    );
    process.exitCode = 1;
    return;
  }

  const idempotencyKey =
    process.env.WOOCOMMERCE_TEST_ID?.trim() ||
    `ofissio-check-${safeHost(input.baseUrl)}-${new Date().toISOString().slice(0, 10)}`;
  const testEmail = `${idempotencyKey.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}@example.invalid`;
  const existing = await wooFetch<WooOrderForCheck[]>(
    input.baseUrl,
    input.consumerKey,
    input.consumerSecret,
    "/orders",
    {
      per_page: "20",
      search: idempotencyKey,
    },
  );
  const existingOrder = existing.find((order) =>
    order.customer_note?.includes(idempotencyKey) ||
    order.billing?.email === testEmail ||
    hasWooMeta(order.meta_data ?? [], "ofissio_test_id", idempotencyKey),
  );
  if (existingOrder) {
    console.log(
      `OK: Write smoke idempotent; existing WooCommerce test order #${existingOrder.id} reused.`,
    );
    return;
  }

  const payload: WooCommerceCreateOrderInput = {
    status: "pending",
    currency: "IDR",
    set_paid: false,
    customer_note: `Ofissio WooCommerce staging write smoke ${idempotencyKey}`,
    billing: {
      first_name: "Ofissio Staging Check",
      company: "Ofissio",
      phone: "-",
      email: testEmail,
    },
    line_items: [
      {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        meta_data: [
          { key: "ofissio_test", value: "true" },
          { key: "ofissio_test_id", value: idempotencyKey },
        ],
      },
    ],
    meta_data: [
      { key: "source", value: "ofissio" },
      { key: "ofissio_test", value: "true" },
      { key: "ofissio_test_id", value: idempotencyKey },
      { key: "ofissio_order_id", value: idempotencyKey },
    ],
  };
  const created = await wooFetch<WooCommerceOrder>(
    input.baseUrl,
    input.consumerKey,
    input.consumerSecret,
    "/orders",
    {},
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  if (!created.id) {
    printResult("invalid_response", "WooCommerce write smoke tidak mengembalikan order id.");
    process.exitCode = 1;
    return;
  }
  console.log(`OK: Write smoke created staging test order #${created.id} with ofissio_test=true.`);
}

async function wooFetch<T>(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  path: string,
  params: Record<string, string> = {},
  init?: RequestInit,
) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  let response: Awaited<ReturnType<typeof requestWooCommerceJson<T>>>;

  try {
    response = await requestWooCommerceJson<T>(url, {
      method: init?.method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      body: typeof init?.body === "string" ? init.body : undefined,
      allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_response") {
      throw new Error("invalid_response");
    }
    throw new Error("network_error");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("auth_failed");
    }
    if (response.status === 404) {
      throw new Error("endpoint_unreachable");
    }
    throw new Error("invalid_response");
  }

  return response.data;
}

function countInvalidReasons(
  invalidProducts: Array<{
    validation: ReturnType<typeof validateRawWooCommerceProductForOfissio>;
  }>,
) {
  const counts: Record<string, number> = {};
  for (const row of invalidProducts) {
    const reason = row.validation.ok ? "unknown" : row.validation.reason;
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function hasWooMeta(meta: WooCommerceMetaData[], key: string, value: string) {
  return meta.some((item) => item.key === key && String(item.value) === value);
}

function safeHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  } catch {
    return "woocommerce";
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("endpoint_unreachable");
    }
  } catch {
    throw new Error("endpoint_unreachable");
  }
  if (trimmed.endsWith("/wp-json/wc/v3")) return trimmed;
  return `${trimmed}/wp-json/wc/v3`;
}

function assertNoForbiddenPublicSecrets() {
  for (const name of [
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY",
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
    "NEXT_PUBLIC_WOO_CONSUMER_KEY",
    "NEXT_PUBLIC_WOO_CONSUMER_SECRET",
  ]) {
    if (process.env[name]?.trim()) {
      throw new Error("auth_failed");
    }
  }
}

function printHeader() {
  const title = "Ofissio WooCommerce staging check";
  console.log(title);
  console.log("-".repeat(title.length));
}

function printResult(reason: WooCheckReason, message: string) {
  const prefix = reason.startsWith("skipped") ? "SKIP" : reason === "connected" ? "OK" : "ERROR";
  console.log(`${prefix}: ${message}`);
}

function safeReason(error: unknown): WooCheckReason {
  if (!(error instanceof Error)) return "invalid_response";
  const message = error.message.toLowerCase();
  if (message.includes("auth_failed")) return "auth_failed";
  if (message.includes("network_error")) return "network_error";
  if (message.includes("endpoint_unreachable")) return "endpoint_unreachable";
  return "invalid_response";
}
