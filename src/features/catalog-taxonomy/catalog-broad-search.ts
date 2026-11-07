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
  if (scope) return products.filter(product => matchesBroadCatalogScope(product, scope));
  const qualified = industryQualifiedScope(normalization, taxonomy);
  return qualified
    ? matchCatalogProducts(products.filter(product => matchesBroadCatalogScope(product, qualified)), query, {...normalization,categorySlugs:[]}, taxonomy)
    : matchCatalogProducts(products, query, normalization, taxonomy);
}

/** Generic garment + actual industry must not inherit one category's generic synonym. */
function industryQualifiedScope(search: CatalogSearchNormalization, taxonomy: PublicCatalogTaxonomy): "shirts" | "workwear" | null {
  if (!search.industrySlugs.length) return null;
  const generic = new Set(["kemeja","kemeja kerja","workshirt","work shirt","baju","seragam","pakaian","baju kerja","seragam kerja","pakaian kerja","workwear"]);
  const phrase = (value:string) => slugifyTaxonomy(value).replace(/-/g," ");
  const query=` ${phrase(search.normalizedQuery)} `;
  // An explicit category such as kemeja lapangan or safety remains a constraint.
  if(taxonomy.categories.some(category => [category.name,category.slug,...category.synonyms].map(phrase)
    .some(alias => alias && !generic.has(alias) && query.includes(` ${alias} `)))) return null;
  let remaining=query;
  const aliases=taxonomy.industries.filter(industry=>search.industrySlugs.includes(industry.slug))
    .flatMap(industry=>[industry.name,industry.slug,...industry.synonyms]).map(phrase).filter(Boolean).sort((a,b)=>b.length-a.length);
  for(const alias of aliases) while(remaining.includes(` ${alias} `)) remaining=remaining.replace(` ${alias} `," ");
  for(const hint of search.attributeHints){
    const attribute=taxonomy.attributes.find(item=>item.slug===hint.attributeSlug);
    const term=attribute?.terms.find(item=>item.slug===hint.termSlug);
    for(const alias of [term?.name,term?.slug,attribute?.name,attribute?.slug].filter((value):value is string=>Boolean(value)).map(phrase))
      while(remaining.includes(` ${alias} `)) remaining=remaining.replace(` ${alias} `," ");
  }
  remaining=remaining.trim().replace(/\s+/g," ");
  if(!generic.has(remaining)) return null;
  return ["kemeja","kemeja kerja","workshirt","work shirt"].includes(remaining)?"shirts":"workwear";
}
