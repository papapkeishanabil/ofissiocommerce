import "server-only";
import { ensureSizeVariants } from "./size-variants.service";
import { stockSize } from "../color-size-variants";
import { PURCHASE_VARIANTS_META, type PurchaseVariant } from "../purchase-variants";
import { BASE_PRICE_META, COLOR_VARIANTS_ENABLED_META, COLOR_VARIANTS_READY_META, DEFAULT_COLOR_META, readColorVariants } from "../color-variants";
import { withLiveColorVariants } from "./color-variants.service";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { normalizeIndustrySlug } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

import { woocommerceClient } from "./woocommerce.client";
import {
  getMetaBoolean,
  getMetaNumber,
  getMetaString,
  getMetaStringArray,
  getMetaValue,
  toWooMetaBoolean,
} from "./woocommerce-product-meta";
import {
  normalizeQuantityPricing,
  sortQuantityPricingTiers,
} from "../quantity-pricing";
import { WOO_PROCESS_ROUTES } from "./woocommerce-product-management.types";
import {
  defaultModelOrientationY,
  normalizeModelOrientationY,
} from "@/types/uniform-3d";
import { getProductReadiness } from "./woocommerce-product-readiness";
import { fromSameOriginWordPressMediaUrl } from "./wordpress-media-proxy";
import { getWordPressMediaRuntimeConfig } from "./wordpress-media-upload.service";
import type {
  AdminWooCommerceProduct,
  AdminWooCommerceProductDetail,
} from "./woocommerce-product-admin.types";
import type { WooCommerceProduct } from "./woocommerce.types";
import type { WooCommerceMetaData, WooCommerceProductWritePayload } from "./woocommerce.types";
import type { AdminWooProductPayload } from "./woocommerce-product-management.validation";
import type { AdminWooQuantityPricingPayload } from "./woocommerce-product-management.validation";

const ADMIN_PAGE_SIZE = 100;
const MAX_ADMIN_PAGES = 100;

export async function listAdminWooCommerceProducts(): Promise<
  AdminWooCommerceProduct[]
> {
  const products: WooCommerceProduct[] = [];
  for (let page = 1; page <= MAX_ADMIN_PAGES; page += 1) {
    const rows = await woocommerceClient.getProducts({
      status: "any",
      per_page: ADMIN_PAGE_SIZE,
      page,
    });
    products.push(...rows);
    if (rows.length < ADMIN_PAGE_SIZE) break;
  }
  return products
    .filter((product) => product.status !== "trash")
    .map(toAdminSummary)
    .sort((left, right) => right.id - left.id);
}

export async function deleteAdminWooCommerceProduct(input: {
  id: number;
  actorId: string;
  request?: Request;
}) {
  try {
    const product = await woocommerceClient.getProductById(input.id);
    if (product.status !== "trash") {
      await woocommerceClient.trashProduct(input.id);
      // WooCommerce may return the pre-trash representation from DELETE.
      // Confirm the persisted state with a fresh read instead.
      const deleted = await woocommerceClient.getProductById(input.id);
      if (deleted.status !== "trash") {
        throw createApiError("BAD_REQUEST", "Penghapusan produk belum dikonfirmasi WooCommerce.", 502);
      }
    }
    logProductAudit("product_trashed", input.id, input, { sku: product.sku });
    return { id: input.id };
  } catch (error) {
    logProductAudit("product_delete_failed", input.id, input, { reason: "provider_error" });
    throw error;
  }
}

