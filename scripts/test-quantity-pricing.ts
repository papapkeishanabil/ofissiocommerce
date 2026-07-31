import assert from "node:assert/strict";

import {
  calculateQuantityTierPrice,
  normalizeQuantityPricing,
  validateQuantityPricing,
  type QuantityPricing,
} from "../src/features/products/quantity-pricing";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import type { WooCommerceProduct } from "../src/features/products/woocommerce/woocommerce.types";
import { buildQuotationItems } from "../src/features/quotation/quotation.utils";
import type { ValidatedCheckoutCartItem } from "../src/features/checkout/checkout-cart.types";

const pricing: QuantityPricing = {
  enabled: true,
  mode: "fixed_unit_price",
  basis: "total_order_qty",
  tiers: [
    { minQty: 20, maxQty: 49, unitPrice: 150_000, label: "20-49 pcs" },
    { minQty: 50, maxQty: 99, unitPrice: 145_000, label: "50-99 pcs" },
    { minQty: 100, maxQty: 299, unitPrice: 138_000, label: "100-299 pcs" },
    { minQty: 300, maxQty: 499, unitPrice: 130_000, label: "300-499 pcs" },
    { minQty: 500, maxQty: null, unitPrice: 125_000, label: "500+ pcs" },
  ],
};

const qty100 = calculateQuantityTierPrice({
  regularPrice: 160_000,
  totalQty: 20 + 30 + 50,
  quantityPricing: pricing,
});
assert.equal(qty100.unitPrice, 138_000);
assert.equal(qty100.subtotal, 13_800_000);
assert.equal(qty100.tierLabel, "100-299 pcs");
assert.equal(qty100.tierApplied, true);
assert.deepEqual(qty100.nextTier, {
  minQty: 300,
  unitPrice: 130_000,
  qtyToNextTier: 200,
  potentialUnitPrice: 130_000,
});

const qty500 = calculateQuantityTierPrice({
  regularPrice: 160_000,
  totalQty: 500,
  quantityPricing: pricing,
});
assert.equal(qty500.unitPrice, 125_000);
assert.equal(qty500.subtotal, 62_500_000);

const fallback = calculateQuantityTierPrice({
  regularPrice: 160_000,
  totalQty: 10,
  quantityPricing: pricing,
});
assert.equal(fallback.unitPrice, 160_000);
assert.equal(fallback.tierApplied, false);

const disabled = calculateQuantityTierPrice({
  regularPrice: 160_000,
  totalQty: 500,
  quantityPricing: { ...pricing, enabled: false },
});
assert.equal(disabled.unitPrice, 160_000);
assert.equal(disabled.tierApplied, false);

const overlap = validateQuantityPricing({
  enabled: true,
  moq: 20,
  tiers: [
    { minQty: 20, maxQty: 99, unitPrice: 150_000, label: "20-99 pcs" },
    { minQty: 50, maxQty: 100, unitPrice: 145_000, label: "50-100 pcs" },
  ],
});
assert.equal(overlap.valid, false);
assert.equal(overlap.errors.some((issue) => issue.code === "tier_overlap"), true);

const invalidJson = normalizeQuantityPricing({
  enabled: true,
  tiers: "{not-json}",
  moq: 20,
});
assert.equal(invalidJson.valid, false);
assert.deepEqual(invalidJson.quantityPricing.tiers, []);
assert.equal(invalidJson.issues.some((issue) => issue.code === "invalid_json"), true);

const parsedObject = normalizeQuantityPricing({
  enabled: true,
  tiers: { tiers: pricing.tiers },
  moq: 20,
});
assert.equal(parsedObject.valid, true);
assert.equal(parsedObject.quantityPricing.tiers.length, 5);

const baseWooProduct: WooCommerceProduct = {
  id: 999,
  name: "Test Quantity Pricing",
  slug: "test-quantity-pricing",
  sku: "TEST-QTY",
  status: "publish",
  description: "Test",
  short_description: "Test",
  price: "160000",
  regular_price: "160000",
  sale_price: "",
  categories: [{ id: 1, name: "Jaket", slug: "jaket" }],
  attributes: [],
  meta_data: [
    { key: "quantity_pricing_enabled", value: "true" },
    { key: "quantity_pricing_mode", value: "fixed_unit_price" },
    { key: "quantity_basis", value: "total_order_qty" },
    { key: "quantity_pricing_tiers", value: JSON.stringify(pricing.tiers) },
  ],
};
const mappedString = mapWooCommerceProductToOfissioProduct(baseWooProduct);
assert.equal(mappedString.quantityPricing?.tiers[2]?.unitPrice, 138_000);

const mappedArray = mapWooCommerceProductToOfissioProduct({
  ...baseWooProduct,
  id: 1000,
  meta_data: [
    ...(baseWooProduct.meta_data ?? []).filter((meta) => meta.key !== "quantity_pricing_tiers"),
    { key: "quantity_pricing_tiers", value: pricing.tiers },
  ],
});
assert.equal(mappedArray.quantityPricing?.tiers[4]?.maxQty, null);

const quotationSourceItem: ValidatedCheckoutCartItem = {
  productId: "woo:999",
  source: "woocommerce",
  sourceId: "999",
  productSlug: "test-quantity-pricing",
  productName: "Test Quantity Pricing",
  sku: "TEST-QTY",
  selectedColor: "Navy",
  sizeMatrix: { S: 20, M: 30, L: 50, XL: 0, "2XL": 0, "3XL": 0 },
  totalQty: 100,
  priceFrom: qty100.unitPrice,
  regularPrice: 160_000,
  finalUnitPrice: qty100.unitPrice,
  quantityTierLabel: qty100.tierLabel,
  quantityPricingBasis: "total_order_qty",
  quantityPricingMode: "fixed_unit_price",
  quantityTierApplied: qty100.tierApplied,
  subtotal: qty100.subtotal,
  productSubtotal: qty100.subtotal,
  selectedEmbroideryZones: [],
  embroideryPricingSnapshot: { enabled: false, mode: "flat_per_piece", zones: [] },
  embroideryLines: [],
  embroideryTotal: 0,
  missingEmbroideryPricingZones: [],
  customizationTotal: 0,
  finalEstimatedTotal: qty100.subtotal,
  moq: 20,
  fulfillmentType: "ready_stock_with_customization",
  transactionMode: "direct_purchase",
  model3dId: "test-model",
  model3dUrl: "/3d/kk-006.glb",
  customization: null,
  embroideryPlacements: [],
};
const quotationItems = buildQuotationItems(
  [quotationSourceItem],
  "quotation-test",
  "2026-07-31T00:00:00.000Z",
);
assert.equal(quotationItems[0]?.unitPrice, 138_000);
assert.equal(quotationItems[0]?.lineSubtotal, 13_800_000);
assert.equal(quotationItems[0]?.quantityTierLabel, "100-299 pcs");
assert.equal(quotationItems[0]?.itemSnapshot.finalUnitPrice, 138_000);

console.log(
  "PASS: quantity pricing calculator, fallback, mapper, quotation snapshot, parser, dan overlap validation.",
);
