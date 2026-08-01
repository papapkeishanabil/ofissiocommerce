import "server-only";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { normalizeIndustrySlug } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { logAuditEvent } from "@/lib/security/audit-log";

import { woocommerceClient } from "./woocommerce.client";
import {
  getMetaBoolean,
  getMetaNumber,
  getMetaString,
  getMetaStringArray,
  getMetaValue,
} from "./woocommerce-product-meta";
import {
  normalizeQuantityPricing,
  sortQuantityPricingTiers,
} from "../quantity-pricing";
import { getProductReadiness } from "./woocommerce-product-readiness";
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
    .map(toAdminSummary)
    .sort((left, right) => right.id - left.id);
}

export async function getAdminWooCommerceProduct(
  id: string | number,
): Promise<AdminWooCommerceProductDetail> {
  const product = await woocommerceClient.getProductById(id);
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
    description: product.description ?? "",
    shortDescription: product.short_description ?? "",
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
    const created = await woocommerceClient.createProduct(
      buildWritePayload(input.payload),
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
    const current = await woocommerceClient.getProductById(input.id);
    const updated = await woocommerceClient.updateProduct(
      input.id,
      buildWritePayload(input.payload, current),
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
      ["quantity_pricing_enabled", input.payload.quantityPricingEnabled],
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

function buildWritePayload(
  payload: AdminWooProductPayload,
  current?: WooCommerceProduct,
): WooCommerceProductWritePayload {
  const meta = current?.meta_data ?? [];
  const industries = unique(
    payload.industries.map(normalizeIndustrySlug).filter(Boolean),
  );
  const entries: Array<[string, unknown]> = [
    ["industries", JSON.stringify(industries)],
    ["moq", payload.moq],
    ["lead_time", `${payload.leadTimeDays} hari`],
    ["fulfillment_type", payload.fulfillmentType],
    ["transaction_mode", payload.transactionMode],
    ["always_orderable", payload.alwaysOrderable],
    ["replenishment_policy", payload.replenishmentPolicy],
    ["process_route", payload.processRoute],
    ["supports_embroidery", payload.supportsEmbroidery],
    ["supports_screen_print", payload.supportsScreenPrinting],
    ["supports_screen_printing", payload.supportsScreenPrinting],
    ["supports_dtf", payload.supportsDtf],
    ["embroidery_zones", JSON.stringify(unique(payload.embroideryZones))],
    ["available_colors", JSON.stringify(unique(payload.colors))],
    ["available_sizes", JSON.stringify(unique(payload.sizes))],
    ["material", payload.materials[0] ?? ""],
    ["gender", payload.gender],
    ["sleeve_type", payload.sleeveType],
    ["safety_features", JSON.stringify(unique(payload.safetyFeatures))],
    ["quantity_pricing_enabled", payload.quantityPricingEnabled],
    ["quantity_pricing_mode", payload.quantityPricingMode],
    ["quantity_basis", payload.quantityBasis],
    [
      "quantity_pricing_tiers",
      JSON.stringify(sortQuantityPricingTiers(payload.quantityPricingTiers)),
    ],
  ];

  return {
    name: payload.name,
    ...(payload.slug ? { slug: payload.slug } : {}),
    sku: payload.sku,
    regular_price: String(payload.regularPrice),
    status: payload.status,
    description: payload.description,
    short_description: payload.shortDescription,
    categories: payload.categoryIds.map((id) => ({ id })),
    images: payload.imageUrls.map((src) => {
      const existing = current?.images?.find((image) => image.src === src);
      return existing?.id ? { id: existing.id } : { src };
    }),
    attributes: mergeManagedAttributes(current?.attributes ?? [], [
      managedAttribute("Color", "color", payload.colors),
      managedAttribute("Size", "size", payload.sizes),
      managedAttribute("Material", "material", payload.materials),
      managedAttribute("Gender", "gender", [payload.gender]),
      managedAttribute("Sleeve", "sleeve", [payload.sleeveType]),
      managedAttribute("Safety Features", "safety-features", payload.safetyFeatures),
    ]),
    meta_data: entries.map(([key, value]) => metaEntry(meta, key, value)),
  };
}

function managedAttribute(name: string, slug: string, options: string[]) {
  return { id: 0, name, slug, visible: true, variation: false, options: unique(options) };
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
  return value.toLowerCase().replace(/^pa_/, "").replace(/[ _]+/g, "-");
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
    price: parseMoney(product.regular_price || product.price || product.sale_price),
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
