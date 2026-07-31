import "server-only";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";

import { woocommerceClient } from "./woocommerce.client";
import {
  getMetaBoolean,
  getMetaNumber,
  getMetaString,
  getMetaStringArray,
} from "./woocommerce-product-meta";
import { getProductReadiness } from "./woocommerce-product-readiness";
import type {
  AdminWooCommerceProduct,
  AdminWooCommerceProductDetail,
} from "./woocommerce-product-admin.types";
import type { WooCommerceProduct } from "./woocommerce.types";

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
  return {
    ...summary,
    description: stripHtml(product.description),
    shortDescription: stripHtml(product.short_description),
    imageCount: product.images?.length ?? 0,
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
      moq: getMetaNumber(meta, "moq", 0),
      leadTime: getMetaString(meta, "lead_time"),
      fulfillmentType: getMetaString(meta, "fulfillment_type"),
      transactionMode: getMetaString(meta, "transaction_mode"),
      supportsEmbroidery: getMetaBoolean(meta, "supports_embroidery", false),
      embroideryZones: getMetaStringArray(meta, "embroidery_zones"),
    },
  };
}

function toAdminSummary(product: WooCommerceProduct): AdminWooCommerceProduct {
  return {
    id: product.id,
    name: stripHtml(product.name) || `Produk #${product.id}`,
    slug: product.slug,
    sku: product.sku?.trim() ?? "",
    price: parseMoney(product.sale_price || product.price || product.regular_price),
    status: product.status,
    categories: (product.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    industries: getMetaStringArray(product.meta_data ?? [], "industries"),
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
