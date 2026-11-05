import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { broadCatalogScope, matchStorefrontCatalogProducts, matchesCatalogTextQuery } from "../src/features/catalog-taxonomy/catalog-broad-search";
import { normalizeCatalogSearch } from "../src/features/catalog-taxonomy/catalog-search";
import type { PublicCatalogTaxonomy } from "../src/features/catalog-taxonomy/catalog-taxonomy.types";

const base = PRODUCT_MOCK_DATA[0];assert.ok(base);
const products = [
  { ...base, id: "plain", sku: "POL-001", name: "Kemeja Polos", category: "Kemeja Kerja Polos", categorySlugs: ["kemeja-kerja-polos"], categories: [] },
  { ...base, id: "combo", sku: "KOM-001", name: "Kemeja Kombinasi", category: "Kemeja Kerja Kombinasi", categorySlugs: ["kemeja-kerja-kombinasi"], categories: [] },
  { ...base, id: "safety", sku: "KS-003", name: "Kemeja Safety", category: "Kemeja Safety", categorySlugs: ["kemeja-safety"], categories: [] },
  { ...base, id: "jacket", sku: "JKT-001", name: "Jaket Kantor", category: "Jaket", categorySlugs: ["jaket"], categories: [] },
  { ...base, id: "hat", sku: "TOP-001", name: "Topi Tim", category: "Topi", categorySlugs: ["topi"], categories: [] },
];
const taxonomy: PublicCatalogTaxonomy = { categories: [
  { name: "Kemeja Kerja Polos", slug: "kemeja-kerja-polos", synonyms: ["kemeja", "kemeja kerja"] },
  { name: "Kemeja Kerja Kombinasi", slug: "kemeja-kerja-kombinasi", synonyms: ["kemeja kombinasi"] },
  { name: "Kemeja Safety", slug: "kemeja-safety", synonyms: ["kemeja safety"] },
], industries: [], attributes: [] };
const search = (query: string) => matchStorefrontCatalogProducts(products, query, normalizeCatalogSearch(query, taxonomy), taxonomy).map(p => p.id);
for (const query of ["kemeja kerja", " KEMEJA  KERJA ", "kemeja", "workshirt"]) {
  assert.deepEqual(search(query), ["plain", "combo", "safety"], query);
}
for (const query of ["seragam kerja", "pakaian kerja", "baju kerja", "workwear"]) {
  assert.deepEqual(search(query), ["plain", "combo", "safety", "jacket"], query);
}
assert.deepEqual(search("kemeja safety"), ["safety"]);
assert.deepEqual(search("kemeja kombinasi"), ["combo"]);
assert.deepEqual(search("KS-003"), ["safety"]);
assert.deepEqual(products.filter(p => matchesCatalogTextQuery(p, "pakaian kerja")).map(p => p.id), ["plain", "combo", "safety", "jacket"]);
assert.deepEqual(products.filter(p => matchesCatalogTextQuery(p, "kemeja kerja")).map(p => p.id), ["plain", "combo", "safety"]);
assert.deepEqual(products.filter(p => matchesCatalogTextQuery(p, "KS-003")).map(p => p.id), ["safety"]);
for (const query of ["kemeja kerja merah", "kemeja kerja wanita", "seragam kerja tambang", "kemeja KT-001", "kemeja kerja polos"]) {
  assert.equal(broadCatalogScope(query), null, query);
}
console.log("PASS: generic shirt/workwear queries include relevant groups; specific categories, modifiers and SKUs keep existing matching");
