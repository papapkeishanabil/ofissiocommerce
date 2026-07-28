import "server-only";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { logAuditEvent } from "@/lib/security/audit-log";

import { mockProductRepository } from "./repositories/mock-product.repository";
import { woocommerceProductRepository } from "./repositories/woocommerce-product.repository";
import type { OfissioProduct } from "./product.types";
import {
  validateProduct3DModel,
  validateProductForCart,
  validateProductForCatalog,
} from "./product.validation";

function visible(products: OfissioProduct[]) {
  return products.filter((product) => validateProductForCatalog(product).ok);
}

async function fromActiveSource<T>(
  readWooCommerce: () => Promise<T>,
  readMock: () => T,
): Promise<T> {
  const config = getCommerceRuntimeConfig();
  if (config.productSource !== "woocommerce") return readMock();

  try {
    return await readWooCommerce();
  } catch (error) {
    logAuditEvent({
      action: "woocommerce_product_source_fallback",
      entityType: "product",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
    return readMock();
  }
}

export const productServerService = {
  async getPublishedProducts() {
    return fromActiveSource(
      async () => woocommerceProductRepository.getPublishedProducts(),
      () => visible(mockProductRepository.getPublishedProducts()),
    );
  },

  async getProductsWith3DModel() {
    return this.getPublishedProducts();
  },

  async getProductById(id: string) {
    return fromActiveSource(
      async () => {
        const product = await woocommerceProductRepository.getProductById(id);
        if (product) return product;
        return mockProductRepository.getProductById(id);
      },
      () => mockProductRepository.getProductById(id),
    );
  },

  async getProductBySlug(slug: string) {
    return fromActiveSource(
      async () => {
        const product = await woocommerceProductRepository.getProductBySlug(slug);
        if (product && validateProductForCatalog(product).ok) return product;
        return undefined;
      },
      () => {
        const product = mockProductRepository.getProductBySlug(slug);
        return product && validateProductForCatalog(product).ok
          ? product
          : undefined;
      },
    );
  },

  async getProductsByIndustry(industry: string) {
    return fromActiveSource(
      async () => woocommerceProductRepository.getProductsByIndustry(industry),
      () =>
        visible(mockProductRepository.getProductsByIndustry(industry)),
    );
  },

  async getProductsByCategory(category: string) {
    return fromActiveSource(
      async () => woocommerceProductRepository.getProductsByCategory(category),
      () =>
        visible(mockProductRepository.getProductsByCategory(category)),
    );
  },

  async getRecommendedProducts(industry?: string) {
    return industry
      ? this.getProductsByIndustry(industry)
      : this.getPublishedProducts();
  },

  async searchProducts(query: string) {
    return fromActiveSource(
      async () => woocommerceProductRepository.searchProducts(query),
      () => visible(mockProductRepository.searchProducts(query)),
    );
  },

  validateProductForCart,
  validateProductForCatalog,
  validateProduct3DModel,
};
