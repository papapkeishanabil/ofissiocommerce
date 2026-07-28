import "server-only";

import { logAuditEvent } from "@/lib/security/audit-log";

import { mapWooCommerceProductToOfissioProduct } from "../product.mapper";
import type { OfissioProduct } from "../product.types";
import { validateWooCommerceProductForOfissio } from "../woocommerce/woocommerce-product.validation";
import { woocommerceClient } from "../woocommerce/woocommerce.client";
import type { WooCommerceProduct } from "../woocommerce/woocommerce.types";

export const woocommerceProductRepository = {
  getPublishedProducts,
  getProductById,
  getProductBySlug,
  getProductsByIndustry,
  getProductsByCategory,
  searchProducts,
};

async function getPublishedProducts() {
  const products = await woocommerceClient.getProducts({
    status: "publish",
    per_page: 100,
  });
  return mapAndFilter(products);
}

async function getProductById(id: string) {
  const sourceId = id.replace(/^wc-/, "");
  const product = await woocommerceClient.getProductById(sourceId);
  return mapAndFilter([product])[0];
}

async function getProductBySlug(slug: string) {
  const product = await woocommerceClient.getProductBySlug(slug);
  return product ? mapAndFilter([product])[0] : undefined;
}

async function getProductsByIndustry(industry: string) {
  return (await getPublishedProducts()).filter((product) =>
    product.industries.includes(industry as never),
  );
}

async function getProductsByCategory(category: string) {
  return (await getPublishedProducts()).filter(
    (product) => product.category === category,
  );
}

async function searchProducts(query: string) {
  const remoteProducts = await woocommerceClient.getProducts({
    status: "publish",
    search: query,
    per_page: 100,
  });
  const q = query.trim().toLowerCase();
  return mapAndFilter(remoteProducts).filter((product) =>
    [product.name, product.sku, product.category, ...product.industries]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

function mapAndFilter(products: WooCommerceProduct[]) {
  const valid: OfissioProduct[] = [];
  for (const raw of products) {
    const product = mapWooCommerceProductToOfissioProduct(raw);
    const validation = validateWooCommerceProductForOfissio(product);
    if (!validation.ok) {
      logAuditEvent({
        action: "woocommerce_product_invalid",
        entityType: "product",
        entityId: String(raw.id),
        metadata: {
          sku: raw.sku,
          slug: raw.slug,
          reason: validation.reason,
        },
      });
      continue;
    }
    valid.push(product);
  }
  return valid;
}
