import assert from "node:assert/strict";

import type { ValidatedCheckoutCartItem } from "../src/features/checkout/checkout-cart.types";
import {
  calculateEmbroideryPricing,
  createDefaultEmbroideryPricingZones,
  type EmbroideryPricing,
} from "../src/features/products/embroidery-pricing";
import {
  calculateQuantityTierPrice,
  type QuantityPricing,
} from "../src/features/products/quantity-pricing";
import type { QuotationRequestRecord } from "../src/features/quotation/quotation.types";
import { quotationStatusLabel } from "../src/features/quotation/quotation.mapper";
import {
  buildQuotationItems,
  calculateQuotationPricing,
  canCustomerAcceptQuotation,
  finalizeQuotationForCustomer,
  getQuotationAcceptDisabledReason,
  hasFinalQuotationPricing,
} from "../src/features/quotation/quotation.utils";

const quantityPricing: QuantityPricing = {
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

const embroideryPricing: EmbroideryPricing = {
  enabled: true,
  mode: "flat_per_piece",
  zones: createDefaultEmbroideryPricingZones(),
};

const totalQty = 100;
const productPricing = calculateQuantityTierPrice({
  regularPrice: 290_000,
  totalQty,
  quantityPricing,
});
assert.equal(productPricing.tierLabel, "100-299 pcs");
assert.equal(productPricing.unitPrice, 138_000);
assert.equal(productPricing.subtotal, 13_800_000);

const embroidery = calculateEmbroideryPricing({
  totalQty,
  selectedZones: ["left_chest", "middle_back"],
  productSupportedZones: ["left_chest", "center_back"],
  globalEmbroideryPricing: embroideryPricing,
});
assert.deepEqual(embroidery.unsupportedZones, []);
assert.deepEqual(embroidery.missingPricingZones, []);
assert.equal(embroidery.lines.find((line) => line.zoneId === "left_chest")?.subtotal, 500_000);
assert.equal(embroidery.lines.find((line) => line.zoneId === "center_back")?.subtotal, 1_500_000);
assert.equal(embroidery.total, 2_000_000);
assert.equal(productPricing.subtotal + embroidery.total, 15_800_000);

const cartItem: ValidatedCheckoutCartItem = {
  productId: "wc-18",
  source: "woocommerce",
  sourceId: "18",
  productSlug: "jaket-test-a3",
  productName: "JAKET TEST A3",
  sku: "JAK-A3-001",
  selectedColor: "Navy",
  sizeMatrix: { S: 20, M: 30, L: 50, XL: 0, "2XL": 0, "3XL": 0 },
  totalQty,
  priceFrom: productPricing.unitPrice,
  regularPrice: 290_000,
  finalUnitPrice: productPricing.unitPrice,
  quantityTierLabel: productPricing.tierLabel,
  quantityPricingBasis: quantityPricing.basis,
  quantityPricingMode: quantityPricing.mode,
  quantityTierApplied: productPricing.tierApplied,
  subtotal: productPricing.subtotal,
  productSubtotal: productPricing.subtotal,
  selectedEmbroideryZones: embroidery.lines.map((line) => line.zoneId),
  embroideryPricingSnapshot: structuredClone(embroideryPricing),
  embroideryLines: structuredClone(embroidery.lines),
  embroideryTotal: embroidery.total,
  missingEmbroideryPricingZones: embroidery.missingPricingZones,
  customizationTotal: embroidery.total,
  finalEstimatedTotal: productPricing.subtotal + embroidery.total,
  moq: 20,
  fulfillmentType: "ready_stock_with_customization",
  transactionMode: "hybrid",
  model3dId: "jak-001-v1",
  model3dUrl: "/api/products/woocommerce/18/3d-model/signed-url",
  customization: "Bordir Dada Kiri dan Punggung Tengah",
  embroideryPlacements: [
    {
      zone: "left_chest",
      logoFileId: "logo-a6",
      logoFileName: "logo-a6.png",
      widthCm: 8,
      heightCm: 4,
      rotation: 0,
      technique: "embroidery",
    },
    {
      zone: "middle_back",
      logoFileId: "logo-a6",
      logoFileName: "logo-a6.png",
      widthCm: 20,
      heightCm: 10,
      rotation: 0,
      technique: "embroidery",
    },
  ],
};

const now = "2026-08-01T00:00:00.000Z";
const quotationItems = buildQuotationItems([cartItem], "quo_a6", now);
const quotationItem = quotationItems[0];
assert.ok(quotationItem);
assert.equal(quotationItem.finalLineTotal, 15_800_000);
assert.equal(quotationItem.itemSnapshot.finalEstimatedTotal, 15_800_000);
assert.equal(quotationItem.itemSnapshot.quantityTierLabel, "100-299 pcs");

const quotation: QuotationRequestRecord = {
  id: "quo_a6",
  quotationNumber: "OF-QUO-A6",
  companyId: "company-a6",
  companyName: "PT A6 Test",
  userId: "user-a6",
  userEmail: "purchasing@example.test",
  picName: "Purchasing A6",
  picEmail: "purchasing@example.test",
  picWhatsapp: null,
  status: "under_review",
  source: "web_cart",
  items: quotationItems,
  subtotalEstimate: 15_800_000,
  internalNotes: [],
  salesNotes: null,
  customerMessage: null,
  subtotal: 15_800_000,
  discountTotal: 0,
  taxTotal: 0,
  shippingEstimate: 0,
  grandTotal: 15_800_000,
  currency: "IDR",
  validUntil: "2026-08-15T00:00:00.000Z",
  salesEmail: null,
  customerEmail: "purchasing@example.test",
  totalQty,
  embroideryPointCount: 2,
  customerNotes: null,
  shippingDestination: null,
  emailStatus: "skipped",
  emailLogIds: [],
  emailResults: [],
  acceptedAt: null,
  rejectedAt: null,
  convertedOrderId: null,
  wooOrderId: null,
  wooOrderNumber: null,
  wooSyncStatus: "disabled",
  wooSyncError: null,
  wooSyncedAt: null,
  createdAt: now,
  updatedAt: now,
};

const override = calculateQuotationPricing(quotation, {
  items: [
    {
      itemId: quotationItem.id,
      unitPrice: 138_000,
      finalUnitPrice: 138_000,
      embroideryLines: [
        { zoneId: "left_chest", unitPrice: 5_500, setupFee: 0 },
        { zoneId: "center_back", unitPrice: 15_000, setupFee: 0 },
      ],
    },
  ],
});
assert.equal(override.items[0]?.embroideryTotal, 2_050_000);
assert.equal(override.items[0]?.finalLineTotal, 15_850_000);
assert.equal(override.grandTotal, 15_850_000);

// The original calculation stays in itemSnapshot even after an admin override.
assert.equal(override.items[0]?.itemSnapshot.embroideryTotal, 2_000_000);
assert.equal(
  override.items[0]?.itemSnapshot.embroideryLines.find((line) => line.zoneId === "left_chest")?.unitPrice,
  5_000,
);

// A future master-price change must not mutate an existing quotation snapshot.
const changedMaster = structuredClone(embroideryPricing);
const leftChest = changedMaster.zones.find((zone) => zone.zoneId === "left_chest");
assert.ok(leftChest);
leftChest.unitPrice = 6_000;
const futureCalculation = calculateEmbroideryPricing({
  totalQty,
  selectedZones: ["left_chest", "center_back"],
  productSupportedZones: ["left_chest", "center_back"],
  globalEmbroideryPricing: changedMaster,
});
assert.equal(futureCalculation.total, 2_100_000);
assert.equal(quotationItem.itemSnapshot.embroideryTotal, 2_000_000);
assert.equal(quotationItem.finalLineTotal, 15_800_000);

// Safe commercial fallbacks: an uncovered quantity uses the regular price,
// while unsupported or unpriced embroidery zones are reported instead of
// receiving an invented price.
const regularPriceFallback = calculateQuantityTierPrice({
  regularPrice: 290_000,
  totalQty: 10,
  quantityPricing,
});
assert.equal(regularPriceFallback.tierApplied, false);
assert.equal(regularPriceFallback.unitPrice, 290_000);
assert.equal(regularPriceFallback.subtotal, 2_900_000);

const unsupportedEmbroidery = calculateEmbroideryPricing({
  totalQty,
  selectedZones: ["right_chest"],
  productSupportedZones: ["left_chest", "center_back"],
  globalEmbroideryPricing: embroideryPricing,
});
assert.deepEqual(unsupportedEmbroidery.unsupportedZones, ["right_chest"]);
assert.equal(unsupportedEmbroidery.total, 0);

const missingEmbroideryPrice = structuredClone(embroideryPricing);
const centerBack = missingEmbroideryPrice.zones.find(
  (zone) => zone.zoneId === "center_back",
);
assert.ok(centerBack);
centerBack.enabled = false;
const missingEmbroidery = calculateEmbroideryPricing({
  totalQty,
  selectedZones: ["center_back"],
  productSupportedZones: ["center_back"],
  globalEmbroideryPricing: missingEmbroideryPrice,
});
assert.deepEqual(missingEmbroidery.missingPricingZones, ["center_back"]);
assert.equal(missingEmbroidery.total, 0);

// Customer quotation readiness must follow the canonical `quoted` status and
// valid final pricing. A submitted/under-review quotation is never accept-ready.
assert.equal(hasFinalQuotationPricing(quotation), true);
const quotationReadinessNow = Date.parse("2026-08-01T12:00:00.000Z");
assert.equal(canCustomerAcceptQuotation(quotation, quotationReadinessNow), false);
assert.equal(
  getQuotationAcceptDisabledReason(quotation, quotationReadinessNow),
  "Penawaran resmi belum dikirim oleh tim Ofissio.",
);
const quoted = { ...quotation, status: "quoted" as const };
assert.equal(canCustomerAcceptQuotation(quoted, quotationReadinessNow), true);
assert.equal(getQuotationAcceptDisabledReason(quoted, quotationReadinessNow), null);
assert.equal(
  canCustomerAcceptQuotation({ ...quoted, grandTotal: 0 }, quotationReadinessNow),
  false,
);
const finalizedForCustomer = finalizeQuotationForCustomer(
  { ...quotation, validUntil: null },
  new Date("2026-08-01T12:00:00.000Z"),
);
assert.equal(finalizedForCustomer.status, "quoted");
assert.equal(quotationStatusLabel("submitted"), "Diajukan");
assert.equal(quotationStatusLabel(quotation.status), "Sedang ditinjau");
assert.equal(quotationStatusLabel(finalizedForCustomer.status), "Penawaran terkirim");
assert.equal(finalizedForCustomer.validUntil, "2026-08-15T12:00:00.000Z");
assert.equal(
  canCustomerAcceptQuotation(finalizedForCustomer, quotationReadinessNow),
  true,
);
assert.equal(
  getQuotationAcceptDisabledReason(
    { ...quoted, grandTotal: 0 },
    quotationReadinessNow,
  ),
  "Penawaran final belum tersedia.",
);
assert.equal(
  canCustomerAcceptQuotation(
    {
      ...quoted,
      validUntil: "2020-01-01T00:00:00.000Z",
    },
    quotationReadinessNow,
  ),
  false,
);

console.log("Commercial flow calculation tests: PASS");
console.log("- quantity tier 100-299: Rp138.000/pcs");
console.log("- cart + quotation snapshot total: Rp15.800.000");
console.log("- admin left-chest override total: Rp15.850.000");
console.log("- historical snapshot after master-price change: PASS");
console.log("- safe pricing fallbacks: PASS");
console.log("- canonical quoted customer acceptance readiness: PASS");
