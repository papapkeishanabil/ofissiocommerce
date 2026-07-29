import type { AuditEvent } from "@/lib/security/security.types";
import type { SizeMatrix } from "@/types/industry";
import type { UploadedFile } from "@/features/storage/storage.types";
import type { UploadedFileListFilter, StorageFileStatus } from "@/features/storage/storage.types";
import type { CompanyLogoRegistration } from "@/features/company-assets/company-assets.types";
import type { EmailLog, EmailStatus } from "@/features/email/email.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { PaymentOrderRecord, PaymentRecord, PaymentStatus } from "@/features/payment/payment.types";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";

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
  listByCompany(companyId: string): Promise<QuotationRequestRecord[]>;
  listAll(): Promise<QuotationRequestRecord[]>;
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
}

export interface PersistedSizeMatrix {
  sizeMatrix: SizeMatrix;
}
