import "server-only";

import { productServerService } from "@/features/products/product.server-service";

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
  const [products, publicTaxonomy] = await Promise.all([
    productServerService.getPublishedProducts(),
    getPublicCatalogTaxonomy(),
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

  return {
    normalization,
    resultCount: filtered.length,
    products: filtered.slice(0, 12).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      category: product.category,
      industries: product.industries,
      regularPrice: product.priceFrom,
      quantityPricing: product.quantityPricing,
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
