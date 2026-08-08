import assert from "node:assert/strict";

import {
  calculateEmbroideryPricing,
  createDefaultEmbroideryPricingZones,
  normalizeEmbroideryPricing,
  normalizeEmbroideryZoneId,
  validateEmbroideryPricing,
  type EmbroideryPricing,
} from "../src/features/products/embroidery-pricing";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { getProductReadiness } from "../src/features/products/woocommerce/woocommerce-product-readiness";
import type { WooCommerceProduct } from "../src/features/products/woocommerce/woocommerce.types";

const pricing: EmbroideryPricing = {
  enabled: true,
  mode: "flat_per_piece",
  zones: createDefaultEmbroideryPricingZones(),
};

const selected = calculateEmbroideryPricing({
  totalQty: 100,
  selectedZones: ["left_chest", "middle_back"],
  productSupportedZones: ["left_chest", "center_back"],
  globalEmbroideryPricing: pricing,
});
assert.equal(selected.lines.length, 2);
assert.equal(selected.lines[0]?.subtotal, 500_000);
assert.equal(selected.lines[0]?.setupFeeApplied, false);
assert.equal(selected.lines[1]?.zoneId, "center_back");
assert.equal(selected.lines[1]?.subtotal, 1_500_000);
assert.equal(selected.total, 2_000_000);
assert.deepEqual(selected.missingPricingZones, []);

const setupPricing: EmbroideryPricing = {
  ...pricing,
  zones: pricing.zones.map((zone) =>
    zone.zoneId === "left_chest"
      ? { ...zone, setupFee: 50_000, showSetupFee: true }
      : zone,
  ),
};
const withSetup = calculateEmbroideryPricing({
  totalQty: 100,
  selectedZones: ["left_chest"],
  productSupportedZones: ["left_chest"],
  globalEmbroideryPricing: setupPricing,
});
assert.equal(withSetup.lines[0]?.subtotal, 550_000);
assert.equal(withSetup.lines[0]?.setupFeeApplied, true);
assert.equal(withSetup.total, 550_000);

const hiddenSetup = calculateEmbroideryPricing({
  totalQty: 100,
  selectedZones: ["left_chest"],
  productSupportedZones: ["left_chest"],
  globalEmbroideryPricing: {
    ...setupPricing,
    zones: setupPricing.zones.map((zone) => ({ ...zone, showSetupFee: false })),
  },
});
assert.equal(hiddenSetup.total, 500_000);
assert.equal(hiddenSetup.lines[0]?.setupFeeApplied, false);

const unsupported = calculateEmbroideryPricing({
  totalQty: 100,
  selectedZones: ["upper_back"],
  productSupportedZones: ["left_chest"],
  globalEmbroideryPricing: pricing,
});
assert.equal(unsupported.total, 0);
assert.deepEqual(unsupported.unsupportedZones, ["upper_back"]);

const disabled = calculateEmbroideryPricing({
  totalQty: 100,
  selectedZones: ["left_sleeve"],
  productSupportedZones: ["left_sleeve"],
  globalEmbroideryPricing: {
    ...pricing,
    zones: pricing.zones.map((zone) => zone.zoneId === "left_sleeve" ? { ...zone, enabled: false } : zone),
  },
});
assert.equal(disabled.total, 0);
assert.deepEqual(disabled.missingPricingZones, ["left_sleeve"]);
assert.equal(13_800_000 + selected.total, 15_800_000);

const missing = calculateEmbroideryPricing({
  totalQty: 100,
  selectedZones: ["right_sleeve"],
  productSupportedZones: ["right_sleeve"],
  globalEmbroideryPricing: { enabled: true, mode: "flat_per_piece", zones: [] },
});
assert.equal(missing.total, 0);
assert.deepEqual(missing.lines, []);
assert.deepEqual(missing.missingPricingZones, ["right_sleeve"]);

assert.equal(normalizeEmbroideryZoneId("back"), "center_back");
assert.equal(normalizeEmbroideryZoneId("middle_back"), "center_back");
assert.equal(normalizeEmbroideryZoneId("center-back"), "center_back");

