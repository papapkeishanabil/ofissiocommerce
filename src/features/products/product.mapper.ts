import { CATEGORIES, INDUSTRIES, SIZES } from "@/types/industry";
import { CAMERA_PRESETS, EMBROIDERY_ZONES } from "@/types/uniform-3d";

import type {
  Product3DModel,
  ProductModelSource,
  OfissioProduct,
  TransactionMode,
} from "./product.types";
import type { WooCommerceProduct } from "./woocommerce/woocommerce.types";
import {
  getMetaBoolean,
  getMetaNumber,
  getMetaString,
  getMetaStringArray,
} from "./woocommerce/woocommerce-product-meta";

const DEFAULT_SIZES = [...SIZES];

/** Phase 8 boundary: map WooCommerce custom fields into OfissioProduct. */
export function mapWooCommerceProductToOfissioProduct(
  raw: WooCommerceProduct,
): OfissioProduct {
  const meta = raw.meta_data ?? [];
  const modelUrl = getMetaString(meta, "model_3d_url");
  const modelId = getMetaString(meta, "model_3d_id");
  const modelVersion = getMetaString(meta, "model_3d_version");
  const modelFilename =
    getMetaString(meta, "model_3d_filename") || filenameFromUrl(modelUrl);
  const modelSource = normalizeModelSource(getMetaString(meta, "model_3d_source"));
  const has3DModel = getMetaBoolean(meta, "has_3d_model", false);
  const model: Product3DModel | null =
    modelUrl || modelId || modelVersion || modelFilename
      ? {
          id: modelId,
          url: modelUrl,
          filename: modelFilename,
          version: modelVersion,
          source: modelSource,
          file_type: "glb",
          uploaded_at: new Date().toISOString(),
          is_required: true,
        }
      : null;

  const colors =
    getMetaStringArray(meta, "available_colors").length > 0
      ? getMetaStringArray(meta, "available_colors")
      : attributeOptions(raw, ["warna", "color", "pa_color"]);
  const availableSizes = normalizeSizes(
    getMetaStringArray(meta, "available_sizes").length > 0
      ? getMetaStringArray(meta, "available_sizes")
      : attributeOptions(raw, ["size", "ukuran", "pa_size"]),
  );
  const industries = normalizeIndustries(getMetaStringArray(meta, "industries"));
  const category = normalizeCategory(raw.categories?.[0]?.name);
  const fulfillment = normalizeFulfillment(
    getMetaString(meta, "fulfillment_type"),
  );
  const transactionMode = normalizeTransactionMode(
    getMetaString(meta, "transaction_mode"),
  );
  const embroideryZones = normalizeEmbroideryZones(
    getMetaStringArray(meta, "embroidery_zones"),
  );
  const cameraPresets = normalizeCameraPresets(
    getMetaStringArray(meta, "camera_presets"),
  );
  const material = getMetaString(meta, "material") || attributeOptions(raw, ["material"])[0] || "Material belum diisi";
  const priceFrom = parseMoney(raw.sale_price || raw.price || raw.regular_price) || 0;
  const moq = getMetaNumber(meta, "moq", 12);
  const leadTime = getMetaString(meta, "lead_time") || "Hubungi tim Ofissio";

  return {
    id: `wc-${raw.id}`,
    source: "woocommerce",
    source_id: String(raw.id),
    name: stripHtml(raw.name).trim(),
    sku: raw.sku?.trim() ?? "",
    slug: raw.slug,
    short_description:
      stripHtml(raw.short_description).trim() ||
      stripHtml(raw.description).slice(0, 140),
    description:
      stripHtml(raw.description).trim() ||
      stripHtml(raw.short_description).trim() ||
      "Deskripsi produk belum tersedia.",
    category,
    subcategory: raw.categories?.[1]?.name ?? category,
    industries,
    priceFrom,
    moq,
    leadTimeDays: parseLeadTimeDays(leadTime),
    lead_time: leadTime,
    fulfillment,
    transaction_mode: transactionMode,
    colors: colors.length ? colors : ["Default"],
    available_colors: colors.length ? colors : ["Default"],
    available_sizes: availableSizes.length ? availableSizes : DEFAULT_SIZES,
    material,
    gender: normalizeEnum(getMetaString(meta, "gender"), ["men", "women", "unisex"], "unisex"),
    sleeve_type: normalizeEnum(getMetaString(meta, "sleeve_type"), ["short", "long"], "short"),
    usage: normalizeEnum(getMetaString(meta, "usage"), ["indoor", "outdoor", "both"], "both"),
    safety_features: getMetaStringArray(meta, "safety_features"),
    supports_embroidery: getMetaBoolean(meta, "supports_embroidery", false),
    supports_screen_printing: getMetaBoolean(meta, "supports_screen_printing", false),
    supports_dtf: getMetaBoolean(meta, "supports_dtf", false),
    embroidery_zones: embroideryZones,
    has_3d_model: has3DModel,
    model_3d: model,
    model_3d_url: modelUrl || null,
    model_3d_id: modelId || null,
    model_3d_version: modelVersion || null,
    camera_presets: cameraPresets.length ? cameraPresets : ["front", "back"],
    specs: buildSpecs(raw, material, leadTime),
    sizeChart: (availableSizes.length ? availableSizes : DEFAULT_SIZES).map((size) => ({
      size,
      chest: 0,
      length: 0,
    })),
    accentColor: "#1e3a8a",
    status: raw.status === "publish" ? "published" : "draft",
  };
}
export function mapOfissioProductToCartItem(product: OfissioProduct) {
  if (!product.model_3d) throw new Error("Produk tanpa GLB tidak dapat dipetakan ke cart.");
  return { source: product.source, sourceId: product.source_id, priceFrom: product.priceFrom, moq: product.moq, fulfillmentType: product.fulfillment, transactionMode: product.transaction_mode, model3dId: product.model_3d.id, model3dUrl: product.model_3d.url };
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function parseMoney(value?: string) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLeadTimeDays(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function filenameFromUrl(value: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value, "https://ofissio.local");
    return parsed.pathname.split("/").pop() ?? "";
  } catch {
    return value.split("/").pop() ?? "";
  }
}

