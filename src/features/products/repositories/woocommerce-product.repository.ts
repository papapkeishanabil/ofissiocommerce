import "server-only";

import { logAuditEvent } from "@/lib/security/audit-log";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";

import { mapWooCommerceProductToOfissioProduct } from "../product.mapper";
import type { OfissioProduct } from "../product.types";
import {
  validateRawWooCommerceProductForOfissio,
  validateWooCommerceProductForOfissio,
} from "../woocommerce/woocommerce-product.validation";
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
  const slug = normalizeIndustrySlug(industry);
  return (await getPublishedProducts()).filter((product) =>
    product.industrySlugs?.includes(slug) ||
    product.industries.some((item) => normalizeIndustrySlug(item) === slug),
  );
}

async function getProductsByCategory(category: string) {
  const slug = slugifyTaxonomy(category);
  return (await getPublishedProducts()).filter(
    (product) =>
      product.categorySlugs?.includes(slug) ||
      slugifyTaxonomy(product.category) === slug,
  );
}

async function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  return (await getPublishedProducts()).filter((product) =>
    [
      product.name,
      product.sku,
      product.category,
      ...product.industries,
      ...(product.searchableTerms ?? []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

function mapAndFilter(products: WooCommerceProduct[]) {
  const valid: OfissioProduct[] = [];
  for (const raw of products) {
    const rawValidation = validateRawWooCommerceProductForOfissio(raw);
    if (!rawValidation.ok) {
      logAuditEvent({
        action: "woocommerce_product_invalid",
        entityType: "product",
        entityId: String(raw.id),
        metadata: {
          sku: raw.sku,
          slug: raw.slug,
          reason: rawValidation.reason,
        },
      });
      continue;
    }
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
