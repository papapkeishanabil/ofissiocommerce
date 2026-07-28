import type { CompanyRole } from "@/types/account";

export type CustomerRole = CompanyRole;

export const CUSTOMER_ROLES: readonly CustomerRole[] = [
  "company_admin",
  "purchasing",
  "approver",
  "finance",
  "viewer",
] as const;

export type InternalRole =
  | "super_admin"
  | "sales"
  | "finance_internal"
  | "product_admin"
  | "production_admin"
  | "ppic"
  | "qc"
  | "logistics"
  | "support";

export const INTERNAL_ROLES: readonly InternalRole[] = [
  "super_admin",
  "sales",
  "finance_internal",
  "product_admin",
  "production_admin",
  "ppic",
  "qc",
  "logistics",
  "support",
] as const;

export type CustomerPermission =
  | "cart:write"
  | "checkout:create"
  | "quotation:create"
  | "order:view"
  | "payment:view"
  | "artwork:approve";

export type InternalPermission =
  | "admin:all"
  | "product:manage"
  | "payment:review"
  | "production:update"
  | "shipping:update"
  | "support:view";

export interface SecurityActor {
  id: string | null;
  actorType: "customer" | "internal" | "system";
  companyId: string | null;
  role: CustomerRole | InternalRole | null;
}

export interface MockSession {
  userId: string;
  companyId: string;
  role: CustomerRole;
}

export type AuditActorType = "customer" | "internal" | "system";

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorType: AuditActorType;
  companyId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class SecurityApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly publicMessage: string,
    public readonly status: number,
    public readonly metadata: Record<string, unknown> = {},
  ) {
    super(publicMessage);
    this.name = "SecurityApiError";
  }
}
