import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";

import type {
  QuotationItemRecord,
  QuotationPricingInput,
  QuotationRequestRecord,
  QuotationStatus,
} from "./quotation.types";

export const DEFAULT_QUOTATION_VALID_DAYS = 14;

export function normalizeQuotationRecord(
  quotation: QuotationRequestRecord,
): QuotationRequestRecord {
  const now = quotation.updatedAt || quotation.createdAt || new Date().toISOString();
  const normalizedItems = (quotation.items ?? []).map((item, index) =>
    normalizeQuotationItem({
      item: item as QuotationItemRecord | ValidatedCheckoutCartItem,
      quotationId: quotation.id,
      index,
      now,
    }),
  );
  const subtotalEstimate =
    Number(quotation.subtotalEstimate) ||
    normalizedItems.reduce((total, item) => total + (item.finalLineTotal ?? item.priceFrom * item.totalQty), 0);
  const pricingSubtotal =
    quotation.subtotal == null
      ? null
      : safeMoney(quotation.subtotal);
  const discountTotal = safeMoney(quotation.discountTotal);
  const taxTotal = safeMoney(quotation.taxTotal);
  const shippingEstimate = safeMoney(quotation.shippingEstimate);
  const computedGrandTotal =
    pricingSubtotal == null
      ? null
      : Math.max(0, pricingSubtotal - discountTotal) + taxTotal + shippingEstimate;

  return {
    ...quotation,
    items: normalizedItems,
    subtotalEstimate,
    internalNotes: Array.isArray(quotation.internalNotes)
      ? quotation.internalNotes
      : [],
    salesNotes: quotation.salesNotes ?? null,
    customerMessage: quotation.customerMessage ?? null,
    subtotal: pricingSubtotal,
    discountTotal,
    taxTotal,
    shippingEstimate,
    grandTotal:
      quotation.grandTotal == null
        ? computedGrandTotal
        : safeMoney(quotation.grandTotal),
    currency: "IDR",
    validUntil: quotation.validUntil ?? null,
    salesEmail: quotation.salesEmail ?? null,
    customerEmail: quotation.customerEmail ?? quotation.picEmail ?? quotation.userEmail ?? null,
    acceptedAt: quotation.acceptedAt ?? null,
    rejectedAt: quotation.rejectedAt ?? null,
    convertedOrderId: quotation.convertedOrderId ?? null,
    wooOrderId: quotation.wooOrderId ?? null,
    wooOrderNumber: quotation.wooOrderNumber ?? null,
    wooSyncStatus: quotation.wooSyncStatus ?? (quotation.wooOrderId ? "synced" : "disabled"),
    wooSyncError: quotation.wooSyncError ?? null,
    wooSyncedAt: quotation.wooSyncedAt ?? null,
    quotationPdfDocumentId: quotation.quotationPdfDocumentId ?? null,
    quotationPdfGeneratedAt: quotation.quotationPdfGeneratedAt ?? null,
    totalQty: quotation.totalQty || normalizedItems.reduce((total, item) => total + item.totalQty, 0),
    embroideryPointCount:
      quotation.embroideryPointCount ||
      normalizedItems.reduce((total, item) => total + item.embroideryPlacements.length, 0),
    updatedAt: now,
  };
}