export async function getAdminWooCommerceProduct(
  id: string | number,
): Promise<AdminWooCommerceProductDetail> {
  const product = await withLiveColorVariants(await woocommerceClient.getProductById(id));
  const summary = toAdminSummary(product);
  const meta = product.meta_data ?? [];
  const quantityPricing = normalizeQuantityPricing({
    enabled: getMetaBoolean(meta, "quantity_pricing_enabled", true),
    mode: getMetaString(meta, "quantity_pricing_mode"),
    basis: getMetaString(meta, "quantity_basis"),
    tiers: getMetaValue(meta, "quantity_pricing_tiers"),
    moq: getMetaNumber(meta, "moq", 0),
  }).quantityPricing;
  const supportsEmbroidery = getMetaBoolean(meta, "supports_embroidery", false);
  return {
    ...summary,
    purchaseVariants: (getMetaValue(meta, PURCHASE_VARIANTS_META) as PurchaseVariant[] | undefined) ?? [],
    colorVariants: readColorVariants(product),
    colorVariantsEnabled: getMetaBoolean(meta, COLOR_VARIANTS_ENABLED_META, false),
    colorSizeVariantsEnabled: getMetaBoolean(meta, "ofissio_color_size_variants_enabled", false),
    colorVariantsReady: getMetaBoolean(meta, COLOR_VARIANTS_READY_META, false),
    defaultColor: getMetaString(meta, DEFAULT_COLOR_META),
    description: product.description ?? "",
    shortDescription: product.short_description ?? "",
    weightGram: shippingNumber(meta, "ofissio_weight_gram", Number(product.weight) * 1000),
    lengthCm: shippingNumber(meta, "ofissio_length_cm", Number(product.dimensions?.length)),
    widthCm: shippingNumber(meta, "ofissio_width_cm", Number(product.dimensions?.width)),
    heightCm: shippingNumber(meta, "ofissio_height_cm", Number(product.dimensions?.height)),
    imageCount: product.images?.length ?? 0,
    imageUrls: (product.images ?? []).map((image) => image.src).filter(Boolean),
    images: (product.images ?? [])
      .filter((image) => Boolean(image.src))
      .map((image) => ({
        id: Number.isInteger(image.id) && image.id > 0 ? image.id : null,
        src: image.src,
        name: image.name?.trim() || stripHtml(product.name),
        alt: image.alt?.trim() || stripHtml(product.name),
      })),
    attributes: (product.attributes ?? []).map((attribute) => ({
      name: attribute.name,
      slug: attribute.slug?.replace(/^pa_/, "") ?? "",
      options: (attribute.options ?? []).map(String).filter(Boolean),
    })),
    ofissioMeta: {
      has3DModel: getMetaBoolean(meta, "has_3d_model", false),
      model3DUrl: getMetaString(meta, "model_3d_url"),
      model3DStorageBucket: getMetaString(meta, "model_3d_storage_bucket"),
      model3DStorageKey: getMetaString(meta, "model_3d_storage_key"),
      model3DId: getMetaString(meta, "model_3d_id"),
      model3DVersion: getMetaString(meta, "model_3d_version"),
      model3DSource: getMetaString(meta, "model_3d_source"),
      model3DFilename: getMetaString(meta, "model_3d_filename"),
      model3DUpdatedAt: getMetaString(meta, "model_3d_updated_at"),
      model3DExposure: getMetaNumber(meta, "model3d_exposure", 1.15),
      model3DEmissive: getMetaNumber(meta, "model3d_emissive", 0.6),
      model3DBrightness: getMetaNumber(meta, "model3d_brightness", 1),
      model3DSaturation: getMetaNumber(meta, "model3d_saturation", 1),
      model3DHue: getMetaNumber(meta, "model3d_hue", 0),
      model3DTemperature: getMetaNumber(meta, "model3d_temperature", 0),
      model3DRotationY: normalizeModelOrientationY(
        getMetaNumber(meta, "model3d_rotation_y", defaultModelOrientationY(product.sku)),
        defaultModelOrientationY(product.sku),
      ),
      moq: getMetaNumber(meta, "moq", 0),
      leadTime: getMetaString(meta, "lead_time"),
      fulfillmentType: getMetaString(meta, "fulfillment_type"),
      transactionMode: getMetaString(meta, "transaction_mode"),
      supportsEmbroidery,
      supportsScreenPrinting: getMetaBoolean(
        meta,
        "supports_screen_printing",
        getMetaBoolean(meta, "supports_screen_print", false),
      ),
      supportsDtf: getMetaBoolean(meta, "supports_dtf", false),
      embroideryZones: getMetaStringArray(meta, "embroidery_zones"),
      hasLegacyEmbroideryPricing: getMetaValue(meta, "embroidery_pricing") != null,
      alwaysOrderable: getMetaBoolean(meta, "always_orderable", true),
      replenishmentPolicy: getMetaString(meta, "replenishment_policy") || "internal_warning_only",
      processRoute: getMetaString(meta, "process_route") || "fulfillment",
      gender: getMetaString(meta, "gender") || "unisex",
      sleeveType: getMetaString(meta, "sleeve_type") || "short",
      safetyFeatures: getMetaStringArray(meta, "safety_features"),
      quantityPricingEnabled: quantityPricing.enabled,
      quantityPricingMode: quantityPricing.mode,
      quantityBasis: quantityPricing.basis,
      quantityPricingTiers: quantityPricing.tiers,
    },
  };
}

