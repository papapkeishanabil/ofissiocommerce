import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { DEFAULT_PUBLIC_TAXONOMY } from "../src/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { normalizeCatalogSearch } from "../src/features/catalog-taxonomy/catalog-search";
import { matchCatalogProducts } from "../src/features/catalog-taxonomy/catalog-product-match";

const base = PRODUCT_MOCK_DATA[0];
const category = normalizeCatalogSearch("kemeja").categorySlugs[0];
const products = ["panjang", "pendek"].map(sleeve => ({
  ...base, id: sleeve, name: `Kemeja Kantor ${sleeve === "panjang" ? "AA" : "BB"}`, sku: sleeve,
  categorySlugs: [category],
  attributes: [{ id: null, name: "Lengan", slug: "lengan", options: [sleeve], visible: true, variation: true }],
}));
for (const sleeve of ["panjang", "pendek"]) {
  const query = `ada kemeja lengan ${sleeve}?`;
  assert.deepEqual(matchCatalogProducts(products, query, normalizeCatalogSearch(query), DEFAULT_PUBLIC_TAXONOMY).map(p => p.id), [sleeve]);
}
const query = "kemeja lengan panjang unicorn";
assert.deepEqual(matchCatalogProducts(products, query, normalizeCatalogSearch(query), DEFAULT_PUBLIC_TAXONOMY), []);
console.log("PASS: sleeve attributes find products without sleeve words in titles; opposite sleeves and unknown constraints remain excluded");
