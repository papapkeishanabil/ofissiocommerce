import assert from "node:assert/strict";
import { repositoryRegistry } from "../src/features/repositories/repository.factory";
import type { PaymentOrderRecord } from "../src/features/payment/payment.types";
import { productServerService } from "../src/features/products/product.server-service";
import { mockProductRepository } from "../src/features/products/repositories/mock-product.repository";
import { searchCatalogProducts } from "../src/features/catalog-taxonomy/catalog-product-search.service";
import { matchCatalogProducts } from "../src/features/catalog-taxonomy/catalog-product-match";
import { normalizeCatalogSearch } from "../src/features/catalog-taxonomy/catalog-search";
import { DEFAULT_PUBLIC_TAXONOMY } from "../src/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import type { WooCommerceProduct } from "../src/features/products/woocommerce/woocommerce.types";

async function main() {
  process.env.DATABASE_PROVIDER = "mock";
  process.env.PRODUCT_SOURCE = "mock";
  const raw = { id: 999, name: "Fixture Jacket", slug: "fixture-jacket", sku: "J-999", status: "publish", description: "", short_description: "", price: "100000", regular_price: "100000", sale_price: "", total_sales: 42 } satisfies WooCommerceProduct;
  assert.equal(mapWooCommerceProductToOfissioProduct(raw).totalSales, 42);
  assert.equal(mapWooCommerceProductToOfissioProduct({ ...raw, total_sales: -1 }).totalSales, undefined);
  assert.equal(mapWooCommerceProductToOfissioProduct({ ...raw, total_sales: 0 }).totalSales, 0);
  const template = mockProductRepository.getPublishedProducts()[0]!;
  const overlappingTaxonomy = {
    ...DEFAULT_PUBLIC_TAXONOMY,
    categories: [
      { name: "Kemeja Kerja Kombinasi", slug: "kombinasi", synonyms: [] },
      { name: "Kemeja Kantor", slug: "kantor", synonyms: ["kemeja kerja"] },
      { name: "Kemeja", slug: "kemeja", synonyms: [] },
    ],
  };
  const combination = { ...template, id: "combination", name: "Combination Shirt", category: "Kemeja Kerja Kombinasi", categorySlugs: ["kombinasi"], industries: [], industrySlugs: [], attributes: [], searchableTerms: [] };
  const overlapQuery = "saya mencari kemeja kerja kombinasi";
  const overlap = normalizeCatalogSearch(overlapQuery, overlappingTaxonomy);
  assert.equal(overlap.categorySlugs.length, 3);
  assert.deepEqual(matchCatalogProducts([combination], overlapQuery, overlap, overlappingTaxonomy).map(product => product.id), ["combination"]);
  const jackets = Array.from({ length: 15 }, (_, index) => ({ ...template, id: `j-${index}`, name: `Jaket Test ${index}`, sku: `J-${index}`, category: "Jaket", categorySlugs: ["jaket"], industries: [], industrySlugs: [], attributes: [], searchableTerms: [], totalSales: index === 14 ? 500 : index, material: "Camel", colors: ["Camel"] }));
  const unrelated = { ...jackets[0]!, id: "shirt", name: "Kemeja Test", category: "Kemeja", categorySlugs: ["kemeja"], totalSales: 99999 };
  const original = productServerService.getPublishedProducts;
  const originalOrders = repositoryRegistry.orders.listAll;
  repositoryRegistry.orders.listAll = async () => [{
    id: "paid-ranking", status: "payment_received", createdAt: "2026-11-07T00:00:00Z",
    items: [{ productId: "j-14", productName: "Jaket Test 14", sku: "J-14", source: "woocommerce", totalQty: 500, productSubtotal: 1000 }],
  } as PaymentOrderRecord];
  productServerService.getPublishedProducts = async () => [...jackets, unrelated];
  try {
    const result = await searchCatalogProducts("saya mencari jaket");
    assert.equal(result.resultCount, 15);
    assert.equal(result.products[0]?.id, "j-14", "Rank the entire matching set before the 12-result limit");
    assert.equal(result.products[0]?.totalSales, 500);
    assert.ok(!result.products.some(product => product.id === "shirt"));
  } finally {
    productServerService.getPublishedProducts = original;
    repositoryRegistry.orders.listAll = originalOrders;
  }
  const query = "saya mencari jaket J-14";
  const matches = matchCatalogProducts([...jackets, unrelated], query, normalizeCatalogSearch(query), DEFAULT_PUBLIC_TAXONOMY);
  assert.deepEqual(matches.map(product => product.id), ["j-14"]);
  console.log("PASS bestseller: real sales mapping, ranking before truncation, matching-category scope and preserved query constraints.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