export async function createAdminWooCommerceProduct(input: {
  payload: AdminWooProductPayload;
  actorId: string;
  request?: Request;
}) {
  try {
    const managedAttributes = await ensureGlobalProductAttributes(input.payload);
    const created = await woocommerceClient.createProduct(
      buildWritePayload(input.payload, undefined, managedAttributes),
    );
    logProductAudit("product_created", created.id, input, {
      status: created.status,
      sku: created.sku,
    });
    logProductAudit("product_ofissio_fields_updated", created.id, input);
    logProductAudit("product_meta_updated", created.id, input);
    logProductAudit("product_quantity_pricing_updated", created.id, input, {
      tierCount: input.payload.quantityPricingTiers.length,
      enabled: input.payload.quantityPricingEnabled,
    });
    await ensureSizeVariants(created, woocommerceClient);
    return getAdminWooCommerceProduct(created.id);
  } catch (error) {
    logProductAudit("product_create_failed", null, input, {
      reason: "provider_or_validation_error",
    });
    throw error;
  }
}

export async function updateAdminWooCommerceProduct(input: {
  id: number;
  payload: AdminWooProductPayload;
  actorId: string;
  request?: Request;
}) {
  try {
    const [current, managedAttributes] = await Promise.all([
      woocommerceClient.getProductById(input.id),
      ensureGlobalProductAttributes(input.payload),
    ]);
    const updated = await woocommerceClient.updateProduct(
      input.id,
      buildWritePayload(input.payload, current, managedAttributes),
    );
    logProductAudit("product_updated", updated.id, input, {
      status: updated.status,
      sku: updated.sku,
    });
    logProductAudit("product_ofissio_fields_updated", updated.id, input);
    logProductAudit("product_meta_updated", updated.id, input);
    logProductAudit("product_quantity_pricing_updated", updated.id, input, {
      tierCount: input.payload.quantityPricingTiers.length,
      enabled: input.payload.quantityPricingEnabled,
    });
    await ensureSizeVariants(updated, woocommerceClient);
    return getAdminWooCommerceProduct(updated.id);
  } catch (error) {
    logProductAudit("product_update_failed", input.id, input, {
      reason: "provider_or_validation_error",
    });
    logProductAudit("product_meta_update_failed", input.id, input, {
      reason: "provider_or_validation_error",
    });
    logProductAudit("product_quantity_pricing_update_failed", input.id, input, {
      reason: "provider_or_validation_error",
    });
    throw error;
  }
}

export async function updateAdminWooCommerceQuantityPricing(input: {
  id: number;
  payload: AdminWooQuantityPricingPayload;
  actorId: string;
  request?: Request;
}) {
  try {
    const current = await woocommerceClient.getProductById(input.id);
    const tiers = sortQuantityPricingTiers(input.payload.tiers);
    const entries: Array<[string, unknown]> = [
      ["quantity_pricing_enabled", toWooMetaBoolean(input.payload.quantityPricingEnabled)],
      ["quantity_pricing_mode", input.payload.quantityPricingMode],
      ["quantity_basis", input.payload.quantityBasis],
      ["quantity_pricing_tiers", JSON.stringify(tiers)],
    ];
    await woocommerceClient.updateProduct(input.id, {
      meta_data: entries.map(([key, value]) =>
        metaEntry(current.meta_data ?? [], key, value),
      ),
    });
    logProductAudit("product_quantity_pricing_updated", input.id, input, {
      tierCount: tiers.length,
      enabled: input.payload.quantityPricingEnabled,
    });
    return getAdminWooCommerceProduct(input.id);
  } catch (error) {
    logProductAudit("product_quantity_pricing_update_failed", input.id, input, {
      reason: "provider_or_validation_error",
    });
    throw error;
  }
}

export async function updateAdminWooCommerceProduct3DMeta(input: {
  id: number;
  values: Record<string, string | boolean | number>;
  actorId: string;
  request?: Request;
}) {
  try {
    const current = await woocommerceClient.getProductById(input.id);
    const metaData = Object.entries(input.values).map(([key, value]) =>
      metaEntry(current.meta_data ?? [], key, value),
    );
    await woocommerceClient.updateProduct(input.id, { meta_data: metaData });
    logProductAudit("product_meta_updated", input.id, input, {
      fields: Object.keys(input.values),
    });
    return getAdminWooCommerceProduct(input.id);
  } catch (error) {
    logProductAudit("product_meta_update_failed", input.id, input, {
      fields: Object.keys(input.values),
      reason: "provider_error",
    });
    throw error;
  }
}

