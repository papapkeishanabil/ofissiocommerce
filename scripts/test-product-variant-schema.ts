import assert from "node:assert/strict";
import type { OfissioProduct } from "../src/features/products/product.types";
import { variantProductGroup } from "../src/lib/product-variant-schema";
import { linkedProductVariant, linkedVariantSizes } from "../src/features/products/product-variant-links";
import { selectedVariantPrice } from "../src/features/products/product-variants";
import { productStructuredData } from "../src/lib/seo";
import { liveVariantAvailability } from "../src/features/products/product-schema-offer";
import type { WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const product = {
  source: "woocommerce", status: "published", productKind: "variable", stockVariantsReady: true,
  transaction_mode: "HYBRID", moq: 1, sku: "KK-013", slug: "kemeja-kerja-kk-013", name: "Kemeja Kerja KK-013", description: "Kemeja kerja",
  variantOptions: [{ name: "Lengan", values: ["Pendek", "Panjang"] }, { name: "Warna", values: ["Putih"] }, { name: "Ukuran", values: ["S", "XXL"] }],
  productVariants: [
    { id: 1, sku: "KK-013LPD-S", regularPrice: 120000, imageSrc: "", options: { Lengan: "Pendek", Warna: "Putih", Ukuran: "S" } },
    { id: 2, sku: "KK-013LPJ-XXL", regularPrice: 130000, imageSrc: "", options: { Lengan: "Panjang", Warna: "Putih", Ukuran: "XXL" } },
  ],
} as unknown as OfissioProduct;
const url = "https://ofissio.com/product/kemeja-kerja-kk-013";
const group = variantProductGroup(product, url, ["https://ofissio.com/shirt.webp"])!;
assert.equal(group["@type"], "ProductGroup");
assert.equal(group.hasVariant.length, 2);
assert.deepEqual(group.hasVariant.map(v => v.offers.price), [120000, 130000]);
assert.equal(group.hasVariant[1]!.offers.url, `${url}?variant=KK-013LPJ-XXL`);
assert.equal(group.hasVariant[1]!.isVariantOf["@id"], group["@id"]);
assert(!("availability" in group.hasVariant[0]!.offers), "Do not infer inventory for individual SKUs");
const native = [{ id: 1, status: "publish", stock_status: "instock" }, { id: 2, status: "publish", stock_status: "outofstock" }, { id: 3, status: "publish", stock_status: "onbackorder" }, { id: 4, status: "publish" }, { id: 5, status: "private", stock_status: "instock" }] as WooCommerceProductVariation[];
const statuses = liveVariantAvailability(native);
assert.deepEqual(statuses, { "1": "InStock", "2": "OutOfStock", "3": "BackOrder" });
const stocked = variantProductGroup({ ...product, liveVariantAvailability: statuses }, url, [])!;
assert.equal(stocked.hasVariant[0]!.offers.availability, "https://schema.org/InStock");
assert.equal(stocked.hasVariant[1]!.offers.availability, "https://schema.org/OutOfStock");
assert.equal(variantProductGroup({ ...product, liveVariantAvailability: { "2": "BackOrder" } }, url, [])!.hasVariant[1]!.offers.availability, "https://schema.org/BackOrder");
assert.equal(productStructuredData(product)!["@graph"][0]!["@type"], "ProductGroup");
const selected = linkedProductVariant(product, "KK-013LPJ-XXL")!;
assert.deepEqual(linkedVariantSizes(product, selected.sku), { "2XL": 1 });
assert.equal(selectedVariantPrice(product, selected.options, linkedVariantSizes(product, selected.sku)), group.hasVariant[1]!.offers.price);
assert.equal(linkedProductVariant(product, "unknown"), undefined);
assert.deepEqual(linkedVariantSizes(product, "unknown"), {});
for (const patch of [{ source: "mock" }, { stockVariantsReady: false }, { transaction_mode: "REQUEST_QUOTATION" }, { moq: 8 }, { quantityPricing: { enabled: true } }, { productVariants: [product.productVariants![0], product.productVariants![0]] }]) {
  assert.equal(variantProductGroup({ ...product, ...patch } as OfissioProduct, url, []), undefined);
}
console.log("PASS: per-SKU offers, direct variant selection, matching checkout prices, unknown SKU fallback, inventory and eligibility guards");
