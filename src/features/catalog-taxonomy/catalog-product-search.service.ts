import "server-only";

import { productServerService } from "@/features/products/product.server-service";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { normalizeEmbroideryZoneId, type EmbroideryPricingZoneId } from "@/features/products/embroidery-pricing";

import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
  withCatalogSearchVocabulary,
} from "./catalog-taxonomy.defaults";
import { normalizeCatalogSearch } from "./catalog-search";
import { getPublicCatalogTaxonomy } from "./catalog-taxonomy.service";
import type { CatalogSearchResult } from "./catalog-taxonomy.types";

export async function searchCatalogProducts(
  query: string,
): Promise<CatalogSearchResult> {
  const [products, publicTaxonomy, globalPricingState] = await Promise.all([
    productServerService.getPublishedProducts(),
    getPublicCatalogTaxonomy(),
    getGlobalEmbroideryPricing(),
  ]);
  const searchTaxonomy = withCatalogSearchVocabulary(publicTaxonomy);
  const normalization = normalizeCatalogSearch(query, searchTaxonomy);
  const activeCategorySlugs = new Set(
    publicTaxonomy.categories.map((category) => category.slug),
  );

  const filtered = products.filter((product) => {
    const haystack = [
      product.name,
      product.sku,
      product.category,
      ...product.industries,
      ...(product.searchableTerms ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const matchesCategory = normalization.categorySlugs.every((slug) => {
      if (activeCategorySlugs.has(slug)) {
        return (
          product.categorySlugs?.includes(slug) ||
          slugifyTaxonomy(product.category) === slug
        );
      }
      return slug.split("-").every((term) => haystack.includes(term));
    });
    const matchesIndustry =
      normalization.industrySlugs.length === 0 ||
      normalization.industrySlugs.some(
        (slug) =>
          product.industrySlugs?.includes(slug) ||
          product.industries.some(
            (industry) => normalizeIndustrySlug(industry) === slug,
          ),
      );
    const matchesAttributes =
      normalization.attributeHints.length === 0 ||
      normalization.attributeHints.every((hint) =>
        (product.attributes ?? []).some(
          (attribute) =>
            attribute.slug === hint.attributeSlug &&
            attribute.options.some(
              (option) => slugifyTaxonomy(option) === hint.termSlug,
            ),
        ),
      );
    const matchesTerms = normalization.searchTerms.every((term) =>
      haystack.includes(term),
    );
    return matchesCategory && matchesIndustry && matchesAttributes && matchesTerms;
  });

  // Guarantee: a product whose name the query cites verbatim (exact match, or
  // the full multi-word name appears as a substring) is always surfaced — even
  // when taxonomy tokenization extracts a category/industry the product isn't
  // tagged with (e.g. product names containing SKUs/parens like "KK-006"). This
  // makes "pick a product by name" flows (Ofistant estimate quick replies, and a
  // product name embedded in an estimate ask) resolve reliably. Conservative:
  // only specific (>=8 chars, >=2 tokens) names, so short names like "Kemeja"
  // never over-match unrelated queries.
  const queryLower = query.trim().toLowerCase();
  const nameMatched = products.filter((product) => {
    const name = product.name.trim().toLowerCase();
    if (name.length < 8) return false;
    if (name.split(/\s+/).filter(Boolean).length < 2) return false;
    return queryLower === name || queryLower.includes(name);
  });
  const seenIds = new Set<string>();
  const merged = [...filtered, ...nameMatched].filter((product) =>
    seenIds.has(product.id) ? false : (seenIds.add(product.id), true),
  );

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
