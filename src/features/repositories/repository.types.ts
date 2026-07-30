import type { AuditEvent } from "@/lib/security/security.types";
import type { SizeMatrix } from "@/types/industry";
import type { UploadedFile } from "@/features/storage/storage.types";
import type { UploadedFileListFilter, StorageFileStatus } from "@/features/storage/storage.types";
import type { CompanyLogoRegistration } from "@/features/company-assets/company-assets.types";
import type { EmailLog, EmailStatus } from "@/features/email/email.types";
import type {
  QuotationEventRecord,
  QuotationPricingInput,
  QuotationRequestRecord,
  QuotationStatus,
} from "@/features/quotation/quotation.types";
import type { PaymentOrderRecord, PaymentRecord, PaymentStatus } from "@/features/payment/payment.types";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import type {
  ProcessOrder,
  ProcessOrderEvent,
  ProcessOrderItem,
  ProcessOrderListFilter,
  ProcessOrderPatch,
  ProcessOrderTask,
  ProcessTaskStatus,
} from "@/features/process-orders/process-order.types";

export type RepositoryProvider = "mock" | "supabase" | "postgres";

export interface CompanyRepository {
  getCompanyById(companyId: string): Promise<unknown | null>;
  listAll?(): Promise<unknown[]>;
}

export interface UserCompanyRepository {
  getCompanyUser(input: {
    companyId: string;
    userId: string;
  }): Promise<unknown | null>;
  listAll?(): Promise<unknown[]>;
}

export interface CartRepository {
  getActiveCart(input: { companyId: string; userId: string }): Promise<unknown | null>;
  saveCart(input: { companyId: string; userId: string; items: unknown[] }): Promise<unknown>;
}

export interface OrderRepository {
  saveOrder?(input: { paymentOrder: PaymentOrderRecord }): Promise<void>;
  getOrderById(input: { companyId: string; orderId: string }): Promise<PaymentOrderRecord | null>;
  listOrdersByCompany(companyId: string): Promise<PaymentOrderRecord[]>;
  listAll?(): Promise<PaymentOrderRecord[]>;
  updateOrderAfterPayment?(
    input: { companyId: string; orderId: string; status: PaymentOrderRecord["status"] },
  ): Promise<PaymentOrderRecord | null>;
  updateOrderWooSync?(
    input: {
      companyId: string;
      orderId: string;
      patch: Pick<
        PaymentOrderRecord,
        | "wooOrderId"
        | "wooOrderNumber"
        | "wooSyncStatus"
        | "wooSyncError"
        | "wooSyncedAt"
        | "woocommerceOrderId"
        | "orderSyncStatus"
      >;
    },
  ): Promise<PaymentOrderRecord | null>;
  updateOrderProcess?(
    input: {
      companyId: string;
      orderId: string;
      patch: Pick<
        PaymentOrderRecord,
        | "processRoute"
        | "processStatus"
        | "replenishmentStatus"
        | "hasCustomization"
        | "customizationType"
        | "processRouteReason"
      >;
    },
  ): Promise<PaymentOrderRecord | null>;
}

export interface PaymentRepository {
  savePayment?(input: { payment: PaymentRecord; order: PaymentOrderRecord }): Promise<void>;
  getPaymentById(input: { companyId: string; paymentId: string }): Promise<PaymentRecord | null>;
  getPaymentByReference(referenceId: string): Promise<PaymentRecord | null>;
  updatePaymentStatus?(
    input: { companyId: string; paymentId: string; status: PaymentStatus; rawProviderResponse?: unknown },
  ): Promise<PaymentRecord | null>;
}

export interface TrackingRepository {
  upsertTrackingOrder?(order: CustomerTrackingOrder): Promise<CustomerTrackingOrder>;
  getTrackingByOrderId(input: { companyId: string; orderId: string }): Promise<CustomerTrackingOrder | null>;
  listTrackingByCompany(companyId: string): Promise<CustomerTrackingOrder[]>;
  listAll?(): Promise<CustomerTrackingOrder[]>;
}

export interface AuditLogRepository {
  writeAuditLog(event: AuditEvent): Promise<void>;
  listAll?(): Promise<AuditEvent[]>;
}

export interface UploadedFileRepository {
  save(file: UploadedFile): Promise<UploadedFile>;
  getFileById(input: { companyId: string; fileId: string }): Promise<UploadedFile | null>;
  listFilesByCompany(companyId: string, filter?: UploadedFileListFilter): Promise<UploadedFile[]>;
  listAll?(filter?: UploadedFileListFilter): Promise<UploadedFile[]>;
  update(fileId: string, patch: Partial<UploadedFile>): Promise<UploadedFile | null>;
  setStatus(fileId: string, status: StorageFileStatus): Promise<UploadedFile | null>;
}

