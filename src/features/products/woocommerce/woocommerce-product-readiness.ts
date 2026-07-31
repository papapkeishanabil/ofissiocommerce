import {
  getMetaBoolean,
  getMetaNumber,
  getMetaString,
  getMetaStringArray,
} from "./woocommerce-product-meta";
import type { WooCommerceProduct } from "./woocommerce.types";

const VALID_FULFILLMENT_TYPES = ["READY_STOCK", "MADE_TO_ORDER"] as const;
const VALID_TRANSACTION_MODES = ["DIRECT_CHECKOUT", "REQUEST_QUOTATION", "HYBRID"] as const;

export type NormalizedWooFulfillmentType =
  (typeof VALID_FULFILLMENT_TYPES)[number];
export type NormalizedWooTransactionMode =
  (typeof VALID_TRANSACTION_MODES)[number];

export function normalizeWooFulfillmentType(
  value: unknown,
): NormalizedWooFulfillmentType | null {
  if (value == null) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_");

  switch (normalized) {
    case "ready_stock":
    case "ready_stock_with_customization":
    case "ready_stock_customization":
      return "READY_STOCK";
    case "made_to_order":
    case "quotation_only":
      return "MADE_TO_ORDER";
    default:
      return null;
  }
}

export function normalizeWooTransactionMode(
  value: unknown,
): NormalizedWooTransactionMode | null {
  if (value == null) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_");

  switch (normalized) {
    case "direct_checkout":
      return "DIRECT_CHECKOUT";
    case "request_quotation":
      return "REQUEST_QUOTATION";
    case "hybrid":
      return "HYBRID";
    default:
      return null;
  }
}

export function validateRawWooCommerceProductForOfissio(
  product: WooCommerceProduct,
) {
  const meta = product.meta_data ?? [];
  const modelUrl = getMetaString(meta, "model_3d_url");
  const modelFilename =
    getMetaString(meta, "model_3d_filename") || filenameFromUrl(modelUrl);
  const fulfillmentType = getMetaString(meta, "fulfillment_type");
  const normalizedFulfillmentType = normalizeWooFulfillmentType(fulfillmentType);
  const transactionMode = getMetaString(meta, "transaction_mode");
  const normalizedTransactionMode = normalizeWooTransactionMode(transactionMode);
  const supportsEmbroidery = getMetaBoolean(meta, "supports_embroidery", false);
  const embroideryZones = getMetaStringArray(meta, "embroidery_zones");
  const price = parseMoney(product.sale_price || product.price || product.regular_price);

  if (product.status !== "publish") {
    return { ok: false as const, reason: "Produk WooCommerce belum published." };
  }
  if (!product.sku?.trim()) {
    return { ok: false as const, reason: "Produk WooCommerce tanpa SKU." };
  }
  if (price <= 0) {
    return { ok: false as const, reason: "Harga dasar WooCommerce wajib." };
  }
  if (!getMetaBoolean(meta, "has_3d_model", false)) {
    return { ok: false as const, reason: "Meta has_3d_model wajib true." };
  }
  if (!modelUrl.toLowerCase().endsWith(".glb")) {
    return { ok: false as const, reason: "model_3d_url GLB wajib." };
  }
  if (!modelFilename.toLowerCase().endsWith(".glb")) {
    return { ok: false as const, reason: "model_3d_filename GLB wajib." };
  }
  for (const key of ["model_3d_id", "model_3d_version", "model_3d_source"]) {
    if (!getMetaString(meta, key)) {
      return { ok: false as const, reason: `${key} wajib.` };
    }
  }
  if (getMetaNumber(meta, "moq", 0) <= 0) {
    return { ok: false as const, reason: "Meta moq wajib lebih dari 0." };
  }
  if (!getMetaString(meta, "lead_time")) {
    return { ok: false as const, reason: "Meta lead_time wajib." };
  }
  if (!normalizedFulfillmentType) {
    return {
      ok: false as const,
      reason: `Meta fulfillment_type tidak valid: ${fulfillmentType || "kosong"}.`,
    };
  }
  if (!normalizedTransactionMode) {
    return {
      ok: false as const,
      reason: `Meta transaction_mode tidak valid: ${transactionMode || "kosong"}.`,
    };
  }
  if (getMetaStringArray(meta, "industries").length === 0) {
    return { ok: false as const, reason: "Meta industries wajib." };
  }
  if (supportsEmbroidery && embroideryZones.length === 0) {
    return { ok: false as const, reason: "Zona bordir wajib untuk produk bordir." };
  }
  return { ok: true as const };
}

function parseMoney(value?: string) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function filenameFromUrl(value: string) {
  if (!value) return "";
  try {
    return new URL(value, "https://ofissio.local").pathname.split("/").pop() ?? "";
  } catch {
    return value.split("/").pop() ?? "";
  }
}
