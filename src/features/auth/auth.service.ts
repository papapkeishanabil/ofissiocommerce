import "server-only";

import type { CustomerPermission } from "@/lib/security/security.types";
import { CUSTOMER_PERMISSION_MAP } from "@/lib/security/role-guard";
import { createApiError } from "@/lib/security/safe-error-response";

import { getAuthRuntimeConfig } from "./auth.config";
import { mockAuthProvider } from "./mock-auth.provider";
import { supabaseAuthProvider } from "./supabase-auth.provider";
import type { AuthSession, AuthSessionHint } from "./auth.types";

function activeProvider() {
  return getAuthRuntimeConfig().provider === "supabase"
    ? supabaseAuthProvider
    : mockAuthProvider;
}

export function getCurrentSession(
  request?: Request,
  hint: AuthSessionHint = {},
): AuthSession | null {
  const provider = activeProvider();
  const result = provider.getCurrentSession(request, hint);
  if (result instanceof Promise) {
    throw new Error("Async auth provider belum didukung oleh sync API guards.");
  }
  return result;
}

export function getCurrentUser(request?: Request, hint: AuthSessionHint = {}) {
  const session = getCurrentSession(request, hint);
  return session
    ? {
        id: session.userId,
        email: session.email,
        name: session.name,
      }
    : null;
}

export function getCurrentCompany(
  request?: Request,
  hint: AuthSessionHint = {},
) {
  const session = getCurrentSession(request, hint);
  return session
    ? {
        id: session.companyId,
        name: session.companyName,
      }
    : null;
}

export function requireUser(
  request?: Request,
  hint: AuthSessionHint = {},
): AuthSession {
  const session = getCurrentSession(request, hint);
  if (!session) {
    throw createApiError("UNAUTHORIZED", "Sesi pengguna belum valid.", 401);
  }
  return session;
}

export function requireCompanyUser(
  request?: Request,
  hint: AuthSessionHint = {},
): AuthSession {
  const session = requireUser(request, hint);
  if (!session.companyId) {
    throw createApiError("UNAUTHORIZED", "Sesi company belum valid.", 401);
  }
  return session;
}

export function switchCompany(_companyId: string): never {
  throw new Error("Switch company belum diaktifkan pada Phase 11.");
}

export function getUserRoles(session: AuthSession) {
  return [session.role];
}

export function hasPermission(
  session: AuthSession,
  permission: CustomerPermission,
) {
  return CUSTOMER_PERMISSION_MAP[session.role]?.includes(permission) ?? false;
}

export function signInPlaceholder(): never {
  throw new Error("Production sign-in belum diaktifkan pada Phase 11.");
}

export function signOutPlaceholder(): never {
  throw new Error("Production sign-out belum diaktifkan pada Phase 11.");
}