export interface CompanyLogoRepository {
  create(input: { companyId: string; fileId: string; label: string }): Promise<CompanyLogoRegistration>;
  listByCompany(companyId: string): Promise<CompanyLogoRegistration[]>;
  getById(input: { companyId: string; logoId: string }): Promise<CompanyLogoRegistration | null>;
  softDelete(input: { companyId: string; logoId: string }): Promise<CompanyLogoRegistration | null>;
}

export interface QuotationRepository {
  save(record: QuotationRequestRecord): Promise<QuotationRequestRecord>;
  update(id: string, patch: Partial<QuotationRequestRecord>): Promise<QuotationRequestRecord | null>;
  getById(id: string): Promise<QuotationRequestRecord | null>;
  getByNumber?(quotationNumber: string): Promise<QuotationRequestRecord | null>;
  listByCompany(companyId: string): Promise<QuotationRequestRecord[]>;
  listAll(): Promise<QuotationRequestRecord[]>;
  updateStatus?(
    id: string,
    status: QuotationStatus,
    patch?: Partial<QuotationRequestRecord>,
  ): Promise<QuotationRequestRecord | null>;
  updatePricing?(
    id: string,
    pricing: QuotationPricingInput,
  ): Promise<QuotationRequestRecord | null>;
  addInternalNote?(
    id: string,
    note: QuotationRequestRecord["internalNotes"][number],
  ): Promise<QuotationRequestRecord | null>;
  addEvent?(event: QuotationEventRecord): Promise<QuotationEventRecord>;
  getEvents?(quotationId: string): Promise<QuotationEventRecord[]>;
  accept?(id: string, actorId: string | null): Promise<QuotationRequestRecord | null>;
  reject?(id: string, actorId: string | null, note?: string | null): Promise<QuotationRequestRecord | null>;
  markConverted?(id: string, orderId: string): Promise<QuotationRequestRecord | null>;
}

export interface EmailLogRepository {
  save(log: EmailLog): Promise<EmailLog>;
  update(id: string, patch: Partial<EmailLog>): Promise<EmailLog | null>;
  setStatus(input: {
    id: string;
    status: EmailStatus;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: string | null;
  }): Promise<EmailLog | null>;
  listByCompany(companyId: string): Promise<EmailLog[]>;
  listAll(): Promise<EmailLog[]>;
}

export interface ProcessOrderRepository {
  createProcessOrder(input: { processOrder: ProcessOrder }): Promise<ProcessOrder>;
  createProcessOrderItems(input: {
    processOrderId: string;
    items: ProcessOrderItem[];
  }): Promise<ProcessOrderItem[]>;
  createProcessOrderTasks(input: {
    processOrderId: string;
    tasks: ProcessOrderTask[];
  }): Promise<ProcessOrderTask[]>;
  listProcessOrders(input?: ProcessOrderListFilter): Promise<ProcessOrder[]>;
  getProcessOrderById(input: {
    processOrderId: string;
    companyId?: string;
  }): Promise<ProcessOrder | null>;
  getProcessOrderByOrderId(input: {
    ofissioOrderId: string;
    companyId?: string;
  }): Promise<ProcessOrder | null>;
  updateProcessOrder(input: {
    processOrderId: string;
    companyId?: string;
    patch: ProcessOrderPatch & {
      progress?: number;
      completedAt?: string | null;
    };
  }): Promise<ProcessOrder | null>;
  updateTaskStatus(input: {
    processOrderId: string;
    taskId: string;
    companyId?: string;
    status: ProcessTaskStatus;
    notes?: string | null;
  }): Promise<ProcessOrderTask | null>;
  addProcessOrderEvent(input: { event: ProcessOrderEvent }): Promise<ProcessOrderEvent>;
  listProcessOrderEvents(input: {
    processOrderId: string;
    companyId?: string;
  }): Promise<ProcessOrderEvent[]>;
  listProcessOrderTasks(input: {
    processOrderId: string;
    companyId?: string;
  }): Promise<ProcessOrderTask[]>;
  listProcessOrderItems(input: {
    processOrderId: string;
    companyId?: string;
  }): Promise<ProcessOrderItem[]>;
}

export interface RepositoryRegistry {
  provider: RepositoryProvider;
  company: CompanyRepository;
  companyUsers: UserCompanyRepository;
  carts: CartRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
  tracking: TrackingRepository;
  auditLogs: AuditLogRepository;
  uploadedFiles: UploadedFileRepository;
  companyLogos: CompanyLogoRepository;
  quotations: QuotationRepository;
  emailLogs: EmailLogRepository;
  processOrders: ProcessOrderRepository;
}

export interface PersistedSizeMatrix {
  sizeMatrix: SizeMatrix;
}
