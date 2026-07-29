import "server-only";

import {
  CUSTOMER_ROLES,
  type CustomerRole,
} from "@/lib/security/security.types";

import type {
  AuthProviderAdapter,
  AuthSession,
  AuthSessionHint,
} from "./auth.types";

function normalizeRole(value?: string | null): CustomerRole {
  return CUSTOMER_ROLES.includes(value as CustomerRole)
    ? (value as CustomerRole)
    : "company_admin";
}

export const mockAuthProvider: AuthProviderAdapter = {
  name: "mock",

  getCurrentSession(request?: Request, hint: AuthSessionHint = {}): AuthSession | null {
    const companyId =
      hint.companyId?.trim() ||
      request?.headers.get("x-ofissio-company-id")?.trim() ||
      null;
    const userId =
      hint.userId?.trim() ||
      request?.headers.get("x-ofissio-user-id")?.trim() ||
      null;

    if (!companyId || !userId) return null;

    return {
      userId,
      companyId,
      companyName:
        hint.companyName?.trim() ||
        request?.headers.get("x-ofissio-company-name")?.trim() ||
        null,
      email:
        hint.email?.trim() ||
        request?.headers.get("x-ofissio-user-email")?.trim() ||
        null,
      name:
        hint.name?.trim() ||
        request?.headers.get("x-ofissio-user-name")?.trim() ||
        null,
      role: normalizeRole(
        hint.role?.trim() || request?.headers.get("x-ofissio-role")?.trim(),
      ),
      provider: "mock",
    };
  },

  signInPlaceholder() {
    throw new Error("Mock sign-in tetap dikelola oleh client auth store Phase 1.");
  },

  signOutPlaceholder() {
    throw new Error("Mock sign-out tetap dikelola oleh client auth store Phase 1.");
  },
};
