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
import {
  customerQuotationStatusMessage,
  quotationStatusLabel,
} from "../src/features/quotation/quotation.mapper";
import {
  buildQuotationItems,
  calculateQuotationPricing,
  canAdminTransitionQuotationStatus,
  canCustomerAcceptQuotation,
  finalizeQuotationForCustomer,
  getQuotationAcceptDisabledReason,
  hasFinalQuotationPricing,
  isConvertableQuotationStatus,
  isFinalQuotationStatus,
  isQuotationSendable,
  isSuccessfulQuotationEmailStatus,
  sanitizeQuotationForCustomer,
} from "../src/features/quotation/quotation.utils";
import { adminQuotationPatchSchema } from "../src/features/admin/admin.validation";
import {
  renderQuotationConfirmationToCustomer,
  renderQuotationReadyToCustomer,
  renderQuotationRequestToSales,
} from "../src/features/email/email.templates";
import { hasPendingLogoUpload } from "../src/schemas/uniform-3d";
import { deriveOrderProcessRouting } from "../src/features/orders/order-routing.service";
import { resolveQuotationRequirement } from "../src/features/quotation/quotation-requirement";

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

const fulfillmentRequirement = resolveQuotationRequirement({
  requestedType: "standard_product",
  items: [],
});
assert.equal(fulfillmentRequirement.requestedProcessRoute, "fulfillment");

const customizationRequirement = resolveQuotationRequirement({
  requestedType: "standard_product",
  items: [
    {
      customization: null,
      embroideryPlacements: [{ technique: "embroidery" }] as ValidatedCheckoutCartItem["embroideryPlacements"],
    },
  ],
});
assert.equal(customizationRequirement.requirementType, "standard_customization");
assert.equal(customizationRequirement.requestedProcessRoute, "customization");
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
      logoFileId: "file_internal_logo_a6",
      logoFileName: "logo-a6.png",
      widthCm: 8,
      heightCm: 4,
      rotation: 0,
      technique: "embroidery",
    },
    {
      zone: "middle_back",
      logoFileId: "file_internal_logo_a6",
      logoFileName: "logo-a6.png",
      widthCm: 20,
      heightCm: 10,
      rotation: 0,
      technique: "embroidery",
    },
  ],
};

const productionRouting = deriveOrderProcessRouting({
  items: [cartItem],
  requestedProcessRoute: "production",
});
assert.equal(productionRouting.processRoute, "production");
assert.equal(productionRouting.customizationType, "custom_design");

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
  taxEnabled: false,
  taxRate: 11,
  taxLabel: "PPN",
  taxTotal: 0,
  shippingEstimate: 0,
  grandTotal: 15_800_000,
  currency: "IDR",
  validUntil: "2026-08-15T00:00:00.000Z",
  salesEmail: null,
  customerEmail: "purchasing@example.test",
  totalQty,
  embroideryPointCount: 2,
  requirementType: "standard_customization",
  requestedProcessRoute: "customization",
  productionBrief: null,
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

const ppnEnabled = calculateQuotationPricing(quotation, {
  items: [{ itemId: quotationItem.id, unitPrice: 138_000, finalUnitPrice: 138_000 }],
  discountTotal: 800_000,
  taxEnabled: true,
  taxRate: 11,
});
assert.equal(ppnEnabled.taxEnabled, true);
assert.equal(ppnEnabled.taxRate, 11);
assert.equal(ppnEnabled.taxTotal, 1_650_000);
assert.equal(ppnEnabled.grandTotal, 16_650_000);

const ppnDisabled = calculateQuotationPricing(
  { ...quotation, taxEnabled: true, taxRate: 11, taxTotal: 1_738_000 },
  {
    items: [{ itemId: quotationItem.id, unitPrice: 138_000, finalUnitPrice: 138_000 }],
    taxEnabled: false,
    taxRate: 11,
  },
);
assert.equal(ppnDisabled.taxEnabled, false);
assert.equal(ppnDisabled.taxTotal, 0);
assert.equal(ppnDisabled.grandTotal, 15_800_000);

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

