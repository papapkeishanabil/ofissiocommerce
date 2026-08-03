import type { PaymentStatus } from "@/features/payment/payment.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";

export const DOCUMENT_TYPES = [
  "quotation_pdf",
  "invoice_pdf",
  "production_order_pdf_future",
  "packing_slip_pdf_future",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_ENTITY_TYPES = [
  "quotation",
  "order",
  "process_order",
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "draft",
  "generated",
  "failed",
  "expired",
  "deleted",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_TEMPLATE_IDS = [
  "quotation_default",
  "invoice_default",
  "invoice_ofissio_custom",
] as const;

export type DocumentTemplateId = (typeof DOCUMENT_TEMPLATE_IDS)[number];

export interface DocumentRecord {
  id: string;
  companyId: string;
  userId: string | null;
  documentType: DocumentType;
  entityType: DocumentEntityType;
  entityId: string;
  documentNumber: string;
  templateId: DocumentTemplateId;
  fileId: string;
  storageBucket: string;
  storageKey: string;
  filename: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  status: DocumentStatus;
  generatedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PublicDocumentRecord {
  id: string;
  documentType: DocumentType;
  entityType: DocumentEntityType;
  entityId: string;
  documentNumber: string;
  templateId: DocumentTemplateId;
  filename: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  status: DocumentStatus;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSignedUrlResult {
  document: PublicDocumentRecord;
  signedUrl: string;
  expiresAt: string;
}

export interface GenerateQuotationPdfInput {
  quotationId: string;
  templateId?: DocumentTemplateId;
  forceRegenerate?: boolean;
  allowDraft?: boolean;
  actorId: string;
  request?: Request;
}

export interface GenerateInvoicePdfInput {
  orderId: string;
  templateId?: DocumentTemplateId;
  forceRegenerate?: boolean;
  actorId: string;
  request?: Request;
}

export interface QuotationPdfItem {
  productName: string;
  sku: string;
  selectedColor: string;
  sizeSummary: string;
  totalQty: number;
  unitPrice: number | null;
  productSubtotal: number;
  embroideryTotal: number;
  discountAmount: number;
  lineTotal: number | null;
  customizationSummary: string;
}

export interface QuotationPdfData {
  quotation: QuotationRequestRecord;
  documentNumber: string;
  generatedAt: string;
  isFinal: boolean;
  items: QuotationPdfItem[];
  terms: string[];
  locationLabel: string;
  signerName: string;
  signerTitle: string;
  contactTel: string;
  contactWeb: string;
  contactEmail: string;
}

export interface InvoicePdfItem {
  description: string;
  unitPrice: number;
  qty: number;
  total: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  orderNumber: string;
  quotationNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  paymentStatus: PaymentStatus | "waiting_payment" | "payment_received";
  paymentProvider: string;
  paymentReference: string | null;
  paymentLink: string | null;
  paymentQr: string | null;
  paymentQrKind: string | null;
  paymentExpiry: string | null;
  amountPaid: number;
  balanceDue: number;
  companyName: string;
  companyAddress: string | null;
  picName: string | null;
  picPhone: string | null;
  locationLabel: string;
  items: InvoicePdfItem[];
  subtotal: number;
  customizationTotal: number;
  discountTotal: number;
  uniqueCode: number;
  dpp: number;
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  amountInWords: string;
  terms: string[];
  signerName: string;
  signerTitle: string;
  contactTel: string;
  contactWeb: string;
  contactEmail: string;
  isPaymentLive: boolean;
  generatedAt: string;
}
