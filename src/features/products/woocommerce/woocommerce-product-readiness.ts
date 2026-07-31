import type { OfissioProduct } from "../product.types";
import {
  getMetaBoolean,
  getMetaNumber,
  getMetaString,
  getMetaStringArray,
  getMetaValue,
} from "./woocommerce-product-meta";
import type { WooCommerceAttribute, WooCommerceProduct } from "./woocommerce.types";
import {
  normalizeQuantityPricing,
  validateQuantityPricing,
  type QuantityPricingIssue,
} from "../quantity-pricing";

const VALID_FULFILLMENT_TYPES = ["READY_STOCK", "MADE_TO_ORDER"] as const;
const VALID_TRANSACTION_MODES = ["DIRECT_CHECKOUT", "REQUEST_QUOTATION", "HYBRID"] as const;

export type NormalizedWooFulfillmentType =
  (typeof VALID_FULFILLMENT_TYPES)[number];
export type NormalizedWooTransactionMode =
  (typeof VALID_TRANSACTION_MODES)[number];

export type ProductReadinessStatus =
  | "valid"
  | "draft_woocommerce"
  | "missing_required_fields"
  | "invalid_3d_model";

export type Product3DReadinessStatus =
  | "glb_available"
  | "glb_missing"
  | "glb_invalid"
  | "supabase_glb"
  | "local_glb";

export interface ProductReadinessIssue {
  field: string;
  label: string;
  action: string;
  severity: "blocking" | "warning";
}

export interface ProductReadiness {
  isVisibleInOfissio: boolean;
  status: ProductReadinessStatus;
  statusLabel: string;
  model3DStatus: Product3DReadinessStatus;
  model3DStatusLabel: string;
  blockingIssues: ProductReadinessIssue[];
  warnings: ProductReadinessIssue[];
}

export function normalizeWooFulfillmentType(
  value: unknown,
): NormalizedWooFulfillmentType | null {
  if (value == null) return null;
  const normalized = normalizeEnumValue(value);

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
  const normalized = normalizeEnumValue(value);

  switch (normalized) {
    case "direct_checkout":
      return "DIRECT_CHECKOUT";
    case "request_quotation":
    case "quotation":
      return "REQUEST_QUOTATION";
    case "hybrid":
      return "HYBRID";
    default:
      return null;
  }
}

/**
 * Single readiness policy for WooCommerce admin, catalog filtering, mapper
 * validation, Ofistant search, and the staging check script.
 */
export function getProductReadiness(
  product: WooCommerceProduct | OfissioProduct,
): ProductReadiness {
  return isRawWooCommerceProduct(product)
    ? getRawWooCommerceReadiness(product)
    : getMappedProductReadiness(product);
}

export function validateRawWooCommerceProductForOfissio(
  product: WooCommerceProduct,
) {
  const readiness = getProductReadiness(product);
  if (readiness.isVisibleInOfissio) {
    return { ok: true as const, readiness };
  }
  return {
    ok: false as const,
    reason: readiness.blockingIssues[0]?.label ?? "Produk belum siap untuk Ofissio.",
    readiness,
  };
}

