import type { AuditEvent } from "@/lib/security/security.types";
import type { SizeMatrix } from "@/types/industry";

export type RepositoryProvider = "mock" | "supabase" | "postgres";

export interface CompanyRepository {
  getCompanyById(companyId: string): Promise<unknown | null>;
}

export interface UserCompanyRepository {
  getCompanyUser(input: {
    companyId: string;
    userId: string;
  }): Promise<unknown | null>;
}

export interface CartRepository {
  getActiveCart(input: { companyId: string; userId: string }): Promise<unknown | null>;
  saveCart(input: { companyId: string; userId: string; items: unknown[] }): Promise<unknown>;
}

export interface OrderRepository {
  getOrderById(input: { companyId: string; orderId: string }): Promise<unknown | null>;
  listOrdersByCompany(companyId: string): Promise<unknown[]>;
}

export interface PaymentRepository {
  getPaymentById(input: { companyId: string; paymentId: string }): Promise<unknown | null>;
  getPaymentByReference(referenceId: string): Promise<unknown | null>;
}

export interface TrackingRepository {
  getTrackingByOrderId(input: { companyId: string; orderId: string }): Promise<unknown | null>;
  listTrackingByCompany(companyId: string): Promise<unknown[]>;
}

export interface AuditLogRepository {
  writeAuditLog(event: AuditEvent): Promise<void>;
}

export interface UploadedFileRepository {
  getFileById(input: { companyId: string; fileId: string }): Promise<unknown | null>;
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
}

export interface PersistedSizeMatrix {
  sizeMatrix: SizeMatrix;
}
