import "server-only";

import { createApiError } from "./safe-error-response";
import type {
  CustomerPermission,
  CustomerRole,
  InternalPermission,
  InternalRole,
  MockSession,
} from "./security.types";
import type { StorageFileType } from "@/features/storage/storage.types";

export const CUSTOMER_PERMISSION_MAP: Record<CustomerRole, CustomerPermission[]> = {
  customer_admin: [
    "customer:dashboard:view",
    "customer:quotation:view",
    "customer:quotation:action",
    "customer:order:view",
    "customer:file:upload",
    "artwork:approve",
    "cart:write",
    "checkout:create",
    "company_logo:write",
    "file:view",
    "file:write",
    "order:view",
    "payment:view",
    "quotation:create",
  ],
  customer_user: [
    "customer:dashboard:view",
    "customer:quotation:view",
    "customer:quotation:action",
    "customer:order:view",
    "customer:file:upload",
    "cart:write",
    "checkout:create",
    "file:view",
    "file:write",
    "order:view",
    "payment:view",
    "quotation:create",
  ],
  company_admin: [
    "artwork:approve",
    "cart:write",
    "checkout:create",
    "company_logo:write",
    "file:view",
    "file:write",
    "order:view",
    "payment:view",
    "quotation:create",
  ],
  purchasing: [
    "cart:write",
    "checkout:create",
    "company_logo:write",
    "file:view",
    "file:write",
    "order:view",
    "quotation:create",
  ],
  approver: ["artwork:approve", "file:view", "order:view", "quotation:create"],
  finance: ["file:view", "order:view", "payment:view"],
  viewer: ["file:view", "order:view"],
};

export const INTERNAL_PERMISSION_MAP: Record<InternalRole, InternalPermission[]> = {
  super_admin: [
    "admin:access",
    "admin:all",
    "payment:review",
    "product:manage",
    "production:update",
    "shipping:update",
    "support:view",
  ],
  sales_admin: ["admin:access", "support:view"],
  finance_admin: ["admin:access", "payment:review", "support:view"],
  sales: ["support:view"],
  finance_internal: ["payment:review", "support:view"],
  product_admin: ["product:manage", "support:view"],
  production_admin: ["production:update", "support:view"],
  ppic: ["production:update", "support:view"],
  qc: ["production:update", "support:view"],
  logistics: ["shipping:update", "support:view"],
  support: ["support:view"],
};

export function requireRole(
  session: MockSession,
  permissions: CustomerPermission | CustomerPermission[],
) {
  const needed = Array.isArray(permissions) ? permissions : [permissions];
  const allowed = CUSTOMER_PERMISSION_MAP[session.role] ?? [];
  const ok = needed.every((permission) => allowed.includes(permission));
  if (!ok) {
    throw createApiError("FORBIDDEN", "Role Anda belum memiliki izin untuk aksi ini.", 403);
  }
  return session;
}

export function canManageCompanyLogo(role: CustomerRole) {
  return CUSTOMER_PERMISSION_MAP[role].includes("company_logo:write");
}

export function requireCompanyLogoWriteRole(session: MockSession) {
  return requireRole(session, "company_logo:write");
}

export function requireFileUploadRole(
  session: MockSession,
  fileType: StorageFileType,
) {
  if (fileType === "company_logo" || fileType === "embroidery_logo") {
    return requireCompanyLogoWriteRole(session);
  }
  return requireRole(session, "file:write");
}

export function rejectInternalAdminUploadWithoutRoute(request: Request) {
  if (request.headers.get("x-ofissio-internal-role")) {
    throw createApiError(
      "FORBIDDEN",
      "Upload logo atas nama customer harus melalui route admin khusus dengan companyId eksplisit.",
      403,
    );
  }
}

export function canCheckout(role: CustomerRole) {
  return CUSTOMER_PERMISSION_MAP[role].includes("checkout:create");
}

export function canViewPayment(role: CustomerRole) {
  return CUSTOMER_PERMISSION_MAP[role].includes("payment:view");
}

export function canViewOrder(role: CustomerRole) {
  return CUSTOMER_PERMISSION_MAP[role].includes("order:view");
}

export function canApproveArtwork(role: CustomerRole) {
  return CUSTOMER_PERMISSION_MAP[role].includes("artwork:approve");
}

export function canRequestQuotation(role: CustomerRole) {
  return CUSTOMER_PERMISSION_MAP[role].includes("quotation:create");
}