/**
 * Terapkan MOQ default sebuah rute pengerjaan ke SEMUA produk WooCommerce
 * rute itu (aksi massal dari master MOQ per rute). Menulis meta "moq" per
 * produk langsung di layer service — bukan lewat route PATCH per-produk yang
 * dibatasi rate limit.
 */
export async function applyMoqDefaultToProcessRoute(input: {
  processRoute: (typeof WOO_PROCESS_ROUTES)[number];
  moq: number;
  actorId: string;
  request?: Request;
}): Promise<{ updatedCount: number; productIds: number[] }> {
  const products: WooCommerceProduct[] = [];
  for (let page = 1; page <= MAX_ADMIN_PAGES; page += 1) {
    const rows = await woocommerceClient.getProducts({
      status: "any",
      per_page: ADMIN_PAGE_SIZE,
      page,
    });
    products.push(...rows);
    if (rows.length < ADMIN_PAGE_SIZE) break;
  }
  const targets = products.filter(
    (product) =>
      (getMetaString(product.meta_data ?? [], "process_route") || "fulfillment") ===
      input.processRoute,
  );
  const productIds: number[] = [];
  for (const product of targets) {
    await woocommerceClient.updateProduct(product.id, {
      meta_data: [metaEntry(product.meta_data ?? [], "moq", input.moq)],
    });
    productIds.push(product.id);
  }
  logProductAudit("product_meta_updated", null, input, {
    fields: ["moq"],
    processRoute: input.processRoute,
    moq: input.moq,
    productCount: productIds.length,
  });
  return { updatedCount: productIds.length, productIds };
}