function getRawWooCommerceReadiness(
  product: WooCommerceProduct,
): ProductReadiness {
  const meta = product.meta_data ?? [];
  const blockingIssues: ProductReadinessIssue[] = [];
  const warnings: ProductReadinessIssue[] = [];
  const modelUrl = getMetaString(meta, "model_3d_url");
  const storageBucket = getMetaString(meta, "model_3d_storage_bucket");
  const storageKey = getMetaString(meta, "model_3d_storage_key");
  const hasModelReference = Boolean(modelUrl || (storageBucket && storageKey));
  const hasValidDirectModel = isValidGlbReference(modelUrl);
  const hasValidStorageModel = Boolean(storageBucket && isValidGlbReference(storageKey));
  const modelIsValid = hasValidDirectModel || hasValidStorageModel;
  const model3DStatus = resolveRawModelStatus({
    modelUrl,
    storageBucket,
    storageKey,
    hasModelReference,
    modelIsValid,
  });

  if (product.status !== "publish") {
    blockingIssues.push(blocking("status", "WooCommerce status belum publish", "Buka WooCommerce Product"));
  }
  if (!product.sku?.trim()) {
    blockingIssues.push(blocking("sku", "SKU belum diisi", "Buka WooCommerce Product"));
  }
  if (parseMoney(product.sale_price || product.price || product.regular_price) <= 0) {
    blockingIssues.push(blocking("price", "Harga belum diisi", "Buka WooCommerce Product"));
  }
  if (!product.categories?.length) {
    blockingIssues.push(blocking("categories", "Kategori produk belum dipilih", "Buka WooCommerce Product"));
  }
  if (getMetaStringArray(meta, "industries").length === 0) {
    blockingIssues.push(blocking("industries", "Industri belum dipilih", "Pilih Industri"));
  }
  if (!getMetaBoolean(meta, "has_3d_model", false)) {
    blockingIssues.push(blocking("has_3d_model", "Produk belum ditandai memiliki model 3D", "Isi Field Ofissio"));
  }
  if (!hasModelReference) {
    blockingIssues.push(blocking("model_3d", "File GLB belum diupload", "Upload GLB"));
  } else if (!modelIsValid) {
    blockingIssues.push(blocking("model_3d", "File GLB tidak valid", "Upload GLB"));
  }
  pushMissingMeta(blockingIssues, meta, "model_3d_id", "ID model 3D belum diisi");
  pushMissingMeta(blockingIssues, meta, "model_3d_version", "Versi model 3D belum diisi");
  pushMissingMeta(blockingIssues, meta, "model_3d_source", "Sumber model 3D belum diisi");
  pushMissingMeta(blockingIssues, meta, "model_3d_filename", "Nama file model 3D belum diisi");
  if (getMetaNumber(meta, "moq", 0) <= 0) {
    blockingIssues.push(blocking("moq", "MOQ belum diisi", "Isi Field Ofissio"));
  }
  if (!getMetaString(meta, "lead_time")) {
    blockingIssues.push(blocking("lead_time", "Lead time belum diisi", "Isi Field Ofissio"));
  }
  if (!normalizeWooFulfillmentType(getMetaString(meta, "fulfillment_type"))) {
    blockingIssues.push(blocking("fulfillment_type", "Fulfillment type belum dipilih", "Isi Field Ofissio"));
  }
  if (!normalizeWooTransactionMode(getMetaString(meta, "transaction_mode"))) {
    blockingIssues.push(blocking("transaction_mode", "Transaction mode belum dipilih", "Isi Field Ofissio"));
  }

  if (!stripHtml(product.description).trim()) {
    warnings.push(warning("description", "Deskripsi panjang belum diisi", "Lengkapi deskripsi"));
  }
  if ((product.images?.length ?? 0) <= 1) {
    warnings.push(warning("gallery", "Foto tambahan belum diisi", "Lengkapi foto"));
  }
  pushAttributeWarning(warnings, product.attributes, ["warna", "color"], "colors", "Atribut warna belum lengkap");
  pushAttributeWarning(warnings, product.attributes, ["bahan", "material"], "material", "Atribut bahan belum lengkap");
  pushAttributeWarning(warnings, product.attributes, ["ukuran", "size"], "sizes", "Atribut ukuran belum lengkap");
  const quantityPricing = normalizeQuantityPricing({
    enabled: getMetaBoolean(meta, "quantity_pricing_enabled", true),
    mode: getMetaString(meta, "quantity_pricing_mode"),
    basis: getMetaString(meta, "quantity_basis"),
    tiers: getMetaValue(meta, "quantity_pricing_tiers"),
    moq: getMetaNumber(meta, "moq", 0),
  });
  pushQuantityPricingWarnings(warnings, quantityPricing.issues);
  if (!hasAnyMetaValue(meta, ["embroidery_pricing", "embroidery_pricing_tiers"])) {
    warnings.push(warning("embroidery_pricing", "Embroidery pricing belum diisi", "Lengkapi pricing bordir"));
  }
  const supportsEmbroidery = getMetaBoolean(meta, "supports_embroidery", false);
  const embroideryZones = getMetaStringArray(meta, "embroidery_zones");
  if (!supportsEmbroidery) {
    warnings.push(warning("supports_embroidery", "Dukungan bordir belum diaktifkan", "Tinjau dukungan bordir"));
    if (embroideryZones.length === 0) {
      warnings.push(warning("embroidery_zones", "Zona bordir belum diisi", "Pilih zona bordir"));
    }
  } else if (embroideryZones.length === 0) {
    warnings.push(warning("embroidery_zones", "Zona bordir belum dipilih.", "Pilih zona bordir"));
  }

  return finishReadiness({
    blockingIssues,
    warnings,
    model3DStatus,
    isDraft: product.status !== "publish",
    invalidModel: hasModelReference && !modelIsValid,
  });
}

