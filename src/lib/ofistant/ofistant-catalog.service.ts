import "server-only";
import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { woocommerceProductRepository } from "@/features/products/repositories/woocommerce-product.repository";
import { mockProductRepository } from "@/features/products/repositories/mock-product.repository";
import { createApiError } from "@/lib/security/safe-error-response";

/** Factual assistant answers must not silently substitute mock catalogue data. */
export async function getVerifiedOfistantProducts() {
  const config = getCommerceRuntimeConfig();
  if (config.productSource === "woocommerce") return woocommerceProductRepository.getPublishedProducts();
  if (config.requestedProductSource === "woocommerce" || process.env.NODE_ENV === "production")
    throw createApiError("PROVIDER_UNAVAILABLE", "Katalog belum dapat diperiksa. Silakan coba lagi.", 503);
  return mockProductRepository.getPublishedProducts();
}
