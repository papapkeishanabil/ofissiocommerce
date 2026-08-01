import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { SIZES } from "@/types/industry";
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
  getMetaValue,
} from "./woocommerce/woocommerce-product-meta";
import { normalizeQuantityPricing } from "./quantity-pricing";
import { normalizeEmbroideryPricing } from "./embroidery-pricing";
import {
  normalizeWooFulfillmentType,
  normalizeWooTransactionMode,
} from "./woocommerce/woocommerce-product-readiness";

const DEFAULT_SIZES = [...SIZES];

/** Phase 8 boundary: map WooCommerce custom fields into OfissioProduct. */
export function mapWooCommerceProductToOfissioProduct(
  raw: WooCommerceProduct,
): OfissioProduct {
  const meta = raw.meta_data ?? [];
  const rawModelUrl =
    getMetaString(meta, "model_3d_url") || resolveStorageModelUrl(raw.id, meta);
  const modelId = getMetaString(meta, "model_3d_id");
  const modelVersion = getMetaString(meta, "model_3d_version");
  const modelUpdatedAt = getMetaString(meta, "model_3d_updated_at");
  const modelUrl = withModelRevision(
    rawModelUrl,
    modelUpdatedAt || modelVersion || modelId,
  );
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
          uploaded_at: modelUpdatedAt,
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
  const industryValues = getMetaStringArray(meta, "industries");
  const industries = normalizeIndustries(industryValues);
  const industrySlugs = industryValues.map(normalizeIndustrySlug).filter(Boolean);
  const categories = (raw.categories ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug || slugifyTaxonomy(item.name),
  }));
  const category = categories[0]?.name ?? "";
  const categorySlugs = categories.map((item) => item.slug).filter(Boolean);
  const tags = (raw.tags ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug || slugifyTaxonomy(item.name),
  }));
  const attributes = (raw.attributes ?? []).map((attribute) => ({
    id: attribute.id || null,
    name: attribute.name,
    slug: (attribute.slug || slugifyTaxonomy(attribute.name)).replace(/^pa_/, ""),
    options: (attribute.options ?? []).map(String).filter(Boolean),
    visible: attribute.visible ?? true,
    variation: attribute.variation ?? false,
  }));
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
  const priceFrom = parseMoney(raw.regular_price || raw.price || raw.sale_price) || 0;
  const moq = getMetaNumber(meta, "moq", 12);
  const leadTime = getMetaString(meta, "lead_time") || "Hubungi tim Ofissio";
  const quantityPricing = normalizeQuantityPricing({
    enabled: getMetaBoolean(meta, "quantity_pricing_enabled", true),
    mode: getMetaString(meta, "quantity_pricing_mode"),
    basis: getMetaString(meta, "quantity_basis"),
    tiers: getMetaValue(meta, "quantity_pricing_tiers"),
    moq,
  }).quantityPricing;
  const legacyEmbroideryPricing = normalizeEmbroideryPricing({
    enabled: getMetaBoolean(meta, "embroidery_pricing_enabled", true),
    mode: getMetaString(meta, "embroidery_pricing_mode"),
    zones: getMetaValue(meta, "embroidery_pricing"),
    supportsEmbroidery: getMetaBoolean(meta, "supports_embroidery", false),
  }).embroideryPricing;
  const images = (raw.images ?? [])
    .filter((image) => Boolean(image.src))
    .map((image) => ({
      id: Number.isInteger(image.id) && image.id > 0 ? image.id : null,
      src: image.src,
      name: image.name?.trim() || stripHtml(raw.name).trim(),
      alt: image.alt?.trim() || stripHtml(raw.name).trim(),
    }));

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
    subcategory: categories[1]?.name ?? category,
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
    supports_screen_printing: getMetaBoolean(
      meta,
      "supports_screen_printing",
      getMetaBoolean(meta, "supports_screen_print", false),
    ),
    supports_dtf: getMetaBoolean(meta, "supports_dtf", false),
    embroidery_zones: embroideryZones,
    has_3d_model: has3DModel,
    model_3d: model,
    model_3d_url: modelUrl || null,
    model_3d_id: modelId || null,
    model_3d_version: modelVersion || null,
    // A GLB can always be orbited from every supported camera preset. Products
    // created before camera_presets metadata existed must not be reduced to
    // front/back only.
    camera_presets: cameraPresets.length ? cameraPresets : [...CAMERA_PRESETS],
    specs: buildSpecs(raw, material, leadTime),
    sizeChart: (availableSizes.length ? availableSizes : DEFAULT_SIZES).map((size) => ({
      size,
      chest: 0,
      length: 0,
    })),
    accentColor: "#1e3a8a",
    status: raw.status === "publish" ? "published" : "draft",
    categories,
    categorySlugs,
    industrySlugs,
    tags,
    attributes,
    searchableTerms: uniqueTerms([
      raw.name,
      raw.sku,
      ...categories.flatMap((item) => [item.name, item.slug]),
      ...tags.flatMap((item) => [item.name, item.slug]),
      ...industries,
      ...industrySlugs,
      ...attributes.flatMap((item) => [
        item.name,
        item.slug,
        ...item.options,
      ]),
      ]),
    quantityPricing,
    legacyEmbroideryPricing,
    mainImage: images[0]?.src ?? null,
    images,
  };
}
export function mapOfissioProductToCartItem(product: OfissioProduct) {
  if (!product.model_3d) throw new Error("Produk tanpa GLB tidak dapat dipetakan ke cart.");
  return { source: product.source, sourceId: product.source_id, priceFrom: product.priceFrom, regularPrice: product.priceFrom, moq: product.moq, fulfillmentType: product.fulfillment, transactionMode: product.transaction_mode, model3dId: product.model_3d.id, model3dUrl: product.model_3d.url, quantityPricing: product.quantityPricing };
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

function resolveStorageModelUrl(
  productId: number,
  meta: NonNullable<WooCommerceProduct["meta_data"]> = [],
) {
  const bucket = getMetaString(meta, "model_3d_storage_bucket");
  const key = getMetaString(meta, "model_3d_storage_key");
  if (!bucket || !key) return "";
  return `/api/products/woocommerce/${productId}/3d-model/signed-url`;
}

function withModelRevision(value: string, revision: string) {
  if (!value || !revision) return value;
  try {
    const parsed = new URL(value, "https://ofissio.local");
    if (!/^\/api\/products\/woocommerce\/\d+\/3d-model\/signed-url\/?$/.test(parsed.pathname)) {
      return value;
    }
    parsed.searchParams.set("rev", revision);
    return /^https?:\/\//i.test(value)
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
}

function normalizeModelSource(value: string): ProductModelSource {
  return ["tripo3d", "blender", "manual", "supabase", "woocommerce", "other"].includes(value)
    ? (value as ProductModelSource)
    : "woocommerce";
}

function normalizeFulfillment(value: string) {
  return normalizeWooFulfillmentType(value) ?? "MADE_TO_ORDER";
}

function normalizeTransactionMode(value: string): TransactionMode {
  return normalizeWooTransactionMode(value) ?? "REQUEST_QUOTATION";
}

function normalizeIndustries(values: string[]) {
  return uniqueTerms(values.map(industryDisplayName));
}

function normalizeSizes(values: string[]) {
  return values.filter((value): value is (typeof SIZES)[number] =>
    SIZES.includes(value as never),
  );
}

function normalizeEmbroideryZones(values: string[]) {
  return [...new Set(values.map((value) => {
    const normalized = enumLookupKey(value);
    if (["back", "center_back", "middle_back"].includes(normalized)) return "middle_back";
    return normalized;
  }))].filter((value): value is (typeof EMBROIDERY_ZONES)[number] =>
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

function enumLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
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
    ...(raw.attributes ?? []).filter((attribute) => {
      const slug = (attribute.slug || attribute.name).toLowerCase().replace(/^pa_/, "");
      return !["material", "bahan"].includes(slug);
    }).flatMap((attribute) => {
      const value = (attribute.options ?? []).join(", ");
      return value ? [{ label: attribute.name, value }] : [];
    }),
  ];
  return specs.filter((spec) => spec.value);
}

const INDUSTRY_DISPLAY_NAMES: Record<string, string> = {
  corporate: "Corporate",
  mining: "Mining",
  pertambangan: "Mining",
  manufacturing: "Manufacturing",
  manufaktur: "Manufacturing",
  hospitality: "Hospitality",
  perhotelan: "Hospitality",
  healthcare: "Healthcare",
  kesehatan: "Healthcare",
  education: "Education",
  construction: "Construction",
  konstruksi: "Construction",
  logistics: "Logistics",
  logistik: "Logistics",
  security: "Security",
  government: "Government",
  retail: "Retail",
  food_beverage: "Food & Beverage",
  f_b: "Food & Beverage",
  fnb: "Food & Beverage",
};

function industryDisplayName(value: string) {
  const normalized = enumLookupKey(value).replace(/&/g, "_");
  return (
    INDUSTRY_DISPLAY_NAMES[normalized] ??
    value
      .trim()
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ")
  );
}

function uniqueTerms(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