function getMappedProductReadiness(product: OfissioProduct): ProductReadiness {
  const blockingIssues: ProductReadinessIssue[] = [];
  const warnings: ProductReadinessIssue[] = [];
  const model = product.model_3d;
  const modelUrl = model?.url ?? product.model_3d_url ?? "";
  const hasModelReference = Boolean(modelUrl);
  const modelIsValid = isValidGlbReference(modelUrl);
  const model3DStatus = !hasModelReference
    ? "glb_missing"
    : !modelIsValid
      ? "glb_invalid"
      : isLocalGlb(modelUrl)
        ? "local_glb"
        : isSupabaseGlb(modelUrl)
          ? "supabase_glb"
          : "glb_available";

  if (product.status !== "published") blockingIssues.push(blocking("status", "WooCommerce status belum publish", "Buka WooCommerce Product"));
  if (!product.sku.trim()) blockingIssues.push(blocking("sku", "SKU belum diisi", "Buka WooCommerce Product"));
  if (product.priceFrom <= 0) blockingIssues.push(blocking("price", "Harga belum diisi", "Buka WooCommerce Product"));
  if (!(product.categorySlugs?.length || product.category.trim())) blockingIssues.push(blocking("categories", "Kategori produk belum dipilih", "Buka WooCommerce Product"));
  if (!(product.industrySlugs?.length || product.industries.length)) blockingIssues.push(blocking("industries", "Industri belum dipilih", "Pilih Industri"));
  if (!product.has_3d_model) blockingIssues.push(blocking("has_3d_model", "Produk belum ditandai memiliki model 3D", "Isi Field Ofissio"));
  if (!hasModelReference) blockingIssues.push(blocking("model_3d", "File GLB belum diupload", "Upload GLB"));
  else if (!modelIsValid) blockingIssues.push(blocking("model_3d", "File GLB tidak valid", "Upload GLB"));
  if (!model?.id) blockingIssues.push(blocking("model_3d_id", "ID model 3D belum diisi", "Isi Field Ofissio"));
  if (!model?.version) blockingIssues.push(blocking("model_3d_version", "Versi model 3D belum diisi", "Isi Field Ofissio"));
  if (!model?.source) blockingIssues.push(blocking("model_3d_source", "Sumber model 3D belum diisi", "Isi Field Ofissio"));
  if (!model?.filename) blockingIssues.push(blocking("model_3d_filename", "Nama file model 3D belum diisi", "Isi Field Ofissio"));
  if (product.moq <= 0) blockingIssues.push(blocking("moq", "MOQ belum diisi", "Isi Field Ofissio"));
  if (!product.lead_time.trim()) blockingIssues.push(blocking("lead_time", "Lead time belum diisi", "Isi Field Ofissio"));
  if (!VALID_FULFILLMENT_TYPES.includes(product.fulfillment)) blockingIssues.push(blocking("fulfillment_type", "Fulfillment type belum dipilih", "Isi Field Ofissio"));
  if (!VALID_TRANSACTION_MODES.includes(product.transaction_mode)) blockingIssues.push(blocking("transaction_mode", "Transaction mode belum dipilih", "Isi Field Ofissio"));

  if (!product.description.trim()) warnings.push(warning("description", "Deskripsi panjang belum diisi", "Lengkapi deskripsi"));
  if (!product.available_colors.length) warnings.push(warning("colors", "Atribut warna belum lengkap", "Lengkapi atribut"));
  if (!product.material.trim()) warnings.push(warning("material", "Atribut bahan belum lengkap", "Lengkapi atribut"));
  if (!product.available_sizes.length) warnings.push(warning("sizes", "Atribut ukuran belum lengkap", "Lengkapi atribut"));
  if (!product.supports_embroidery) warnings.push(warning("supports_embroidery", "Dukungan bordir belum diaktifkan", "Tinjau dukungan bordir"));
  if (!product.embroidery_zones.length) warnings.push(warning("embroidery_zones", product.supports_embroidery ? "Zona bordir belum dipilih." : "Zona bordir belum diisi", "Pilih zona bordir"));
  if (product.quantityPricing) {
    const pricing = validateQuantityPricing({
      enabled: product.quantityPricing.enabled,
      tiers: product.quantityPricing.tiers,
      moq: product.moq,
    });
    pushQuantityPricingWarnings(warnings, [
      ...pricing.errors,
      ...pricing.warnings,
      ...pricing.info,
    ]);
  }

  return finishReadiness({
    blockingIssues,
    warnings,
    model3DStatus,
    isDraft: product.status !== "published",
    invalidModel: hasModelReference && !modelIsValid,
  });
}

function finishReadiness(input: {
  blockingIssues: ProductReadinessIssue[];
  warnings: ProductReadinessIssue[];
  model3DStatus: Product3DReadinessStatus;
  isDraft: boolean;
  invalidModel: boolean;
}): ProductReadiness {
  const isVisibleInOfissio = input.blockingIssues.length === 0;
  const status: ProductReadinessStatus = isVisibleInOfissio
    ? "valid"
    : input.isDraft
      ? "draft_woocommerce"
      : input.invalidModel
        ? "invalid_3d_model"
        : "missing_required_fields";
  return {
    isVisibleInOfissio,
    status,
    statusLabel: statusLabel(status),
    model3DStatus: input.model3DStatus,
    model3DStatusLabel: modelStatusLabel(input.model3DStatus),
    blockingIssues: input.blockingIssues,
    warnings: input.warnings,
  };
}

