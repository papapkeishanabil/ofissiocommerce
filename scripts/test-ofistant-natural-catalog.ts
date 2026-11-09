import assert from "node:assert/strict";
import { normalizeCatalogSearch } from "../src/features/catalog-taxonomy/catalog-search";
import { matchCatalogProducts } from "../src/features/catalog-taxonomy/catalog-product-match";
import { DEFAULT_PUBLIC_TAXONOMY } from "../src/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { respond } from "../src/lib/ofistant/ofistant.service";
import { emptyContext } from "../src/lib/ofistant/ofistant.types";
import type { CatalogSearchResult } from "../src/features/catalog-taxonomy/catalog-taxonomy.types";

const query = "ada kemeja lengan panjang?";
const normalization = normalizeCatalogSearch(query);
const base = PRODUCT_MOCK_DATA[0]; assert.ok(base);
const products = ["Kemeja Kantor", "Kemeja Lapangan", "Jaket"].map((name, i) => ({...base, id: String(i), name, category: name, categorySlugs: [`category-${i}`], attributes: [{ id: null, name: "Tipe Lengan", slug: "tipe-lengan", options: ["long"], visible: true, variation: false }]}));
assert.deepEqual(matchCatalogProducts(products, query, normalization, DEFAULT_PUBLIC_TAXONOMY).map(p => p.id), ["0", "1"]);
const result: CatalogSearchResult = {normalization, resultCount: 2, products: [
  {id: "0", name: "Kemeja Kantor", slug: "kemeja-kantor", sku: "AA", category: "Kemeja", industries: [], regularPrice: 100000, totalSales: 1, globalEmbroideryPricing: {enabled: false, mode: "flat_per_piece", zones: []}, supportedEmbroideryZones: []},
  {id: "1", name: "Kemeja Lapangan", slug: "kemeja-lapangan", sku: "BB", category: "Kemeja", industries: [], regularPrice: 100000, totalSales: 20, globalEmbroideryPricing: {enabled: false, mode: "flat_per_piece", zones: []}, supportedEmbroideryZones: []},
], alternatives: {categories: [], industries: []}};
function reply(r: CatalogSearchResult) { return respond({text: query, ctx: emptyContext(), cart: {itemCount: 0,totalQty: 0,totalEstimatedPrice: 0},catalogSearchResult:r}); }
const answer = reply(result);
assert.match(answer.message, /Ada, Bapak\/Ibu/);
assert.match(answer.message, /kemeja lengan panjang terlaris/);
assert.match(answer.message, /filter/);
assert.doesNotMatch(answer.message, /polos|pria|wanita/);
assert.equal(answer.products?.[0]?.id, "1");
assert.ok(!new URL(answer.moreProductsHref!, "https://ofissio.com").searchParams.has("kategori"));
assert.doesNotMatch(reply({...result, products: result.products.map(p => ({...p,totalSales:0}))}).message, /terlaris/);
assert.doesNotMatch(reply({...result,resultCount:0,products:[]}).message, /^Ada/);
console.log("PASS: direct natural answer, verified bestseller, cross-category shirts, filters retain request, no invented sales or availability");
