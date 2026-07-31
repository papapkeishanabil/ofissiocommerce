import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { EmailSendResult, EmailStatus } from "@/features/email/email.types";
import type { WooOrderSyncStatus } from "@/features/orders/order.types";

export const QUOTATION_STATUSES = [
  "draft",
  "submitted",
  "emailed",
  "under_review",
  "quoted",
  "revision_requested",
  "accepted",
  "rejected",
  "expired",
  "converted_to_order",
  "cancelled",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_EVENT_TYPES = [
  "submitted",
  "status_changed",
  "pricing_updated",
  "emailed_to_customer",
  "customer_accepted",
  "customer_rejected",
  "converted_to_order",
  "internal_note_added",
] as const;

export type QuotationEventType = (typeof QUOTATION_EVENT_TYPES)[number];

export interface QuotationNote {
  id: string;
  authorId: string | null;
  authorType: "internal" | "customer" | "system";
  note: string;
  createdAt: string;
}

export interface QuotationItemRecord
  extends Omit<ValidatedCheckoutCartItem, "finalUnitPrice"> {
  id: string;
  quotationId: string;
  unitPrice: number | null;
  lineSubtotal: number | null;
  discountAmount: number;
  finalUnitPrice: number | null;
  finalLineTotal: number | null;
  logoFileId: string | null;
  itemSnapshot: ValidatedCheckoutCartItem;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationPricingInputItem {
  itemId: string;
  unitPrice: number;
  discountAmount?: number;
  finalUnitPrice?: number | null;
  embroideryLines?: Array<{
    zoneId: string;
    unitPrice: number;
    setupFee?: number;
  }>;
}

export interface QuotationPricingInput {
  items: QuotationPricingInputItem[];
  discountTotal?: number;
  taxTotal?: number;
  shippingEstimate?: number;
  customerMessage?: string | null;
  salesNotes?: string | null;
  validUntil?: string | null;
  salesEmail?: string | null;
}

export interface QuotationEventRecord {
  id: string;
  quotationId: string;
  companyId: string;
  actorId: string | null;
  actorType: "internal" | "customer" | "system";
  eventType: QuotationEventType;
  oldStatus: QuotationStatus | null;
  newStatus: QuotationStatus | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface QuotationRequestRecord {
  id: string;
  quotationNumber: string;
  companyId: string;
  companyName: string;
  userId: string;
  userEmail: string | null;
  picName: string;
  picEmail: string | null;
  picWhatsapp: string | null;
  status: QuotationStatus;
  source: "web_cart";
  items: QuotationItemRecord[];
  subtotalEstimate: number;
  internalNotes: QuotationNote[];
  salesNotes: string | null;
  customerMessage: string | null;
  subtotal: number | null;
  discountTotal: number;
  taxTotal: number;
  shippingEstimate: number;
  grandTotal: number | null;
  currency: "IDR";
  validUntil: string | null;
  salesEmail: string | null;
  customerEmail: string | null;
  totalQty: number;
  embroideryPointCount: number;
  customerNotes: string | null;
  shippingDestination: string | null;
  emailStatus: EmailStatus;
  emailLogIds: string[];
  emailResults: EmailSendResult[];
  acceptedAt: string | null;
  rejectedAt: string | null;
  convertedOrderId: string | null;
  wooOrderId: string | null;
  wooOrderNumber?: string | null;
  wooSyncStatus?: WooOrderSyncStatus;
  wooSyncError?: string | null;
  wooSyncedAt?: string | null;
  quotationPdfDocumentId?: string | null;
  quotationPdfGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuotationRequestInput {
  companyId: string;
  companyName: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  picName: string | null;
  picEmail: string | null;
  picWhatsapp: string | null;
  customerNotes: string | null;
  shippingDestination: string | null;
  items: Array<{
    productId: string;
    selectedColor: string;
    sizeMatrix: Record<string, number>;
    customization: string | null;
    embroideryPlacements: unknown[];
  }>;
}

export interface CreateQuotationRequestResult {
  quotation: QuotationRequestRecord;
  emails: EmailSendResult[];
}