function blocking(field: string, label: string, action: string): ProductReadinessIssue {
  return { field, label, action, severity: "blocking" };
}

function warning(field: string, label: string, action: string): ProductReadinessIssue {
  return { field, label, action, severity: "warning" };
}

function pushMissingMeta(
  issues: ProductReadinessIssue[],
  meta: NonNullable<WooCommerceProduct["meta_data"]>,
  field: string,
  label: string,
) {
  if (!getMetaString(meta, field)) {
    issues.push(blocking(field, label, "Isi Field Ofissio"));
  }
}

function pushAttributeWarning(
  issues: ProductReadinessIssue[],
  attributes: WooCommerceAttribute[] | undefined,
  names: string[],
  field: string,
  label: string,
) {
  const wanted = names.map((name) => name.toLowerCase());
  const available = (attributes ?? []).some((attribute) => {
    const name = attribute.name.toLowerCase();
    const slug = attribute.slug?.toLowerCase().replace(/^pa_/, "") ?? "";
    return (
      (wanted.includes(name) || wanted.includes(slug)) &&
      (attribute.options?.length ?? 0) > 0
    );
  });
  if (!available) issues.push(warning(field, label, "Lengkapi atribut"));
}

function hasAnyMetaValue(
  meta: NonNullable<WooCommerceProduct["meta_data"]>,
  keys: string[],
) {
  return keys.some((key) => getMetaValue(meta, key) !== undefined);
}

function pushQuantityPricingWarnings(
  warnings: ProductReadinessIssue[],
  issues: QuantityPricingIssue[],
) {
  const labels = new Set<string>();
  for (const issue of issues) {
    let label: string;
    switch (issue.code) {
      case "tiers_empty":
        label = "Harga quantity belum diatur";
        break;
      case "tier_overlap":
        label = "Tier harga quantity overlap";
        break;
      case "unit_price_invalid":
        label = "Harga per pcs pada tier belum valid";
        break;
      case "first_tier_above_moq":
      case "first_tier_below_moq":
      case "tier_order":
        label = issue.message;
        break;
      default:
        label = "Tier harga quantity tidak valid";
    }
    if (labels.has(label)) continue;
    labels.add(label);
    warnings.push(warning("quantity_pricing", label, "Lengkapi pricing"));
  }
}

function resolveRawModelStatus(input: {
  modelUrl: string;
  storageBucket: string;
  storageKey: string;
  hasModelReference: boolean;
  modelIsValid: boolean;
}): Product3DReadinessStatus {
  if (!input.hasModelReference) return "glb_missing";
  if (!input.modelIsValid) return "glb_invalid";
  if (input.storageBucket && isValidGlbReference(input.storageKey)) return "supabase_glb";
  if (isLocalGlb(input.modelUrl)) return "local_glb";
  if (isSupabaseGlb(input.modelUrl)) return "supabase_glb";
  return "glb_available";
}

function isRawWooCommerceProduct(
  product: WooCommerceProduct | OfissioProduct,
): product is WooCommerceProduct {
  return typeof product.id === "number";
}

export function isValidGlbReference(value: string) {
  if (!value.trim()) return false;
  try {
    const pathname = new URL(value, "https://ofissio.local").pathname.toLowerCase();
    return pathname.endsWith(".glb") || isProductModelResolverPath(pathname);
  } catch {
    const pathname = (value.split(/[?#]/)[0] ?? "").toLowerCase();
    return pathname.endsWith(".glb") || isProductModelResolverPath(pathname);
  }
}

function isProductModelResolverPath(pathname: string) {
  return /^\/api\/products\/woocommerce\/\d+\/3d-model\/signed-url\/?$/.test(pathname);
}

function isLocalGlb(value: string) {
  return /^\/3d\//i.test(value.trim());
}

function isSupabaseGlb(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("supabase") || normalized.includes("/storage/v1/object/");
}

function parseMoney(value?: string) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function normalizeEnumValue(value: unknown) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_");
}

function statusLabel(status: ProductReadinessStatus) {
  switch (status) {
    case "valid":
      return "Valid untuk Ofissio";
    case "draft_woocommerce":
      return "Draft WooCommerce";
    case "invalid_3d_model":
      return "Invalid 3D Model";
    case "missing_required_fields":
      return "Belum Tampil";
  }
}

function modelStatusLabel(status: Product3DReadinessStatus) {
  switch (status) {
    case "glb_available":
      return "GLB Ada";
    case "glb_missing":
      return "GLB Belum Ada";
    case "glb_invalid":
      return "GLB Invalid";
    case "supabase_glb":
      return "Supabase GLB";
    case "local_glb":
      return "Local GLB";
  }
}
