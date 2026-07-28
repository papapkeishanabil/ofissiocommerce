import "server-only";

import { createApiError } from "./safe-error-response";
import type {
  CustomerPermission,
  CustomerRole,
  InternalPermission,
  InternalRole,
  MockSession,
} from "./security.types";

export const CUSTOMER_PERMISSION_MAP: Record<CustomerRole, CustomerPermission[]> = {
  company_admin: [
    "artwork:approve",
    "cart:write",
    "checkout:create",
    "order:view",
    "payment:view",
    "quotation:create",
  ],
  purchasing: ["cart:write", "checkout:create", "order:view", "quotation:create"],
  approver: ["artwork:approve", "order:view", "quotation:create"],
  finance: ["order:view", "payment:view"],
  viewer: ["order:view"],
};

export const INTERNAL_PERMISSION_MAP: Record<InternalRole, InternalPermission[]> = {
  super_admin: [
    "admin:all",
    "payment:review",
    "product:manage",
    "production:update",
    "shipping:update",
    "support:view",
  ],
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