const invalid = validateEmbroideryPricing({
  enabled: true,
  supportsEmbroidery: true,
  zones: [
    {
      ...pricing.zones[0]!,
      unitPrice: 0,
      maxWidthCm: 0,
      setupFee: -1,
    },
  ],
});
assert.equal(invalid.valid, false);
assert.equal(invalid.errors.some((issue) => issue.code === "invalid_unit_price"), true);
assert.equal(invalid.errors.some((issue) => issue.code === "invalid_width"), true);
assert.equal(invalid.errors.some((issue) => issue.code === "invalid_setup_fee"), true);

const invalidJson = normalizeEmbroideryPricing({
  enabled: true,
  supportsEmbroidery: true,
  zones: "{invalid-json}",
});
assert.equal(invalidJson.valid, false);
assert.deepEqual(invalidJson.embroideryPricing.zones, []);
assert.equal(invalidJson.issues.some((issue) => issue.code === "invalid_json"), true);

const parsedObject = normalizeEmbroideryPricing({
  enabled: true,
  supportsEmbroidery: true,
  zones: { zones: pricing.zones },
});
assert.equal(parsedObject.valid, true);
assert.equal(parsedObject.embroideryPricing.zones.length, 6);

const baseWooProduct: WooCommerceProduct = {
  id: 1001,
  name: "Test Embroidery Pricing",
  slug: "test-embroidery-pricing",
  sku: "TEST-EMB",
  status: "publish",
  description: "Test",
  short_description: "Test",
  price: "160000",
  regular_price: "160000",
  sale_price: "",
  categories: [{ id: 1, name: "Jaket", slug: "jaket" }],
  images: [{ id: 1, src: "https://commerce.ofissio.test/test-embroidery-pricing.webp" }],
  attributes: [],
  meta_data: [
    { key: "industries", value: JSON.stringify(["mining"]) },
    { key: "has_3d_model", value: true },
    { key: "model_3d_url", value: "/3d/test-embroidery-pricing.glb" },
    { key: "model_3d_id", value: "test-emb-v1" },
    { key: "model_3d_version", value: "1" },
    { key: "model_3d_source", value: "local" },
    { key: "model_3d_filename", value: "test-embroidery-pricing.glb" },
    { key: "moq", value: 20 },
    { key: "lead_time", value: "14 hari" },
    { key: "fulfillment_type", value: "READY_STOCK" },
    { key: "transaction_mode", value: "HYBRID" },
    { key: "supports_embroidery", value: true },
    { key: "embroidery_zones", value: JSON.stringify(["left_chest", "center_back"]) },
    { key: "embroidery_pricing_enabled", value: true },
    { key: "embroidery_pricing_mode", value: "flat_per_piece" },
    { key: "embroidery_pricing", value: JSON.stringify(pricing.zones) },
  ],
};
const mappedString = mapWooCommerceProductToOfissioProduct(baseWooProduct);
assert.equal(mappedString.legacyEmbroideryPricing?.zones[0]?.unitPrice, 5_000);
assert.equal(mappedString.legacyEmbroideryPricing?.zones[5]?.zoneId, "center_back");

const mappedArray = mapWooCommerceProductToOfissioProduct({
  ...baseWooProduct,
  id: 1002,
  meta_data: [
    ...(baseWooProduct.meta_data ?? []).filter((meta) => meta.key !== "embroidery_pricing"),
    { key: "embroidery_pricing", value: pricing.zones },
  ],
});
assert.equal(mappedArray.legacyEmbroideryPricing?.zones[4]?.unitPrice, 10_000);

const missingPricingProduct: WooCommerceProduct = {
  ...baseWooProduct,
  id: 1003,
  meta_data: (baseWooProduct.meta_data ?? []).filter((meta) =>
    !["embroidery_pricing", "embroidery_pricing_enabled", "embroidery_pricing_mode"].includes(meta.key),
  ),
};
const missingPricingReadiness = getProductReadiness(missingPricingProduct);
assert.equal(missingPricingReadiness.isVisibleInOfissio, true);
assert.equal(
  missingPricingReadiness.warnings.some((issue) => issue.field === "embroidery_pricing"),
  false,
);
assert.equal(
  missingPricingReadiness.blockingIssues.some((issue) => issue.field === "embroidery_pricing"),
  false,
);

console.log(
  "PASS: global embroidery pricing, supported zones, setup fee, missing price, legacy metadata, dan non-blocking readiness.",
);
