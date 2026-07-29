import { Buffer } from "node:buffer";

import { loadEnvConfig } from "@next/env";

type WooCheckReason =
  | "skipped_env_missing"
  | "skipped_disabled"
  | "connected"
  | "auth_failed"
  | "endpoint_unreachable"
  | "invalid_response"
  | "network_error";

interface WooMetaData {
  key: string;
  value: unknown;
}

interface WooProduct {
  id: number;
  name?: string;
  sku?: string;
  status?: string;
  meta_data?: WooMetaData[];
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

  if (!enabled && productSource !== "woocommerce" && !syncOrders) {
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

  const products = await wooFetch<WooProduct[]>(baseUrl, consumerKey, consumerSecret, "/products", {
    status: "publish",
    per_page: "20",
  });
  if (!Array.isArray(products)) {
    printResult("invalid_response", "Response /products bukan array.");
    process.exitCode = 1;
    return;
  }

  const validProducts = products.filter(hasRequiredGlbMetadata);
  const invalidProducts = products.filter((product) => !hasRequiredGlbMetadata(product));
  printResult(
    "connected",
    `Products reachable. Valid GLB products: ${validProducts.length}; filtered invalid/missing GLB: ${invalidProducts.length}.`,
  );

  if (productSource === "woocommerce" && validProducts.length === 0) {
    console.log("ERROR: PRODUCT_SOURCE=woocommerce tetapi belum ada produk published dengan metadata GLB valid.");
    process.exitCode = 1;
  }

  if (syncOrders) {
    await wooFetch<unknown[]>(baseUrl, consumerKey, consumerSecret, "/orders", {
      per_page: "1",
    });
    console.log("OK: /orders reachable untuk read permission.");
    console.log("INFO: Write test diskip. Set WOOCOMMERCE_TEST_WRITE=true hanya saat staging sandbox siap.");
  } else {
    console.log("SKIP: WOOCOMMERCE_SYNC_ORDERS=false; order sync write/read order tidak diuji.");
  }
}

async function wooFetch<T>(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
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

  return (await response.json().catch(() => {
    throw new Error("invalid_response");
  })) as T;
}

function hasRequiredGlbMetadata(product: WooProduct) {
  const meta = product.meta_data ?? [];
  const has3D = metaBoolean(meta, "has_3d_model");
  const modelUrl = metaString(meta, "model_3d_url");
  const modelId = metaString(meta, "model_3d_id");
  const modelVersion = metaString(meta, "model_3d_version");
  const modelFilename = metaString(meta, "model_3d_filename") || filenameFromUrl(modelUrl);
  const modelSource = metaString(meta, "model_3d_source");
  const supportsEmbroidery = metaBoolean(meta, "supports_embroidery");
  const zones = metaArray(meta, "embroidery_zones");

  return Boolean(
    product.status === "publish" &&
      has3D &&
      product.sku?.trim() &&
      modelUrl.toLowerCase().endsWith(".glb") &&
      modelId &&
      modelVersion &&
      modelFilename.toLowerCase().endsWith(".glb") &&
      modelSource &&
      (!supportsEmbroidery || zones.length > 0),
  );
}

function metaString(meta: WooMetaData[], key: string) {
  const value = meta.find((item) => item.key === key)?.value;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function metaBoolean(meta: WooMetaData[], key: string) {
  const value = meta.find((item) => item.key === key)?.value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  }
  return false;
}

function metaArray(meta: WooMetaData[], key: string) {
  const value = meta.find((item) => item.key === key)?.value;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function filenameFromUrl(value: string) {
  if (!value) return "";
  try {
    return new URL(value).pathname.split("/").pop() ?? "";
  } catch {
    return value.split("/").pop() ?? "";
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