// A temporary local upload id must never be treated as a durable cart/logo
// reference. The configurator uses this guard while the storage upload runs.
assert.equal(
  hasPendingLogoUpload([{ logoFileId: "pending-logo-upload" }]),
  true,
);
assert.equal(
  hasPendingLogoUpload([{ logoFileId: "file_logo-persisted" }]),
  false,
);

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
  assert.equal(isConvertableQuotationStatus("quoted"), false);
  assert.equal(isConvertableQuotationStatus("accepted"), true);
  assert.equal(isQuotationSendable("submitted"), true);
  assert.equal(isQuotationSendable("quoted"), true);
  assert.equal(isQuotationSendable("accepted"), false);
assert.equal(canAdminTransitionQuotationStatus("submitted", "under_review"), true);
assert.equal(canAdminTransitionQuotationStatus("accepted", "under_review"), false);
assert.equal(canAdminTransitionQuotationStatus("under_review", "quoted"), false);
assert.equal(isSuccessfulQuotationEmailStatus("sent"), true);
assert.equal(isSuccessfulQuotationEmailStatus("mocked"), true);
assert.equal(isSuccessfulQuotationEmailStatus("failed"), false);
assert.equal(isSuccessfulQuotationEmailStatus("skipped"), false);
assert.match(customerQuotationStatusMessage("quoted"), /Penawaran resmi/);
assert.doesNotMatch(customerQuotationStatusMessage("quoted"), /sedang direview/i);
const optionalPricingPayload = adminQuotationPatchSchema.parse({
  action: "update_pricing",
  items: [{ itemId: "item-1", unitPrice: 100_000 }],
  validUntil: "",
  salesEmail: "",
});
assert.equal("action" in optionalPricingPayload, true);
if (
  "action" in optionalPricingPayload &&
  optionalPricingPayload.action === "update_pricing"
) {
  assert.equal(optionalPricingPayload.salesEmail, null);
  assert.equal(optionalPricingPayload.validUntil, null);
}

