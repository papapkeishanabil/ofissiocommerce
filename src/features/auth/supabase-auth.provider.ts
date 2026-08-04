import "server-only";

import { getAuthRuntimeConfig } from "./auth.config";
import {
  TRUSTED_AUTH_HEADER,
  TRUSTED_AUTH_KIND_HEADER,
} from "./auth.constants";
import { CUSTOMER_ROLES, type CustomerRole } from "@/lib/security/security.types";
import type {
  AuthProviderAdapter,
  AuthSession,
  AuthSessionHint,
} from "./auth.types";

export const supabaseAuthProvider: AuthProviderAdapter = {
  name: "supabase",

  getCurrentSession(
    request?: Request,
    _hint: AuthSessionHint = {},
  ): AuthSession | null {
    const config = getAuthRuntimeConfig();
    if (!config.supabase.isConfigured) return null;

    if (!request) return null;
    if (request.headers.get(TRUSTED_AUTH_HEADER) !== "1") return null;
    if (request.headers.get(TRUSTED_AUTH_KIND_HEADER) !== "customer") return null;

    const userId = request.headers.get("x-ofissio-user-id")?.trim();
    const companyId = request.headers.get("x-ofissio-company-id")?.trim();
    const roleValue = request.headers.get("x-ofissio-role")?.trim();
    if (
      !userId ||
      !companyId ||
      !CUSTOMER_ROLES.includes(roleValue as CustomerRole)
    ) {
      return null;
    }

    return {
      userId,
      companyId,
      companyName: request.headers.get("x-ofissio-company-name")?.trim() || null,
      email: request.headers.get("x-ofissio-user-email")?.trim() || null,
      name: request.headers.get("x-ofissio-user-name")?.trim() || null,
      role: roleValue as CustomerRole,
      provider: "supabase",
    };
  },

  signInPlaceholder() {
    throw new Error("Supabase sign-in belum diaktifkan pada Phase 11.");
  },

  signOutPlaceholder() {
    throw new Error("Supabase sign-out belum diaktifkan pada Phase 11.");
  },
};