function buildWritePayload(
  payload: AdminWooProductPayload,
  current?: WooCommerceProduct,
  managedAttributes: Awaited<ReturnType<typeof ensureGlobalProductAttributes>> = [],
): WooCommerceProductWritePayload {
  const meta = current?.meta_data ?? [];
  const industries = unique(
    payload.industries.map(normalizeIndustrySlug).filter(Boolean),
  );
  const entries: Array<[string, unknown]> = [
    [BASE_PRICE_META, payload.regularPrice],
    ["industries", JSON.stringify(industries)],
    ["moq", payload.moq],
    ["lead_time", `${payload.leadTimeDays} hari`],
    ["fulfillment_type", payload.fulfillmentType],
    ["transaction_mode", payload.transactionMode],
    ["always_orderable", toWooMetaBoolean(payload.alwaysOrderable)],
    ["replenishment_policy", payload.replenishmentPolicy],
    ["process_route", payload.processRoute],
    ["model3d_exposure", payload.model3dExposure ?? 1.15],
    ["model3d_emissive", payload.model3dEmissive ?? 0.6],
    ["model3d_brightness", payload.model3dBrightness ?? 1],
    ["model3d_saturation", payload.model3dSaturation ?? 1],
    ["model3d_hue", payload.model3dHue ?? 0],
    ["model3d_temperature", payload.model3dTemperature ?? 0],
    ["model3d_rotation_y", payload.model3dRotationY ?? defaultModelOrientationY(payload.sku)],
    ["supports_embroidery", toWooMetaBoolean(payload.supportsEmbroidery)],
    ["supports_screen_print", toWooMetaBoolean(payload.supportsScreenPrinting)],
    ["supports_screen_printing", toWooMetaBoolean(payload.supportsScreenPrinting)],
    ["supports_dtf", toWooMetaBoolean(payload.supportsDtf)],
    ["embroidery_zones", JSON.stringify(unique(payload.embroideryZones))],
    ["available_colors", JSON.stringify(unique(payload.colors))],
    ["available_sizes", JSON.stringify(unique(payload.sizes))],
    ["material", payload.materials[0] ?? ""],
    ["gender", payload.gender],
    ["sleeve_type", payload.sleeveType],
    ["safety_features", JSON.stringify(unique(payload.safetyFeatures))],
    ["quantity_pricing_enabled", toWooMetaBoolean(payload.quantityPricingEnabled)],
    ["ofissio_weight_gram", payload.weightGram],
    ["ofissio_length_cm", payload.lengthCm],
    ["ofissio_width_cm", payload.widthCm],
    ["ofissio_height_cm", payload.heightCm],
    ["quantity_pricing_mode", payload.quantityPricingMode],
    ["quantity_basis", payload.quantityBasis],
    [
      "quantity_pricing_tiers",
      JSON.stringify(sortQuantityPricingTiers(payload.quantityPricingTiers)),
    ],
  ];

  if (!current) {
    entries.push(["ofissio_stock_variants_ready", false]);
    if (payload.colors.length > 1) entries.push([COLOR_VARIANTS_ENABLED_META, true], [COLOR_VARIANTS_READY_META, false], ["ofissio_color_size_variants_enabled", true]);
  }

  return {
    name: payload.name,
    ...(payload.slug ? { slug: payload.slug } : {}),
    sku: payload.sku,
    regular_price: String(payload.regularPrice),
    // WooCommerce standard weight uses kilograms and dimensions use centimetres
    // in this store. Canonical Ofissio values are also persisted as metadata.
    weight: String(payload.weightGram / 1000),
    dimensions: {
      length: String(payload.lengthCm),
      width: String(payload.widthCm),
      height: String(payload.heightCm),
    },
    status: payload.status,
    description: payload.description,
    short_description: payload.shortDescription,
    categories: payload.categoryIds.map((id) => ({ id })),
    images: payload.imageUrls.map((src) => {
      const existing = current?.images?.find((image) => image.src === src);
      if (existing?.id) return { id: existing.id };
      // Path proxy same-origin dikembalikan ke URL absolut — WooCommerce
      // tidak boleh menyimpan `/api/media/...`.
      return {
        src: fromSameOriginWordPressMediaUrl(
          src,
          getWordPressMediaRuntimeConfig().baseUrl,
        ),
      };
    }),
    attributes: mergeManagedAttributes(current?.attributes ?? [], [
      { ...managedAttribute("Warna", "warna", payload.colors, managedAttributes, ["warna", "color"]), variation: getMetaBoolean(meta, COLOR_VARIANTS_ENABLED_META, false) || Boolean(current?.attributes?.find((attribute) => ["warna", "color"].includes(normalizeAttributeSlug(attribute.slug || attribute.name)))?.variation) },
      { ...managedAttribute("Ukuran", "ukuran", payload.sizes.map(stockSize), managedAttributes, ["ukuran", "size"]), variation: getMetaBoolean(meta, "ofissio_color_size_variants_enabled", false) || getMetaBoolean(meta, "ofissio_purchase_variants_enabled", false) || Boolean(current?.attributes?.find((attribute) => ["ukuran", "size"].includes(normalizeAttributeSlug(attribute.slug || attribute.name)))?.variation) },
      managedAttribute("Material", "material", payload.materials, managedAttributes, ["material", "bahan"]),
      managedAttribute("Gender", "gender", [payload.gender], managedAttributes, ["gender"]),
      managedAttribute("Tipe Lengan", "tipe-lengan", [payload.sleeveType], managedAttributes, ["tipe-lengan", "sleeve"]),
      managedAttribute("Safety Features", "safety-features", payload.safetyFeatures, managedAttributes, ["safety-features", "safety"]),
    ]),
    meta_data: entries.map(([key, value]) => metaEntry(meta, key, value)),
  };
}

function shippingNumber(
  meta: WooCommerceMetaData[],
  key: string,
  standardValue: number,
) {
  const canonical = getMetaNumber(meta, key, 0);
  if (canonical > 0) return canonical;
  return Number.isFinite(standardValue) && standardValue > 0 ? standardValue : 0;
}

function managedAttribute(
  name: string,
  slug: string,
  options: string[],
  attributes: Array<{ id: number; name: string; slug: string }>,
  aliases: string[],
) {
  const global = attributes.find((attribute) => aliases.includes(normalizeAttributeSlug(attribute.slug || attribute.name)));
  return global
    ? { id: global.id, slug, visible: true, variation: false, options: unique(options) }
    : { id: 0, name, slug, visible: true, variation: false, options: unique(options) };
}

