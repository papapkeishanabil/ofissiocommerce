import type { OfissioProduct } from "@/features/products/product.types";
import { normalizeIndustrySlug, slugifyTaxonomy } from "./catalog-taxonomy.defaults";
import type { CatalogSearchNormalization, PublicCatalogTaxonomy } from "./catalog-taxonomy.types";
import { resolveProductReferences } from "./catalog-product-reference";

export function matchCatalogProducts(products: OfissioProduct[], query: string, normalization: CatalogSearchNormalization, publicTaxonomy: PublicCatalogTaxonomy) {
  const activeCategorySlugs = new Set(
    publicTaxonomy.categories.map((category) => category.slug),
  );
  const matchesAttributes = (product: OfissioProduct) => normalization.attributeHints.every((hint) =>
    (product.attributes ?? []).some((attribute) => attribute.slug === hint.attributeSlug &&
      attribute.options.some((option) => slugifyTaxonomy(option) === hint.termSlug)));

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
    // Aliases are ordered by specificity. Match the same primary category as
    // Ofistant navigation instead of requiring overlapping broad categories.
    const matchesCategory = normalization.categorySlugs.slice(0, 1).every((slug) => {
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
  // the full multi-word name appears as a substring) is always surfaced, even
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
  // Conversation words (e.g. "misal", "ongkirnya") must not hide an exact
  // article code. Keep explicit attribute constraints such as colour intact.
  const codeMatched = resolveProductReferences(products, query).filter(matchesAttributes);
  const merged = [...filtered, ...nameMatched, ...codeMatched].filter((product) =>
    seenIds.has(product.id) ? false : (seenIds.add(product.id), true),
  );

  return merged;
}