export function normalizeQuotationItem(input: {
  item: QuotationItemRecord | ValidatedCheckoutCartItem;
  quotationId: string;
  index: number;
  now?: string;
}): QuotationItemRecord {
  const item = input.item as QuotationItemRecord;
  const now = input.now ?? new Date().toISOString();
  const fallbackId = `${input.quotationId}_item_${input.index}`;
  const logoFileId =
    item.logoFileId ??
    item.embroideryPlacements.find((placement) => placement.logoFileId)?.logoFileId ??
    null;
  const calculatedUnitPrice =
    item.unitPrice ?? item.finalUnitPrice ?? item.priceFrom;
  const calculatedLineSubtotal = calculatedUnitPrice * item.totalQty;
  const embroideryLines = Array.isArray(item.embroideryLines) ? item.embroideryLines : [];
  const embroideryTotal = item.embroideryTotal ?? embroideryLines.reduce((total, line) => total + line.subtotal, 0);
  const finalUnitPrice = item.finalUnitPrice ?? calculatedUnitPrice;
  const finalLineTotal = Math.max(
    0,
    finalUnitPrice * item.totalQty + embroideryTotal - safeMoney(item.discountAmount),
  );

  return {
    ...item,
    id: item.id ?? fallbackId,
    quotationId: item.quotationId ?? input.quotationId,
    unitPrice: calculatedUnitPrice,
    lineSubtotal: item.lineSubtotal ?? calculatedLineSubtotal,
    productSubtotal: item.productSubtotal ?? calculatedLineSubtotal,
    discountAmount: safeMoney(item.discountAmount),
    finalUnitPrice,
    finalLineTotal: item.finalLineTotal ?? finalLineTotal,
    selectedEmbroideryZones: item.selectedEmbroideryZones ?? embroideryLines.map((line) => line.zoneId),
    embroideryPricingSnapshot: item.embroideryPricingSnapshot ?? { enabled: false, mode: "flat_per_piece", zones: [] },
    embroideryLines,
    embroideryTotal,
    missingEmbroideryPricingZones: item.missingEmbroideryPricingZones ?? [],
    customizationTotal: item.customizationTotal ?? embroideryTotal,
    finalEstimatedTotal: item.finalEstimatedTotal ?? calculatedLineSubtotal + embroideryTotal,
    logoFileId,
    itemSnapshot: item.itemSnapshot ?? {
      productId: item.productId,
      source: item.source,
      sourceId: item.sourceId,
      productSlug: item.productSlug,
      productName: item.productName,
      sku: item.sku,
      selectedColor: item.selectedColor,
      sizeMatrix: item.sizeMatrix,
      totalQty: item.totalQty,
      priceFrom: item.priceFrom,
      regularPrice: item.regularPrice ?? item.priceFrom,
      finalUnitPrice: item.finalUnitPrice ?? item.priceFrom,
      quantityTierLabel: item.quantityTierLabel ?? null,
      quantityPricingBasis: item.quantityPricingBasis ?? "total_order_qty",
      quantityPricingMode: item.quantityPricingMode ?? "fixed_unit_price",
      quantityTierApplied: item.quantityTierApplied ?? false,
      subtotal: item.subtotal ?? item.priceFrom * item.totalQty,
      productSubtotal: item.productSubtotal ?? item.subtotal ?? item.priceFrom * item.totalQty,
      selectedEmbroideryZones: item.selectedEmbroideryZones ?? embroideryLines.map((line) => line.zoneId),
      embroideryPricingSnapshot: item.embroideryPricingSnapshot ?? { enabled: false, mode: "flat_per_piece", zones: [] },
      embroideryLines,
      embroideryTotal,
      missingEmbroideryPricingZones: item.missingEmbroideryPricingZones ?? [],
      customizationTotal: item.customizationTotal ?? embroideryTotal,
      finalEstimatedTotal: item.finalEstimatedTotal ?? (item.subtotal ?? item.priceFrom * item.totalQty) + embroideryTotal,
      moq: item.moq,
      fulfillmentType: item.fulfillmentType,
      transactionMode: item.transactionMode,
      model3dId: item.model3dId,
      model3dUrl: item.model3dUrl,
      customization: item.customization,
      embroideryPlacements: item.embroideryPlacements,
    },
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

export function buildQuotationItems(
  items: ValidatedCheckoutCartItem[],
  quotationId: string,
  now: string,
): QuotationItemRecord[] {
  return items.map((item, index) =>
    normalizeQuotationItem({
      item,
      quotationId,
      index,
      now,
    }),
  );
}

export function calculateQuotationPricing(
  quotation: QuotationRequestRecord,
  input: QuotationPricingInput,
) {
  const now = new Date().toISOString();
  const byId = new Map(input.items.map((item) => [item.itemId, item]));
  const items = quotation.items.map((item) => {
    const patch = byId.get(item.id);
    if (!patch) return item;
    const unitPrice = safeMoney(patch.unitPrice);
    const lineSubtotal = unitPrice * item.totalQty;
    const discountAmount = safeMoney(patch.discountAmount);
    const finalUnitPrice =
      patch.finalUnitPrice == null ? unitPrice : safeMoney(patch.finalUnitPrice);
    const embroideryLines = patch.embroideryLines
      ? item.embroideryLines.map((line) => {
          const embroideryPatch = patch.embroideryLines?.find((candidate) => candidate.zoneId === line.zoneId);
          if (!embroideryPatch) return line;
          const embroideryUnitPrice = safeMoney(embroideryPatch.unitPrice);
          const setupFee = safeMoney(embroideryPatch.setupFee);
          return {
            ...line,
            unitPrice: embroideryUnitPrice,
            setupFee,
            setupFeeApplied: setupFee > 0,
            subtotal: embroideryUnitPrice * item.totalQty + setupFee,
          };
        })
      : item.embroideryLines;
    const embroideryTotal = embroideryLines.reduce((total, line) => total + line.subtotal, 0);
    const finalLineTotal = Math.max(
      0,
      finalUnitPrice * item.totalQty + embroideryTotal - discountAmount,
    );
    return {
      ...item,
      unitPrice,
      lineSubtotal,
      discountAmount,
      finalUnitPrice,
      embroideryLines,
      embroideryTotal,
      customizationTotal: embroideryTotal,
      finalEstimatedTotal: finalUnitPrice * item.totalQty + embroideryTotal,
      finalLineTotal,
      updatedAt: now,
    };
  });
  const subtotal = items.reduce(
    (total, item) => total + safeMoney(item.finalLineTotal),
    0,
  );
  const discountTotal = safeMoney(input.discountTotal);
  const taxTotal = safeMoney(input.taxTotal);
  const shippingEstimate = safeMoney(input.shippingEstimate);
  const grandTotal = Math.max(0, subtotal - discountTotal) + taxTotal + shippingEstimate;

  return {
    items,
    subtotal,
    discountTotal,
    taxTotal,
    shippingEstimate,
    grandTotal,
    validUntil: normalizeDate(input.validUntil),
    customerMessage: cleanOptionalText(input.customerMessage),
    salesNotes: cleanOptionalText(input.salesNotes),
    salesEmail: cleanOptionalText(input.salesEmail),
  };
}

export function defaultValidUntil(now = new Date()) {
  return new Date(
    now.getTime() + DEFAULT_QUOTATION_VALID_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function finalizeQuotationForCustomer(
  quotation: QuotationRequestRecord,
  now = new Date(),
) {
  return normalizeQuotationRecord({
    ...quotation,
    status: "quoted",
    validUntil: quotation.validUntil ?? defaultValidUntil(now),
    updatedAt: now.toISOString(),
  });
}

export function isQuotationExpired(
  quotation: QuotationRequestRecord,
  now = Date.now(),
) {
  if (!quotation.validUntil) return false;
  return Date.parse(quotation.validUntil) < now;
}

export function canCustomerAcceptQuotation(
  quotation: QuotationRequestRecord,
  now = Date.now(),
) {
  return getQuotationAcceptDisabledReason(quotation, now) === null;
}

export function hasFinalQuotationPricing(quotation: QuotationRequestRecord) {
  const grandTotal = Number(quotation.grandTotal);
  return (
    quotation.subtotal != null &&
    Number.isFinite(grandTotal) &&
    grandTotal > 0
  );
}

export function getQuotationAcceptDisabledReason(
  quotation: QuotationRequestRecord,
  now = Date.now(),
) {
  if (quotation.status === "accepted") return "Penawaran sudah diterima.";
  if (quotation.status === "converted_to_order") {
    return "Penawaran sudah dikonversi menjadi order.";
  }
  if (quotation.status === "rejected") return "Penawaran sudah ditolak.";
  if (quotation.status === "revision_requested") {
    return "Perubahan penawaran sedang diminta.";
  }
  if (quotation.status === "expired" || isQuotationExpired(quotation, now)) {
    return "Penawaran sudah kedaluwarsa.";
  }
  if (quotation.status === "cancelled") return "Penawaran sudah dibatalkan.";
  if (!hasFinalQuotationPricing(quotation)) {
    return "Penawaran final belum tersedia.";
  }
  if (quotation.status !== "quoted") {
    return "Penawaran resmi belum dikirim oleh tim Ofissio.";
  }
  return null;
}

export function isConvertableQuotationStatus(status: QuotationStatus) {
  return status === "accepted" || status === "quoted";
}

export function safeMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

function normalizeDate(value?: string | null) {
  if (!value) return defaultValidUntil();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : defaultValidUntil();
}

function cleanOptionalText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}
