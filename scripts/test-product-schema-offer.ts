import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { uniformLiveOfferPrice, structuredOfferPrice } from "../src/features/products/product-schema-offer";
import { productStructuredData } from "../src/lib/seo";
import type { OfissioProduct } from "../src/features/products/product.types";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const raw: WooCommerceProduct = { id: 1170, name: "FRM", slug: "frm", sku: "FRM", status: "publish", type: "variable",
  description: "", short_description: "", price: "125000", regular_price: "", sale_price: "", purchasable: true };
const variation = (price: string, status = "publish"): WooCommerceProductVariation => ({ id: 1, sku: "FRM-S", status,
  price, regular_price: price, sale_price: "", attributes: [] });
assert.equal(uniformLiveOfferPrice(raw, [variation("125000"), variation("125000")]), 125000);
assert.equal(uniformLiveOfferPrice(raw, [variation("125000"), variation("150000")]), undefined);
assert.equal(uniformLiveOfferPrice(raw, [variation("125000"), variation("")]), undefined);
assert.equal(uniformLiveOfferPrice(raw, []), undefined);
assert.equal(uniformLiveOfferPrice(raw), undefined);
assert.equal(uniformLiveOfferPrice({ ...raw, purchasable: false }, [variation("125000")]), undefined);
assert.equal(uniformLiveOfferPrice({ ...raw, status: "draft" }, [variation("125000")]), undefined);
assert.equal(uniformLiveOfferPrice(raw, [variation("125000"), variation("999000", "private")]), 125000);
assert.equal(uniformLiveOfferPrice(raw, [{ ...variation("100000"), regular_price: "125000", sale_price: "100000" }]), undefined);
assert.equal(uniformLiveOfferPrice({ ...raw, type: "simple", regular_price: "125000" }), 125000);

const fixture = PRODUCT_MOCK_DATA[0];assert.ok(fixture);
const product: OfissioProduct = { ...fixture, source: "woocommerce", status: "published", transaction_mode: "HYBRID",
  moq: 1, priceFrom: 125000, liveOfferPrice: 125000, stockVariantsReady: true,
  quantityPricing: { enabled: true, mode: "fixed_unit_price", basis: "total_order_qty", tiers: [{ minQty: 1, maxQty: null, unitPrice: 125000, label: "1+" }] } };
assert.equal(structuredOfferPrice(product), 125000);
for (const changes of [{ source: "mock" as const }, { status: "draft" as const }, { transaction_mode: "REQUEST_QUOTATION" as const },
  { moq: 8 }, { priceFrom: 110000 }, { liveOfferPrice: undefined }, { liveOfferPrice: NaN }, { liveOfferPrice: -1 }, { stockVariantsReady: false }]) {
  assert.equal(structuredOfferPrice({ ...product, ...changes }), undefined);
}
assert.equal(structuredOfferPrice({ ...product, quantityPricing: { ...product.quantityPricing!, tiers: [{ minQty: 1, maxQty: null, unitPrice: 100000, label: "1+" }] } }), undefined);
const schema = productStructuredData(product)!;
const node = schema["@graph"][0]!;
assert.ok("offers" in node && node.offers);
assert.equal(node.offers["@type"], "Offer");
assert.equal(node.offers.price, 125000);
assert.equal(node.offers.priceCurrency, "IDR");
assert.ok(!("availability" in node.offers), "Stock status must not be guessed");
assert.ok(!("aggregateRating" in node), "Ratings must not be fabricated");
assert.equal(productStructuredData({ ...product, source: "mock" }), null);
console.log("PASS: live uniform-price evidence; missing/mixed/sale prices rejected; quotes, MOQ and tier mismatches excluded; Product Offer has required price/currency without invented stock or reviews.");