function normalizeModelSource(value: string): ProductModelSource {
  return ["tripo3d", "blender", "manual", "woocommerce", "other"].includes(value)
    ? (value as ProductModelSource)
    : "woocommerce";
}

function normalizeFulfillment(value: string) {
  return value === "READY_STOCK" ? "READY_STOCK" : "MADE_TO_ORDER";
}

function normalizeTransactionMode(value: string): TransactionMode {
  return ["DIRECT_CHECKOUT", "REQUEST_QUOTATION", "HYBRID"].includes(value)
    ? (value as TransactionMode)
    : "REQUEST_QUOTATION";
}

function normalizeCategory(value?: string) {
  return CATEGORIES.includes(value as never)
    ? (value as (typeof CATEGORIES)[number])
    : "Kemeja Kantor";
}

function normalizeIndustries(values: string[]) {
  return values.filter((value): value is (typeof INDUSTRIES)[number] =>
    INDUSTRIES.includes(value as never),
  );
}

function normalizeSizes(values: string[]) {
  return values.filter((value): value is (typeof SIZES)[number] =>
    SIZES.includes(value as never),
  );
}

function normalizeEmbroideryZones(values: string[]) {
  return values.filter((value): value is (typeof EMBROIDERY_ZONES)[number] =>
    EMBROIDERY_ZONES.includes(value as never),
  );
}

function normalizeCameraPresets(values: string[]) {
  return values.filter((value): value is (typeof CAMERA_PRESETS)[number] =>
    CAMERA_PRESETS.includes(value as never),
  );
}

function normalizeEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function attributeOptions(raw: WooCommerceProduct, names: string[]) {
  const wanted = names.map((name) => name.toLowerCase());
  return (raw.attributes ?? [])
    .filter((attribute) => {
      const name = attribute.name.toLowerCase();
      const slug = attribute.slug?.toLowerCase() ?? "";
      return wanted.includes(name) || wanted.includes(slug);
    })
    .flatMap((attribute) => attribute.options ?? [])
    .map(String)
    .filter(Boolean);
}

function buildSpecs(raw: WooCommerceProduct, material: string, leadTime: string) {
  const specs = [
    { label: "Material", value: material },
    { label: "Lead time", value: leadTime },
    { label: "Stok", value: raw.stock_status ?? "unknown" },
  ];
  return specs.filter((spec) => spec.value);
}
