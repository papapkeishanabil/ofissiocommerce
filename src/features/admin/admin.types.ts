import type { InternalRole } from "@/lib/security/security.types";
import type {
  QuotationEventRecord,
  QuotationRequestRecord,
  QuotationStatus,
} from "@/features/quotation/quotation.types";
import type {
  PaymentEventRecord,
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import type {
  OrderCustomizationType,
  OrderProcessRoute,
  OrderProcessStatus,
  OrderReplenishmentStatus,
} from "@/features/orders/order.types";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import type { UploadedFile } from "@/features/storage/storage.types";
import type { EmailLog } from "@/features/email/email.types";
import type { DocumentRecord } from "@/features/documents/document.types";
import type { AuditEvent } from "@/lib/security/security.types";
import type { ProcessOrder, ProcessOrderDetail } from "@/features/process-orders/process-order.types";
import type {
  ShipmentDetail,
  ShipmentEventRecord,
  ShipmentProvider,
  ShipmentRecord,
  ShipmentStatus,
} from "@/features/shipments/shipment.types";

export type AdminPermission =
  | "admin:view"
  | "admin:quotation:view"
  | "admin:quotation:update"
  | "admin:order:view"
  | "admin:order:update"
  | "admin:process-order:view"
  | "admin:process-order:update"
  | "admin:shipment:view"
  | "admin:shipment:update"
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
  emailLogs: EmailLog[];
  documents: DocumentRecord[];
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
  paymentStatus: string;
  orderStatus: PaymentOrderRecord["status"] | string;
  fulfillmentType: string;
  processRoute: OrderProcessRoute;
  processStatus: OrderProcessStatus;
  replenishmentStatus: OrderReplenishmentStatus;
  hasCustomization: boolean;
  customizationType: OrderCustomizationType;
  processRouteReason: string;
  trackingStatus: string;
  progress: number;
  createdAt: string;
  wooOrderId: string | null;
  wooOrderNumber: string | null;
  wooSyncStatus: string;
  wooSyncError: string | null;
  wooSyncedAt: string | null;
}

export interface AdminOrderDetail {
  order: PaymentOrderRecord;
  tracking: CustomerTrackingOrder | null;
  processOrder: ProcessOrder | null;
  documents: DocumentRecord[];
  payment: PaymentRecord | null;
  paymentEvents: PaymentEventRecord[];
  shipments: ShipmentRecord[];
  shipmentEvents: ShipmentEventRecord[];
}

export interface AdminProcessOrderRow {
  id: string;
  processOrderNumber: string;
  orderNumber: string;
  ofissioOrderId: string;
  wooOrderId: string | null;
  quotationId: string | null;
  companyId: string;
  companyName: string;
  processRoute: OrderProcessRoute;
  processStatus: OrderProcessStatus;
  replenishmentStatus: OrderReplenishmentStatus;
  currentStage: string;
  progress: number;
  priority: string;
  deadline: string | null;
  assignedTeam: string | null;
  createdAt: string;
}

export interface AdminProcessOrderDetail extends ProcessOrderDetail {
  relatedOrderNumber: string;
  companyName: string;
  shipment: ShipmentRecord | null;
  shipmentEvents: ShipmentEventRecord[];
}

export interface AdminShipmentRow {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  processOrderId: string | null;
  companyId: string;
  companyName: string;
  provider: ShipmentProvider;
  service: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminShipmentDetail = ShipmentDetail;

export interface AdminUploadRow {
  id: string;
  companyId: string;
  fileType: UploadedFile["fileType"];
  originalFilename: string;
  safeFilename: string;
  storageProvider: UploadedFile["storageProvider"];
  storageBucket: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: UploadedFile["status"];
  scanStatus: UploadedFile["scanStatus"];
  sanitizedStatus: UploadedFile["sanitizedStatus"];
  createdAt: string;
  signedUrlAvailable: boolean;
  signedUrl: string | null;
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
