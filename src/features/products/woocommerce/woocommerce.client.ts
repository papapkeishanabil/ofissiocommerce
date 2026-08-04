import "server-only";

import { Buffer } from "node:buffer";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

import type {
  WooCommerceAttribute,
  WooCommerceAttributeTerm,
  WooCommerceCategory,
  WooCommerceCreateOrderInput,
  WooCommerceListParams,
  WooCommerceOrder,
  WooCommerceProduct,
  WooCommerceProductWritePayload,
  WooCommerceUpdateOrderInput,
} from "./woocommerce.types";
import {
  applyWooCommerceLoopbackAuth,
  allowSelfSignedTlsForWooUrl,
  requestWooCommerceJson,
} from "./woocommerce-http";
import { normalizeWooCommerceMediaUrl } from "./woocommerce-media-url";

export const woocommerceClient = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  getCategories,
  createCategory,
  updateCategory,
  getAttributes,
  getAttributeTerms,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderById,
};

async function createProduct(payload: WooCommerceProductWritePayload) {
  const product = await wcFetch<WooCommerceProduct>("/products", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeProductMedia(product);
}

async function updateProduct(
  id: string | number,
  payload: WooCommerceProductWritePayload,
) {
  const product = await wcFetch<WooCommerceProduct>(
    `/products/${encodeURIComponent(String(id))}`,
    undefined,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return normalizeProductMedia(product);
}

async function getProducts(params: WooCommerceListParams = {}) {
  const products = await wcFetch<WooCommerceProduct[]>("/products", {
    status: params.status ?? "publish",
    per_page: String(params.per_page ?? 100),
    page: String(params.page ?? 1),
    ...(params.slug ? { slug: params.slug } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.category ? { category: params.category } : {}),
  });
  return products.map(normalizeProductMedia);
}

async function getProductById(id: string | number) {
  const product = await wcFetch<WooCommerceProduct>(
    `/products/${encodeURIComponent(String(id))}`,
  );
  return normalizeProductMedia(product);
}

async function getProductBySlug(slug: string) {
  const products = await getProducts({ slug, per_page: 1 });
  return products[0] ?? null;
}

async function getCategories() {
  return wcFetch<WooCommerceCategory[]>("/products/categories", {
    per_page: "100",
    hide_empty: "false",
    orderby: "name",
    order: "asc",
  });
}

async function createCategory(input: {
  name: string;
  slug?: string;
  description?: string;
}) {
  return wcFetch<WooCommerceCategory>("/products/categories", undefined, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function updateCategory(
  id: string | number,
  patch: {
    name?: string;
    slug?: string;
    description?: string;
  },
) {
  return wcFetch<WooCommerceCategory>(
    `/products/categories/${encodeURIComponent(String(id))}`,
    undefined,
    {
      method: "PUT",
      body: JSON.stringify(patch),
    },
  );
}

async function getAttributes() {
  return wcFetch<WooCommerceAttribute[]>("/products/attributes", {
    per_page: "100",
  });
}

async function getAttributeTerms(id: string | number) {
  return wcFetch<WooCommerceAttributeTerm[]>(
    `/products/attributes/${encodeURIComponent(String(id))}/terms`,
    {
      per_page: "100",
      hide_empty: "false",
      orderby: "name",
      order: "asc",
    },
  );
}

async function createOrder(payload: WooCommerceCreateOrderInput) {
  return wcFetch<WooCommerceOrder>("/orders", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateOrderStatus(id: string | number, status: string) {
  return wcFetch<WooCommerceOrder>(`/orders/${encodeURIComponent(String(id))}`, undefined, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

async function getOrderById(id: string | number) {
  return wcFetch<WooCommerceOrder>(`/orders/${encodeURIComponent(String(id))}`);
}

async function wcFetch<T>(
  path: string,
  params?: Record<string, string>,
  init?: RequestInit,
): Promise<T> {
  const config = getCommerceRuntimeConfig();
  if (!config.woocommerce.enabled || !config.woocommerce.isConfigured) {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "WooCommerce belum dikonfigurasi.",
      503,
    );
  }

  const url = new URL(`${normalizeBaseUrl(config.woocommerce.baseUrl)}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const usesLoopbackOAuth = applyWooCommerceLoopbackAuth(
    url,
    config.woocommerce.consumerKey,
    config.woocommerce.consumerSecret,
    init?.method,
  );
  const auth = Buffer.from(
    `${config.woocommerce.consumerKey}:${config.woocommerce.consumerSecret}`,
  ).toString("base64");

  try {
    const response = await requestWooCommerceJson<T>(url, {
      method: init?.method,
      headers: {
        ...(usesLoopbackOAuth ? {} : { Authorization: `Basic ${auth}` }),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      body: typeof init?.body === "string" ? init.body : undefined,
      allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
    });
    if (!response.ok) {
      throw new Error(`WooCommerce responded ${response.status}`);
    }
    return response.data;
  } catch (error) {
    logAuditEvent({
      action: "woocommerce_request_failed",
      entityType: "woocommerce",
      metadata: {
        path,
        message: error instanceof Error ? error.message : "unknown_error",
      },
    });
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "WooCommerce sedang tidak tersedia.",
      503,
    );
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.replace(/\/$/, "");
  if (trimmed.endsWith("/wp-json/wc/v3")) return trimmed;
  return `${trimmed}/wp-json/wc/v3`;
}

async function updateOrder(
  id: string | number,
  payload: WooCommerceUpdateOrderInput,
) {
  return wcFetch<WooCommerceOrder>(`/orders/${encodeURIComponent(String(id))}`, undefined, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

function normalizeProductMedia(product: WooCommerceProduct): WooCommerceProduct {
  const commerceConfig = getCommerceRuntimeConfig();
  const mediaBaseUrl =
    process.env.WORDPRESS_MEDIA_BASE_URL?.trim() ||
    commerceConfig.woocommerce.baseUrl;

  return {
    ...product,
    images: (product.images ?? []).map((image) => ({
      ...image,
      src: normalizeWooCommerceMediaUrl(image.src, mediaBaseUrl),
    })),
  };
}
