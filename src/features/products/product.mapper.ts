import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { SIZES } from "@/types/industry";
import {
  CAMERA_PRESETS,
  EMBROIDERY_ZONES,
  defaultModelOrientationY,
  normalizeModelOrientationY,
} from "@/types/uniform-3d";

import type {
  Product3DModel,
  ProductModelSource,
  OfissioProduct,
  ProductProcessRoute,
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
import { toProxiedWordPressMediaUrl } from "./woocommerce/wordpress-media-proxy";

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
  const modelRevisionUrl = withModelRevision(
    rawModelUrl,
    modelUpdatedAt || modelVersion || modelId,
  );
  // GLB legacy berupa URL absolut WordPress (loopback) dialihkan ke proxy
  // same-origin supaya bisa diambil perangkat LAN lain. Di client bundle env
  // non-NEXT_PUBLIC ter-compile undefined → helper jadi no-op. Filename tetap
  // diturunkan dari URL asli, bukan bentuk proxy.
  const mediaProxyBase = process.env.WORDPRESS_MEDIA_BASE_URL?.trim() ?? "";
  const modelUrl = toProxiedWordPressMediaUrl(modelRevisionUrl, mediaProxyBase);
  const modelFilename =
    getMetaString(meta, "model_3d_filename") || filenameFromUrl(modelRevisionUrl);
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
          exposure: getMetaNumber(meta, "model3d_exposure", 1.15),
          emissiveIntensity: getMetaNumber(meta, "model3d_emissive", 0.6),
          brightness: getMetaNumber(meta, "model3d_brightness", 1),
          saturation: getMetaNumber(meta, "model3d_saturation", 1),
          hue: getMetaNumber(meta, "model3d_hue", 0),
          temperature: getMetaNumber(meta, "model3d_temperature", 0),
          orientationY: normalizeModelOrientationY(
            getMetaNumber(meta, "model3d_rotation_y", defaultModelOrientationY(raw.sku)),
            defaultModelOrientationY(raw.sku),
          ),
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
  const supportsEmbroidery = getMetaBoolean(meta, "supports_embroidery", false);
  const configuredEmbroideryZones = normalizeEmbroideryZones(
    getMetaStringArray(meta, "embroidery_zones"),
  );
  // Studio positions include both back areas. Keep the viewer's middle_back
  // identifier; pricing normalizes it to the Admin's existing center_back zone.
  const embroideryZones = has3DModel && supportsEmbroidery
    ? [...EMBROIDERY_ZONES]
    : configuredEmbroideryZones;
  const cameraPresets = normalizeCameraPresets(
    getMetaStringArray(meta, "camera_presets"),
  );
  const material = getMetaString(meta, "material") || attributeOptions(raw, ["material"])[0] || "Material belum diisi";
  const sleeveType = normalizeEnum(
    getMetaString(meta, "sleeve_type"),
    ["short", "long"],
    "short",
  );
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
    processRoute: normalizeEnum<ProductProcessRoute>(
      getMetaString(meta, "process_route"),
      ["fulfillment", "customization", "production"],
      "fulfillment",
    ),
    colors: colors.length ? colors : ["Default"],
    available_colors: colors.length ? colors : ["Default"],
    available_sizes: availableSizes.length ? availableSizes : DEFAULT_SIZES,
    material,
    gender: normalizeEnum(getMetaString(meta, "gender"), ["men", "women", "unisex"], "unisex"),
    sleeve_type: sleeveType,
    usage: normalizeEnum(getMetaString(meta, "usage"), ["indoor", "outdoor", "both"], "both"),
    safety_features: getMetaStringArray(meta, "safety_features"),
    supports_embroidery: supportsEmbroidery,
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
    specs: buildSpecs(raw, material, leadTime, sleeveType),
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
    shippingWeightGram: getMetaNumber(meta, "ofissio_weight_gram", Number(raw.weight) * 1000),
    shippingLengthCm: getMetaNumber(meta, "ofissio_length_cm", Number(raw.dimensions?.length)),
    shippingWidthCm: getMetaNumber(meta, "ofissio_width_cm", Number(raw.dimensions?.width)),
    shippingHeightCm: getMetaNumber(meta, "ofissio_height_cm", Number(raw.dimensions?.height)),
    mainImage: images[0]?.src ?? null,
    images,
  };
}
export function mapOfissioProductToCartItem(product: OfissioProduct) {
  if (!product.model_3d) throw new Error("Produk tanpa GLB tidak dapat dipetakan ke cart.");
  return { source: product.source, sourceId: product.source_id, image: product.mainImage ?? null, priceFrom: product.priceFrom, regularPrice: product.priceFrom, moq: product.moq, fulfillmentType: product.fulfillment, processRoute: product.processRoute, leadTimeDays: product.leadTimeDays, transactionMode: product.transaction_mode, model3dId: product.model_3d.id, model3dUrl: product.model_3d.url, quantityPricing: product.quantityPricing };
}

function stripHtml(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ");
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: "\u00A0",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Dekoder entity HTML ringan tanpa dependency — mapper ini ter-bundle ke client
 * lewat cart-store sehingga tidak boleh mengimpor library sanitizer. Entity
 * `&amp;` didekode terakhir agar tidak terjadi dekode ganda (`&amp;nbsp;`).
 */
function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16), `&#x${hex};`))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(Number(dec), `&#${dec};`))
    .replace(/&(nbsp|lt|gt|quot|apos);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match)
    .replace(/&amp;/g, "&");
}

function safeCodePoint(code: number, original: string) {
  // Codepoint valid rentang Unicode + bukan surrogate agar fromCodePoint tidak melempar.
  return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
    ? String.fromCodePoint(code)
    : original;
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

function buildSpecs(
  raw: WooCommerceProduct,
  material: string,
  leadTime: string,
  sleeveType: "short" | "long",
) {
  const managedAttributeAliases = new Set([
    "material",
    "bahan",
    "tipe-lengan",
    "panjang-lengan",
    "jenis-lengan",
    "sleeve",
    "sleeve-type",
  ]);
  const specs = [
    { label: "Material", value: material },
    { label: "Lead time", value: leadTime },
    ...(raw.attributes ?? []).filter((attribute) => {
      const slug = slugifyTaxonomy(attribute.slug || attribute.name).replace(/^pa-/, "");
      return !managedAttributeAliases.has(slug);
    }).flatMap((attribute) => {
      const value = (attribute.options ?? []).join(", ");
      return value ? [{ label: attribute.name, value }] : [];
    }),
    { label: "Tipe Lengan", value: sleeveType === "long" ? "Panjang" : "Pendek" },
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
  bengkel: "Bengkel",
  grosir: "Grosir",
  laundry: "Laundry",
  salon: "Salon",
  bangunan: "Bangunan",
  sparepart: "Sparepart",
  petshop: "Petshop",
  ekspedisi: "Ekspedisi",
  bumn: "BUMN",
  maritim: "Maritim",
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
