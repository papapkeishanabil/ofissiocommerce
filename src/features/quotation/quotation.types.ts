import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { EmailSendResult, EmailStatus } from "@/features/email/email.types";
import type {
  OrderProcessRoute,
  WooOrderSyncStatus,
} from "@/features/orders/order.types";
import type {
  EmbroideryTechnique,
  EmbroideryZone,
} from "@/types/uniform-3d";

export type QuotationRequirementType =
  | "standard_product"
  | "standard_customization"
  | "custom_production";

export type QuotationSource = "web_cart" | "custom_request";

export type EmbroideryEstimateStatus =
  | "not_required"
  | "waiting_consultation"
  | "estimate_ready"
  | "sent_to_customer";

export interface EmbroideryConsultationEstimate {
  status: EmbroideryEstimateStatus;
  complexity: "easy" | "medium" | "hard";
  estimatedStitchCount: number | null;
  supervisorName: string;
  supervisorNotes: string | null;
  estimatedStartDate: string;
  estimatedCompletionDate: string;
  qcPackingDays: number;
  estimatedHandoverDate: string;
  courierCode: string;
  courierService: string;
  courierDurationMinDays: number;
  courierDurationMaxDays: number;
  estimatedArrivalStart: string;
  estimatedArrivalEnd: string;
  validUntil: string;
  estimatedBy: string;
  estimatedAt: string;
}

export type ProductionPlanStatus =
  | "waiting_consultation"
  | "plan_ready"
  | "sent_to_customer";

export interface ProductionPlan {
  status: ProductionPlanStatus;
  ppicName: string;
  productionNotes: string | null;
  estimatedStartDate: string;
  materialReadyDate: string;
  cuttingStartDate: string;
  sewingStartDate: string;
  estimatedCompletionDate: string;
  qcPackingDays: number;
  estimatedHandoverDate: string;
  depositPercent: number;
  depositAmount: number;
  balanceAmount: number;
  balanceDueStage: "after_production_before_shipping";
  courierCode: string;
  courierService: string;
  courierDurationMinDays: number;
  courierDurationMaxDays: number;
  estimatedArrivalStart: string;
  estimatedArrivalEnd: string;
  validUntil: string;
  plannedBy: string;
  plannedAt: string;
}

