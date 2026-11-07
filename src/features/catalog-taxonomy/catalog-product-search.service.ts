import "server-only";
import { getPaidProductSales } from "@/features/products/paid-product-sales.service";
import { getVerifiedOfistantProducts } from "@/lib/ofistant/ofistant-catalog.service";

import { productServerService } from "@/features/products/product.server-service";
import { getGlobalEmbroideryPricing, assertVerifiedEmbroideryState } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { normalizeEmbroideryZoneId, type EmbroideryPricingZoneId } from "@/features/products/embroidery-pricing";

import {
  withCatalogSearchVocabulary,
} from "./catalog-taxonomy.defaults";
import { matchCatalogProducts } from "./catalog-product-match";
import { normalizeCatalogSearch } from "./catalog-search";
import { getPublicCatalogTaxonomy } from "./catalog-taxonomy.service";
import type { CatalogSearchResult } from "./catalog-taxonomy.types";

export async function searchCatalogProducts(
  query: string,
  options: { requireVerified?: boolean } = {},
): Promise<CatalogSearchResult> {
  const [products, publicTaxonomy, globalPricingState, paidSales] = await Promise.all([
    options.requireVerified ? getVerifiedOfistantProducts() : productServerService.getPublishedProducts(),
    getPublicCatalogTaxonomy(),
    getGlobalEmbroideryPricing(),
    getPaidProductSales(),
  ]);
  const searchTaxonomy = withCatalogSearchVocabulary(publicTaxonomy);
  if (options.requireVerified) assertVerifiedEmbroideryState(globalPricingState);
  const normalization = normalizeCatalogSearch(query, searchTaxonomy);
  const salesByProduct = new Map(paidSales.map(row => [row.productId, row.qty]));
  const merged = matchCatalogProducts(products, query, normalization, publicTaxonomy)
    .map(product => ({ ...product, totalSales: salesByProduct.get(product.id) ?? 0 }))
    .sort((a, b) => (b.totalSales ?? -1) - (a.totalSales ?? -1));

  return {
    normalization,
    resultCount: merged.length,
    products: merged.slice(0, 12).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      category: product.category,
      industries: product.industries,
      regularPrice: product.priceFrom,
      totalSales: product.totalSales,
      mainImage: product.mainImage ?? product.images?.[0]?.src ?? null,
      material: product.material,
      quantityPricing: product.quantityPricing,
      globalEmbroideryPricing: globalPricingState.pricing,
      supportedEmbroideryZones: product.embroidery_zones
        .map(normalizeEmbroideryZoneId)
        .filter((zone): zone is EmbroideryPricingZoneId => zone != null),
    })),
    alternatives: {
      categories: publicTaxonomy.categories
        .filter(
          (item) => !normalization.categorySlugs.includes(item.slug),
        )
        .slice(0, 4)
        .map(({ name, slug }) => ({ name, slug })),
      industries: publicTaxonomy.industries
        .filter(
          (item) => !normalization.industrySlugs.includes(item.slug),
        )
        .slice(0, 4)
        .map(({ name, slug }) => ({ name, slug })),
    },
  };
}
