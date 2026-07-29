import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { EmailSendResult, EmailStatus } from "@/features/email/email.types";

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
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

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
  items: ValidatedCheckoutCartItem[];
  subtotalEstimate: number;
  totalQty: number;
  embroideryPointCount: number;
  customerNotes: string | null;
  shippingDestination: string | null;
  emailStatus: EmailStatus;
  emailLogIds: string[];
  emailResults: EmailSendResult[];
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
