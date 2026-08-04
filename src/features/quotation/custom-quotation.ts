import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { SizeMatrix } from "@/types/industry";

import type { ProductionRequestBrief, QuotationSource } from "./quotation.types";

const EMPTY_SIZE_MATRIX: SizeMatrix = {
  S: 0,
  M: 0,
  L: 0,
  XL: 0,
  "2XL": 0,
  "3XL": 0,
};

export function buildCustomProductionItem(input: {
  quotationId: string;
  brief: ProductionRequestBrief;
}): ValidatedCheckoutCartItem {
  const totalQty = Math.max(1, Math.round(input.brief.estimatedQuantity ?? 1));
  const projectName = input.brief.projectName?.trim() || "Proyek seragam";
  const suffix = input.quotationId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();

  return {
    productId: `custom_project_${input.quotationId}`,
    source: "custom",
    sourceId: input.quotationId,
    productSlug: `full-custom-${slugify(projectName)}`,
    productName: `Full Custom — ${projectName}`,
    sku: `CUSTOM-${suffix}`,
    selectedColor: input.brief.colorPreference?.trim() || "Ditentukan saat review",
    sizeMatrix: EMPTY_SIZE_MATRIX,
    totalQty,
    priceFrom: 0,
    regularPrice: 0,
    finalUnitPrice: 0,
    quantityTierLabel: null,
    quantityPricingBasis: "total_order_qty",
    quantityPricingMode: "fixed_unit_price",
    quantityTierApplied: false,
    subtotal: 0,
    productSubtotal: 0,
    selectedEmbroideryZones: [],
    embroideryPricingSnapshot: {
      enabled: false,
      mode: "flat_per_piece",
      zones: [],
    },
    embroideryLines: [],
    embroideryTotal: 0,
    missingEmbroideryPricingZones: [],
    customizationTotal: 0,
    finalEstimatedTotal: 0,
    moq: 1,
    fulfillmentType: "MADE_TO_ORDER",
    transactionMode: "REQUEST_QUOTATION",
    model3dId: "not_required",
    model3dUrl: "",
    customization: "Full custom production",
    embroideryPlacements: [],
  };
}

export function quotationSourceLabel(source: QuotationSource) {
  return source === "custom_request"
    ? "Brief Full Custom"
    : "Produk dari keranjang";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "project";
}