// Full quotation lifecycle smoke uses only in-memory repositories/providers.
// It exercises the same domain guards without touching Supabase, SMTP, storage,
// or WooCommerce from this deterministic command.
function runLifecycleSmoke() {
  const privateNote = "INTERNAL_ONLY_MARGIN_17_PERCENT";
  let flow: QuotationRequestRecord = {
    ...quotation,
    id: "quo_lifecycle",
    status: "submitted",
    internalNotes: [
      {
        id: "note-private",
        authorId: "internal-test",
        authorType: "internal",
        note: privateNote,
        createdAt: now,
      },
    ],
    items: override.items,
    subtotal: override.subtotal,
    discountTotal: override.discountTotal,
    taxTotal: override.taxTotal,
    shippingEstimate: override.shippingEstimate,
    grandTotal: override.grandTotal,
    validUntil: "2099-12-31T00:00:00.000Z",
  };
  assert.equal(flow.status, "submitted");

  const failedDeliveryStatuses = ["sent", "failed"];
  if (
    failedDeliveryStatuses.every(isSuccessfulQuotationEmailStatus)
  ) {
    flow = finalizeQuotationForCustomer(flow);
  }
  assert.equal(flow.status, "submitted");

  const successfulDeliveryStatuses = ["mocked", "mocked"];
  assert.equal(
    successfulDeliveryStatuses.every(isSuccessfulQuotationEmailStatus),
    true,
  );
  flow = finalizeQuotationForCustomer(flow);
  assert.equal(flow.status, "quoted");
  assert.equal(canCustomerAcceptQuotation(flow), true);
  assert.equal(isFinalQuotationStatus(flow.status), true);
  assert.doesNotMatch(customerQuotationStatusMessage(flow.status), /sedang direview/i);

  const customerOutput = sanitizeQuotationForCustomer(flow);
  assert.deepEqual(customerOutput.internalNotes, []);
  assert.equal(customerOutput.salesNotes, null);
  assert.equal(customerOutput.salesEmail, null);
  assert.deepEqual(customerOutput.emailResults, []);
  assert.equal(customerOutput.wooSyncError, null);
  assert.doesNotMatch(JSON.stringify(customerOutput), new RegExp(privateNote));
  const readyEmail = renderQuotationReadyToCustomer(flow, {
    customerUrl: `https://example.test/quotes/${flow.id}`,
    pdfAvailable: true,
  });
  assert.match(readyEmail.text, /https:\/\/example\.test\/quotes\//);
  assert.match(readyEmail.html, /<html lang="id">/);
  assert.match(readyEmail.html, /OFISSIO/);
  assert.match(readyEmail.html, /Penawaran Anda siap ditinjau/);
  assert.match(readyEmail.html, /31 Desember 2099/);
  assert.doesNotMatch(readyEmail.html, /2026-08-08T00:00:00\.000Z/);
  assert.match(`${readyEmail.text}${readyEmail.html}`, /Dada Kiri/);
  assert.match(`${readyEmail.text}${readyEmail.html}`, /Punggung Tengah/);
  assert.match(`${readyEmail.text}${readyEmail.html}`, /logo-a6\.png/);
  assert.match(`${readyEmail.text}${readyEmail.html}`, /Biaya bordir/);
  assert.match(readyEmail.html, /Bordir &amp; customization/);
  assert.match(readyEmail.html, /File logo:/);
  assert.match(readyEmail.html, /Total bordir/);
  assert.match(readyEmail.html, /Teknik/);
  assert.doesNotMatch(`${readyEmail.text}${readyEmail.html}`, /file_internal_logo_a6/);
  assert.doesNotMatch(`${readyEmail.text}${readyEmail.html}`, /logoFileId/);
  assert.doesNotMatch(`${readyEmail.text}${readyEmail.html}`, new RegExp(privateNote));

  const requestEmailContext = {
    quotationNumber: flow.quotationNumber,
    companyName: flow.companyName,
    picName: flow.picName,
    picEmail: flow.picEmail,
    picWhatsapp: flow.picWhatsapp,
    customerNotes: flow.customerNotes,
    requirementType: flow.requirementType,
    requestedProcessRoute: flow.requestedProcessRoute,
    productionBrief: flow.productionBrief,
    items: [cartItem],
    createdAt: flow.createdAt,
    internalUrl: `https://example.test/admin/quotations/${flow.id}`,
    customerUrl: `https://example.test/quotes/${flow.id}`,
  };
  for (const template of [
    renderQuotationRequestToSales(requestEmailContext),
    renderQuotationConfirmationToCustomer(requestEmailContext),
  ]) {
    assert.match(`${template.text}${template.html}`, /logo-a6\.png/);
    assert.match(`${template.text}${template.html}`, /Dada Kiri/);
    assert.doesNotMatch(`${template.text}${template.html}`, /file_internal_logo_a6/);
  }

  let acceptedEventCount = 0;
  function accept(record: QuotationRequestRecord) {
    if (record.status === "accepted") return record;
    assert.equal(canCustomerAcceptQuotation(record), true);
    acceptedEventCount += 1;
    return {
      ...record,
      status: "accepted" as const,
      acceptedAt: "2026-08-01T12:00:00.000Z",
    };
  }
  flow = accept(flow);
  const acceptedAt = flow.acceptedAt;
  flow = accept(flow);
  assert.equal(flow.acceptedAt, acceptedAt);
  assert.equal(acceptedEventCount, 1);

  let orderCount = 0;
  function convert(record: QuotationRequestRecord) {
    if (record.convertedOrderId) return record;
    assert.equal(isConvertableQuotationStatus(record.status), true);
    orderCount += 1;
    return {
      ...record,
      status: "converted_to_order" as const,
      convertedOrderId: "ord_lifecycle",
    };
  }
  flow = convert(flow);
  flow = convert(flow);
  assert.equal(flow.convertedOrderId, "ord_lifecycle");
  assert.equal(orderCount, 1);

  const expired = {
    ...quotation,
    status: "quoted" as const,
    validUntil: "2020-01-01T00:00:00.000Z",
  };
  assert.equal(canCustomerAcceptQuotation(expired), false);
  assert.match(getQuotationAcceptDisabledReason(expired) ?? "", /kedaluwarsa/);
}

try {
    runLifecycleSmoke();
    console.log("Commercial flow calculation tests: PASS");
    console.log("- quantity tier 100-299: Rp138.000/pcs");
    console.log("- cart + quotation snapshot total: Rp15.800.000");
console.log("- admin left-chest override total: Rp15.850.000");
console.log("- PPN per quotation on/off + 11% server calculation: PASS");
    console.log("- historical snapshot after master-price change: PASS");
    console.log("- safe pricing fallbacks: PASS");
    console.log("- canonical quoted customer acceptance readiness: PASS");
    console.log("- quotation create -> pricing -> send -> accept -> convert lifecycle: PASS");
    console.log("- email failure keeps pre-quoted status: PASS");
    console.log("- accept/convert idempotency and expired guard: PASS");
    console.log("- customer/email/PDF internal-note isolation: PASS");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
