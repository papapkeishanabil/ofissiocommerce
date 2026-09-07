import type { PaymentStatus } from "@/features/payment/payment.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";

export const DOCUMENT_TYPES = [
  "quotation_pdf",
  "invoice_pdf",
  "embroidery_work_order_pdf",
  "production_work_order_pdf",
  "design_approval_sheet_pdf",
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
  "embroidery_work_order_ofissio",
  "production_work_order_ofissio",
  "design_approval_sheet_ofissio",
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

export interface GenerateEmbroideryWorkOrderPdfInput {
  processOrderId: string;
  templateId?: DocumentTemplateId;
  forceRegenerate?: boolean;
  actorId: string;
  request?: Request;
}

export interface GenerateProductionWorkOrderPdfInput {
  processOrderId: string;
  templateId?: DocumentTemplateId;
  forceRegenerate?: boolean;
  actorId: string;
  request?: Request;
}

export interface GenerateDesignApprovalSheetPdfInput {
  quotationId: string;
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

export interface EmbroideryWorkOrderPdfPlacement {
  zone: string;
  technique: string;
  logoFileName: string | null;
  widthCm: number;
  heightCm: number;
  rotation: number;
  notes: string | null;
}

export interface EmbroideryWorkOrderPdfItem {
  productName: string;
  sku: string;
  selectedColor: string;
  totalQty: number;
  sizeSummary: string;
  instruction: string | null;
  placements: EmbroideryWorkOrderPdfPlacement[];
}

export interface EmbroideryWorkOrderPdfData {
  workOrderNumber: string;
  processOrderNumber: string;
  orderNumber: string;
  quotationNumber: string | null;
  companyName: string;
  createdAt: string;
  deadline: string | null;
  priority: string;
  assignedTeam: string | null;
  items: EmbroideryWorkOrderPdfItem[];
  notes: string | null;
  locationLabel: string;
  signerName: string;
  signerTitle: string;
  contactTel: string;
  contactWeb: string;
  contactEmail: string;
  generatedAt: string;
}

export interface ProductionWorkOrderPdfData extends EmbroideryWorkOrderPdfData {
  projectName: string;
  garmentType: string;
  usageContext: string | null;
  designDescription: string;
  materialPreference: string | null;
  colorPreference: string | null;
  sizeNotes: string | null;
  targetDate: string | null;
  approvalStatus: string;
  revisionNote: string | null;
  technicalSpecifications: Array<{ label: string; value: string }>;
  referenceFiles: Array<{ label: string; fileName: string }>;
}

// --- Lembar Approval Desain (A4 landscape, 1 halaman per garment) -----------

export interface DesignApprovalSheetFigure {
  side: "front" | "back";
  /** Bytes foto mockup (JPEG baseline / PNG depth-8) di-resolve server-side. */
  bytes: Uint8Array | null;
  fileName: string | null;
}

export interface DesignApprovalSheetArea {
  label: string;
  zone: string;
  zoneLabel: string;
  techniqueLabel: string;
  positionNote: string | null;
  widthCm: number;
  heightCm: number;
  offsetXCm: number | null;
  offsetYCm: number | null;
  logoFileName: string | null;
  notes: string | null;
}

export interface DesignApprovalSheetSizeRow {
  group: string;
  cells: Array<{ size: string; quantity: number }>;
  total: number;
}

export interface DesignApprovalSheetGarment {
  itemCode: string;
  garmentType: string;
  projectName: string;
  clientLabel: string;
  poNumber: string | null;
  deadline: string | null;
  totalQuantity: number;
  materialLabel: string | null;
  colorLabel: string | null;
  sizeNotes: string | null;
  specifications: Array<{
    label: string;
    value: string;
    measurements: string | null;
    status: string;
  }>;
  areas: DesignApprovalSheetArea[];
  allSizes: string[];
  sizeRows: DesignApprovalSheetSizeRow[];
  adjustments: Array<{
    size: string;
    color: string | null;
    changeNote: string;
    quantity: number;
  }>;
  figures: {
    front: DesignApprovalSheetFigure | null;
    back: DesignApprovalSheetFigure | null;
  };
}

export interface DesignApprovalSheetSignature {
  party: "design" | "customer" | "production";
  signerName: string;
  signerTitle: string;
  signedAt: string | null;
}

export interface DesignApprovalSheetPdfData {
  documentNumber: string;
  quotationNumber: string | null;
  projectName: string;
  clientName: string;
  clientCompany: string;
  /** No. PO klien — dipetakan dari brief.externalReference. */
  poNumber: string | null;
  deadline: string | null;
  revisionNo: number;
  revisedAt: string | null;
  approvalStatus: string;
  createdAt: string;
  generatedAt: string;
  garments: DesignApprovalSheetGarment[];
  signatures: DesignApprovalSheetSignature[];
  consentText: string;
  productionNotes: string | null;
  locationLabel: string;
  contactTel: string;
  contactWeb: string;
  contactEmail: string;
  rendererVersion: string;
}
