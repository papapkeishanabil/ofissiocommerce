import type { OfissioProduct } from "@/features/products/product.types";
import { slugifyTaxonomy } from "./catalog-taxonomy.defaults";
import { matchCatalogProducts } from "./catalog-product-match";
import type { CatalogSearchNormalization, PublicCatalogTaxonomy } from "./catalog-taxonomy.types";

/** Only unqualified phrases are broad: colours, industries and SKUs keep normal matching. */
export function broadCatalogScope(query: string): "shirts" | "workwear" | null {
  const phrase = slugifyTaxonomy(query);
  if (["kemeja", "kemeja-kerja", "workshirt", "work-shirt"].includes(phrase)) return "shirts";
  if (["seragam-kerja", "pakaian-kerja", "baju-kerja", "workwear"].includes(phrase)) return "workwear";
  return null;
}

export function matchesBroadCatalogScope(product: OfissioProduct, scope: "shirts" | "workwear"): boolean {
  const terms = [product.name, product.category, ...(product.categorySlugs ?? []),
    ...(product.categories ?? []).flatMap(category => [category.name, category.slug])]
    .map(slugifyTaxonomy).join("-");
  return scope === "shirts"
    ? /(?:^|-)(?:kemeja|work-?shirt)(?:-|$)/.test(terms)
    : /(?:^|-)(?:kemeja|seragam|pakaian|baju|jaket|jacket|rompi|vest|wearpack|coverall|polo|celana|overall|workwear|work-?shirt)(?:-|$)/.test(terms);
}

export function matchesCatalogTextQuery(product: OfissioProduct, query: string): boolean {
  const scope = broadCatalogScope(query);
  return scope ? matchesBroadCatalogScope(product, scope)
    : [product.name, product.sku, product.category, ...(product.searchableTerms ?? [])]
      .join(" ").toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"));
}

/** Storefront-only expansion; Ofistant's specific-category routing remains unchanged. */
export function matchStorefrontCatalogProducts(products: OfissioProduct[], query: string, normalization: CatalogSearchNormalization, taxonomy: PublicCatalogTaxonomy) {
  const scope = broadCatalogScope(query);
  return scope ? products.filter(product => matchesBroadCatalogScope(product, scope))
    : matchCatalogProducts(products, query, normalization, taxonomy);
}