async function ensureGlobalProductAttributes(payload: AdminWooProductPayload) {
  const specs = [
    { name: "Warna", slug: "warna", aliases: ["warna", "color"], terms: payload.colors },
    { name: "Ukuran", slug: "ukuran", aliases: ["ukuran", "size"], terms: payload.sizes },
    { name: "Material", slug: "material", aliases: ["material", "bahan"], terms: payload.materials },
    { name: "Gender", slug: "gender", aliases: ["gender"], terms: ["men", "women", "unisex"] },
    { name: "Tipe Lengan", slug: "tipe-lengan", aliases: ["tipe-lengan", "sleeve"], terms: ["short", "long"] },
    { name: "Safety Features", slug: "safety-features", aliases: ["safety-features", "safety"], terms: payload.safetyFeatures },
  ];
  const attributes = await woocommerceClient.getAttributes();
  for (const spec of specs) {
    let attribute = attributes.find((item) => spec.aliases.includes(normalizeAttributeSlug(item.slug || item.name)));
    if (!attribute) {
      attribute = await woocommerceClient.createAttribute({
        name: spec.name,
        slug: spec.slug,
        type: "select",
        order_by: "menu_order",
        has_archives: false,
      });
      attributes.push(attribute);
    }
    const existingTerms = await woocommerceClient.getAttributeTerms(attribute.id);
    const existingNames = new Set(existingTerms.map((term) => term.name.trim().toLocaleLowerCase("id-ID")));
    for (const term of unique(spec.terms)) {
      if (!existingNames.has(term.toLocaleLowerCase("id-ID"))) {
        await woocommerceClient.createAttributeTerm(attribute.id, { name: term });
        existingNames.add(term.toLocaleLowerCase("id-ID"));
      }
    }
  }
  return attributes;
}

function mergeManagedAttributes(
  current: NonNullable<WooCommerceProduct["attributes"]>,
  managed: Array<{
    id?: number;
    name?: string;
    slug: string;
    visible?: boolean;
    variation?: boolean;
    options: string[];
  }>,
) {
  const managedSlugs = new Set(managed.map((item) => normalizeAttributeSlug(item.slug ?? item.name ?? "")));
  const preserved = current
    .filter((item) => !managedSlugs.has(normalizeAttributeSlug(item.slug || item.name)))
    .map((item) => ({
      ...(item.id ? { id: item.id } : { name: item.name }),
      visible: item.visible ?? true,
      variation: item.variation ?? false,
      options: item.options ?? [],
    }));
  return [...preserved, ...managed.filter((item) => item.options.length > 0).map(({ slug: _slug, ...item }) => item)];
}

function normalizeAttributeSlug(value: string) {
  const slug = value.toLowerCase().replace(/^pa_/, "").replace(/[ _]+/g, "-");
  return ({
    color: "warna",
    size: "ukuran",
    bahan: "material",
    sleeve: "tipe-lengan",
    safety: "safety-features",
  } as Record<string, string>)[slug] ?? slug;
}

function metaEntry(meta: WooCommerceMetaData[], key: string, value: unknown): WooCommerceMetaData {
  const existing = [...meta].reverse().find((item) => item.key === key && item.id);
  return { ...(existing?.id ? { id: existing.id } : {}), key, value };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function logProductAudit(
  action: string,
  productId: number | null,
  input: { actorId: string; request?: Request },
  metadata: Record<string, unknown> = {},
) {
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action,
    entityType: "product",
    entityId: productId == null ? null : String(productId),
    metadata,
  });
}

function toAdminSummary(product: WooCommerceProduct): AdminWooCommerceProduct {
  const productName = stripHtml(product.name) || `Produk #${product.id}`;
  const primaryImage = (product.images ?? []).find((image) => Boolean(image.src));
  return {
    id: product.id,
    name: productName,
    slug: product.slug,
    sku: product.sku?.trim() ?? "",
    price: getMetaBoolean(product.meta_data ?? [], COLOR_VARIANTS_ENABLED_META, false)
      ? getMetaNumber(product.meta_data ?? [], BASE_PRICE_META, parseMoney(product.regular_price || product.price || product.sale_price))
      : parseMoney(product.regular_price || product.price || product.sale_price),
    status: product.status,
    categories: (product.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    industries: getMetaStringArray(product.meta_data ?? [], "industries"),
    primaryImage: primaryImage
      ? {
          id: Number.isInteger(primaryImage.id) && primaryImage.id > 0
            ? primaryImage.id
            : null,
          src: primaryImage.src,
          name: primaryImage.name?.trim() || productName,
          alt: `Foto utama ${productName}`,
        }
      : null,
    readiness: getProductReadiness(product),
    wooEditUrl: buildWooEditUrl(product.id),
  };
}

function buildWooEditUrl(id: number) {
  const baseUrl = getCommerceRuntimeConfig().woocommerce.baseUrl;
  if (!baseUrl) return null;
  try {
    const normalized = baseUrl
      .replace(/\/wp-json\/wc\/v3\/?$/i, "")
      .replace(/\/+$/, "");
    return `${normalized}/wp-admin/post.php?post=${encodeURIComponent(String(id))}&action=edit`;
  } catch {
    return null;
  }
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseMoney(value?: string) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