export interface ProductionReferenceFile {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export const CUSTOM_REQUEST_INTAKE_CHANNELS = [
  "customer_portal",
  "whatsapp",
  "phone",
  "email",
  "customer_visit",
  "other",
] as const;

export type CustomRequestIntakeChannel =
  (typeof CUSTOM_REQUEST_INTAKE_CHANNELS)[number];

export const CUSTOM_BRIEF_APPROVAL_STATUSES = [
  "not_required",
  "pending_customer_approval",
  "approved",
  "revision_requested",
] as const;

export type CustomBriefApprovalStatus =
  (typeof CUSTOM_BRIEF_APPROVAL_STATUSES)[number];

export const BRIEF_GENDERS = [
  "men",
  "women",
  "custom",
  "unspecified",
] as const;

export type BriefGender = (typeof BRIEF_GENDERS)[number];

export const TECHNICAL_GARMENT_CATEGORIES = [
  "upper",
  "lower",
  "overall",
  "other",
] as const;

export type TechnicalGarmentCategory =
  (typeof TECHNICAL_GARMENT_CATEGORIES)[number];

export const TECHNICAL_SPEC_STATUSES = [
  "specified",
  "not_used",
  "recommendation",
] as const;

export type TechnicalSpecStatus =
  (typeof TECHNICAL_SPEC_STATUSES)[number];

export interface TechnicalSpecificationValue {
  key: string;
  label: string;
  status: TechnicalSpecStatus;
  option: string | null;
  detail: string | null;
  notes: string | null;
  /** Kolom "Ukuran" di lembar approval desain (mis. "Lingkar dada 108 cm"). */
  measurements?: string | null;
}

export interface TechnicalSizeQuantity {
  size: string;
  quantity: number;
  /** Breakdown Pria/Wanita/Custom untuk jumlah per ukuran. */
  gender?: BriefGender;
}

/**
 * Area bordir/logo pada satu garment untuk lembar approval desain.
 * Satu zona hanya boleh dipakai satu area (dijaga oleh validasi service).
 */
export interface TechnicalEmbroideryArea {
  /** Label singkat di lembar approval, mis. "A", "B", "C". */
  label: string;
  zone: EmbroideryZone;
  positionNote: string | null;
  offsetXCm: number | null;
  offsetYCm: number | null;
  widthCm: number;
  heightCm: number;
  technique: EmbroideryTechnique;
  logoFileId: string | null;
  logoFileName: string | null;
  notes: string | null;
}

export interface TechnicalGarmentSpecification {
  id: string;
  category: TechnicalGarmentCategory;
  garmentType: string;
  templateKey: string | null;
  quantity: number;
  specifications: TechnicalSpecificationValue[];
  sizeBreakdown: TechnicalSizeQuantity[];
  /** Area bordir maksimal 6, satu per zona. */
  embroideryAreas?: TechnicalEmbroideryArea[];
  /** Foto mockup garment (tampak depan/belakang) untuk lembar approval. */
  figureFrontFileId?: string | null;
  figureBackFileId?: string | null;
}

/** Baris "Catatan custom" di lembar approval desain. */
export interface BriefCustomAdjustment {
  id: string;
  size: string;
  color: string | null;
  changeNote: string;
  quantity: number;
}

export const BRIEF_SIGNATURE_PARTIES = [
  "design",
  "customer",
  "production",
] as const;

export type BriefSignatureParty = (typeof BRIEF_SIGNATURE_PARTIES)[number];

/**
 * Tanda tangan digital lembar approval: klik portal + identitas penandatangan.
 * Customer wajib mencentang klausa persetujuan (consentText tersimpan).
 */
export interface BriefSignature {
  party: BriefSignatureParty;
  signerName: string;
  signerTitle: string;
  signerUserId: string | null;
  method: "portal_click";
  consentText: string | null;
  signedAt: string;
  revokedAt: string | null;
  revisionNo: number;
}

/**
 * Salinan permintaan awal customer (portal) sebelum diperkaya sales menjadi
 * brief teknis — dipakai sebagai pembanding di halaman approval.
 */
export interface BriefCustomerRequestSnapshot {
  projectName: string | null;
  garmentType: string | null;
  estimatedQuantity: number | null;
  usageContext: string | null;
  designDescription: string;
  materialPreference: string | null;
  colorPreference: string | null;
  sizeNotes: string | null;
  targetDate: string | null;
  referenceFiles: Array<{ fileId: string; fileName: string }>;
  capturedAt: string;
}

export interface ProductionRequestBrief {
  projectName?: string | null;
  garmentType?: string | null;
  estimatedQuantity?: number | null;
  usageContext?: string | null;
  designDescription: string;
  materialPreference: string | null;
  colorPreference: string | null;
  sizeNotes: string | null;
  targetDate: string | null;
  referenceFiles?: ProductionReferenceFile[];
  intakeChannel?: CustomRequestIntakeChannel;
  externalReference?: string | null;
  technicalSpecifications?: TechnicalGarmentSpecification[];
  approvalStatus?: CustomBriefApprovalStatus;
  approvalRequestedAt?: string | null;
  approvedAt?: string | null;
  approvalRevisionNote?: string | null;
  /** Nomor revisi brief (0 = awal; naik tiap request_revision). */
  revisionNo?: number;
  revisedAt?: string | null;
  /** Penyesuaian custom per ukuran/warna untuk "Catatan custom". */
  customAdjustments?: BriefCustomAdjustment[];
  /** Tanda tangan digital multi-pihak (design/customer/production). */
  signatures?: BriefSignature[];
  /** Waktu sales mengambil alih brief portal menjadi brief teknis. */
  enrichedAt?: string | null;
  enrichedByUserId?: string | null;
  /** Permintaan awal customer sebelum pengayaan (diperoleh saat takeover). */
  customerRequestSnapshot?: BriefCustomerRequestSnapshot | null;
}

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
  taxEnabled?: boolean;
  taxRate?: number;
  taxLabel?: string;
  /** Legacy manual amount. New admin flows send taxEnabled + taxRate. */
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
  source: QuotationSource;
  items: QuotationItemRecord[];
  subtotalEstimate: number;
  internalNotes: QuotationNote[];
  salesNotes: string | null;
  customerMessage: string | null;
  subtotal: number | null;
  discountTotal: number;
  couponCode?: string | null;
  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  taxTotal: number;
  shippingEstimate: number;
  grandTotal: number | null;
  currency: "IDR";
  validUntil: string | null;
  salesEmail: string | null;
  customerEmail: string | null;
  totalQty: number;
  embroideryPointCount: number;
  requirementType: QuotationRequirementType;
  requestedProcessRoute: OrderProcessRoute;
  productionBrief: ProductionRequestBrief | null;
  productionPlan?: ProductionPlan | null;
  embroideryEstimate?: EmbroideryConsultationEstimate | null;
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
  requirementType?: QuotationRequirementType;
  productionBrief?: ProductionRequestBrief | null;
  customerNotes: string | null;
  shippingDestination: string | null;
  couponCode?: string | null;
  items: Array<{
    productId: string;
    selectedColor: string;
    selectedSleeve?: string;
  selectedOptions?: Record<string, string>;
    sizeMatrix: Record<string, number>;
    customization: string | null;
    embroideryPlacements: unknown[];
  }>;
}

export interface CreateCustomQuotationRequestInput {
  companyId: string;
  companyName: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  picName: string | null;
  picEmail: string | null;
  picWhatsapp: string | null;
  productionBrief: ProductionRequestBrief;
  referenceFileIds: string[];
  customerNotes: string | null;
  actorType?: "customer" | "internal";
  sendCustomerConfirmation?: boolean;
  /** Sales-assisted: minta ttd customer (default) atau buat tanpa persetujuan formal (repeat order). */
  requireCustomerApproval?: boolean;
}

export interface CreateQuotationRequestResult {
  quotation: QuotationRequestRecord;
  emails: EmailSendResult[];
}
