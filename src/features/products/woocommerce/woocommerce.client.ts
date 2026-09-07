import "server-only";

import { Buffer } from "node:buffer";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { SecurityApiError } from "@/lib/security/security.types";

import type {
  WooCommerceAttribute,
  WooCommerceAttributeTerm,
  WooCommerceCategory,
  WooCommerceCoupon,
  WooCommerceCouponWritePayload,
  WooCommerceCouponUpdatePayload,
  WooCommerceCreateOrderInput,
  WooCommerceListParams,
  WooCommerceOrder,
  WooCommerceProduct,
  WooCommerceProductVariation,
  WooCommerceProductVariationWritePayload,
  WooCommerceProductWritePayload,
  WooCommerceUpdateOrderInput,
} from "./woocommerce.types";
import {
  applyWooCommerceLoopbackAuth,
  allowSelfSignedTlsForWooUrl,
  requestWooCommerceJson,
} from "./woocommerce-http";
import { toProxiedWordPressMediaUrl } from "./wordpress-media-proxy";

export const woocommerceClient = {
  getProducts,
  getProductById,
  getProductBySlug,
  getProductVariations,
  getProductVariation,
  createProductVariation,
  updateProductVariation,
  createProduct,
  deleteProduct,
  deleteProductAndConfirm,
  updateProduct,
  getCategories,
  getCoupons,
  createCoupon,
  updateCoupon,
  createCategory,
  updateCategory,
  getAttributes,
  createAttribute,
  getAttributeTerms,
  createAttributeTerm,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderById,
};

async function getCoupons(params: { code?: string; page?: number; per_page?: number } = {}) {
  return wcFetch<WooCommerceCoupon[]>("/coupons", {
    per_page: String(params.per_page ?? 100),
    page: String(params.page ?? 1),
    ...(params.code ? { code: params.code.toLowerCase() } : {}),
  });
}

