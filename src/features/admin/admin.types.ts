import type { InternalRole } from "@/lib/security/security.types";
import type {
  QuotationEventRecord,
  QuotationRequestRecord,
  QuotationStatus,
} from "@/features/quotation/quotation.types";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import type { UploadedFile } from "@/features/storage/storage.types";
import type { AuditEvent } from "@/lib/security/security.types";

export type AdminPermission =
  | "admin:view"
  | "admin:quotation:view"
  | "admin:quotation:update"
  | "admin:order:view"
  | "admin:tracking:view"
  | "admin:tracking:update"
  | "admin:upload:view"
  | "admin:customer:view"
  | "admin:audit:view";

export interface InternalAdminUser {
  id: string;
  name: string;
  role: InternalRole;
  isMock: boolean;
}

export interface AdminSummary {
  totalQuotations: number;
  quotationsUnderReview: number;
  quotationsQuoted: number;
  quotationsAccepted: number;
  quotationsEmailedOrMocked: number;
  activeOrders: number;
  ordersInProduction: number;
  uploadedFiles: number;
  trackingNeedsAttention: number;
  recentActivity: AuditEvent[];
}

export interface AdminQuotationRow {
  id: string;
  quotationNumber: string;
  companyId: string;
  companyName: string;
  picName: string;
  picEmail: string | null;
  status: QuotationStatus;
  emailStatus: string;
  itemCount: number;
  totalQty: number;
  createdAt: string;
}

export interface AdminLogoPreview {
  fileId: string;
  signedUrl: string | null;
  unavailable: boolean;
}

export interface AdminQuotationDetail {
  quotation: QuotationRequestRecord;
  logoPreviews: AdminLogoPreview[];
  events: QuotationEventRecord[];
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
  paymentStatus: string;
  orderStatus: PaymentOrderRecord["status"] | string;
  fulfillmentType: string;
  trackingStatus: string;
  progress: number;
  createdAt: string;
  wooOrderId: string | null;
}

export interface AdminOrderDetail {
  order: PaymentOrderRecord;
  tracking: CustomerTrackingOrder | null;
}

export interface AdminUploadRow {
  id: string;
  companyId: string;
  fileType: UploadedFile["fileType"];
  originalFilename: string;
  safeFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: UploadedFile["status"];
  createdAt: string;
  signedUrlAvailable: boolean;
}

export interface AdminTrackingRow {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
  currentStatus: string;
  nextStep: string | null;
  progress: number;
  updatedAt: string;
}

export interface AdminCustomerRow {
  companyId: string;
  companyName: string;
  industry: string | null;
  employeeCount: number | null;
  status: string;
  userCount: number;
  quotationCount: number;
  orderCount: number;
  createdAt: string | null;
}

export interface AdminCustomerDetail {
  customer: AdminCustomerRow;
  quotations: AdminQuotationRow[];
  orders: AdminOrderRow[];
  uploads: AdminUploadRow[];
}

export interface AdminAuditRow {
  id: string;
  createdAt: string;
  actorType: AuditEvent["actorType"];
  actorId: string | null;
  companyId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadataSummary: string;
}
