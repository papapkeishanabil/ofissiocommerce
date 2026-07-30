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
    normalizedItems.reduce((total, item) => total + item.priceFrom * item.totalQty, 0);
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

  return {
    ...item,
    id: item.id ?? fallbackId,
    quotationId: item.quotationId ?? input.quotationId,
    unitPrice: item.unitPrice ?? null,
    lineSubtotal: item.lineSubtotal ?? null,
    discountAmount: safeMoney(item.discountAmount),
    finalUnitPrice: item.finalUnitPrice ?? null,
    finalLineTotal: item.finalLineTotal ?? null,
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
    const finalLineTotal = Math.max(
      0,
      finalUnitPrice * item.totalQty - discountAmount,
    );
    return {
      ...item,
      unitPrice,
      lineSubtotal,
      discountAmount,
      finalUnitPrice,
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

export function isQuotationExpired(quotation: QuotationRequestRecord) {
  if (!quotation.validUntil) return false;
  return Date.parse(quotation.validUntil) < Date.now();
}

export function canCustomerAcceptQuotation(quotation: QuotationRequestRecord) {
  return quotation.status === "quoted" && !isQuotationExpired(quotation);
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