async function createCoupon(payload: WooCommerceCouponWritePayload) {
  return wcFetch<WooCommerceCoupon>("/coupons", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateCoupon(id: string | number, payload: WooCommerceCouponUpdatePayload) {
  return wcFetch<WooCommerceCoupon>(`/coupons/${encodeURIComponent(String(id))}`, undefined, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

async function createAttribute(input: {
  name: string;
  slug: string;
  type?: "select";
  order_by?: "menu_order" | "name" | "name_num" | "id";
  has_archives?: boolean;
}) {
  return wcFetch<WooCommerceAttribute>("/products/attributes", undefined, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function createProduct(payload: WooCommerceProductWritePayload) {
  const product = await wcFetch<WooCommerceProduct>("/products", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeProductMedia(product);
}

async function deleteProduct(id: string | number) {
  return wcFetch<WooCommerceProduct>(`/products/${encodeURIComponent(String(id))}`, { force: "true" }, { method: "DELETE" });
}

async function deleteProductAndConfirm(id: string | number) {
  await deleteProduct(id);
  try {
    await getProductById(id);
    return false;
  } catch (error) {
    if (error instanceof SecurityApiError && error.status === 404) return true;
    throw error;
  }
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
    ...(params.sku ? { sku: params.sku } : {}),
  });
  return products.map(normalizeProductMedia);
}

async function getProductVariations(
  productId: string | number,
  params: { page?: number; per_page?: number } = {},
) {
  return wcFetch<WooCommerceProductVariation[]>(
    `/products/${encodeURIComponent(String(productId))}/variations`,
    {
      per_page: String(params.per_page ?? 100),
      page: String(params.page ?? 1),
    },
  );
}

async function getProductVariation(productId: string | number, variationId: string | number) {
  return wcFetch<WooCommerceProductVariation>(
    `/products/${encodeURIComponent(String(productId))}/variations/${encodeURIComponent(String(variationId))}`,
  );
}

/** Additive write capability used by the guarded bulk-import service. */
async function createProductVariation(
  productId: string | number,
  payload: WooCommerceProductVariationWritePayload,
) {
  return wcFetch<WooCommerceProductVariation>(
    `/products/${encodeURIComponent(String(productId))}/variations`,
    undefined,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

async function updateProductVariation(productId: string | number, variationId: string | number, payload: WooCommerceProductVariationWritePayload) {
  return wcFetch<WooCommerceProductVariation>(`/products/${encodeURIComponent(String(productId))}/variations/${encodeURIComponent(String(variationId))}`, undefined, { method: "PUT", body: JSON.stringify(payload) });
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

  const method = (init?.method ?? "GET").toUpperCase();
  const maxAttempts = method === "GET" ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await requestWooCommerceJson<T>(url, {
        method,
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
        const payload = response.data as { code?: string; message?: string } | null;
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const duplicate = payload?.code === "woocommerce_rest_coupon_code_already_exists";
          throw createApiError("BAD_REQUEST", duplicate ? "Kode promo sudah terdaftar di WooCommerce. Gunakan kode lain atau edit promo yang sudah ada." : payload?.message?.slice(0, 240) || "Data ditolak oleh WooCommerce.", response.status, { wooCode: payload?.code ?? "unknown", operation: operationName(method, path) });
        }
        throw new WooProviderFailure(`WooCommerce responded ${response.status}`, response.status, payload?.code ?? `HTTP_${response.status}`);
      }
      return response.data;
    } catch (error) {
      if (error instanceof SecurityApiError) throw error;
      const diagnostics = providerDiagnostics(error);
      const transient = isTransientWooCommerceFailure(diagnostics.statusCode, diagnostics.errorCode);
      console.warn("WOOCOMMERCE_PROVIDER_ERROR", {
        operation: operationName(method, path), method, path,
        statusCode: diagnostics.statusCode, errorCode: diagnostics.errorCode,
        errorName: diagnostics.errorName, elapsedMs: Date.now() - startedAt,
        attemptNumber: attempt,
      });
      if (transient && method === "GET" && attempt < maxAttempts) {
        await delay(attempt === 1 ? 500 : 1_500);
        continue;
      }
      logAuditEvent({ action: "woocommerce_request_failed", entityType: "woocommerce", metadata: { operation: operationName(method, path), method, path, statusCode: diagnostics.statusCode, errorCode: diagnostics.errorCode, errorName: diagnostics.errorName, attemptNumber: attempt } });
      throw createApiError("PROVIDER_UNAVAILABLE", "WooCommerce sedang tidak tersedia.", 503, { operation: operationName(method, path), method, path, statusCode: diagnostics.statusCode, errorCode: diagnostics.errorCode, errorName: diagnostics.errorName, transient, attempts: attempt });
    }
  }
  throw createApiError("PROVIDER_UNAVAILABLE", "WooCommerce sedang tidak tersedia.", 503);
}

class WooProviderFailure extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly errorCode: string) { super(message); this.name = "WooProviderFailure"; }
}
const TRANSIENT_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ECONNABORTED", "INVALID_RESPONSE", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT"]);
function providerDiagnostics(error: unknown) {
  const value = error as { code?: unknown; statusCode?: unknown; name?: unknown; cause?: { code?: unknown } };
  return { statusCode: Number(value?.statusCode) || 0, errorCode: String(value?.code ?? value?.cause?.code ?? (error instanceof WooProviderFailure ? error.errorCode : "UNKNOWN_PROVIDER_ERROR")), errorName: String(value?.name ?? "Error") };
}
export function isTransientWooCommerceFailure(statusCode: number, errorCode: string) { return TRANSIENT_CODES.has(errorCode) || [429, 502, 503, 504].includes(statusCode); }
export function isTransientWooCommerceError(error: unknown) { return error instanceof SecurityApiError && error.code === "PROVIDER_UNAVAILABLE" && error.metadata.transient === true; }
function operationName(method: string, path: string) { return `${method} ${path.replace(/\/\d+(?=\/|$)/g, "/:id")}`; }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function normalizeBaseUrl(value: string) {
  const trimmed = value.replace(/\/$/, "");
  if (trimmed.endsWith("/wp-json/wc/v3")) return trimmed;
  return `${trimmed}/wp-json/wc/v3`;
}

async function createAttributeTerm(
  id: string | number,
  input: { name: string; slug?: string; description?: string },
) {
  return wcFetch<WooCommerceAttributeTerm>(
    `/products/attributes/${encodeURIComponent(String(id))}/terms`,
    undefined,
    { method: "POST", body: JSON.stringify(input) },
  );
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
      // URL absolut loopback tidak bisa diambil browser perangkat LAN lain —
      // dialihkan ke proxy same-origin (no-op untuk base media publik).
      src: toProxiedWordPressMediaUrl(image.src, mediaBaseUrl),
    })),
  };
}
