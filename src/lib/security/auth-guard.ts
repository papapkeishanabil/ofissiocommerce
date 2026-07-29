import "server-only";

import {
  INTERNAL_ROLES,
  type InternalRole,
  type MockSession,
} from "./security.types";
import {
  getCurrentSession,
  requireCompanyUser,
} from "@/features/auth/auth.service";
import type { AuthSessionHint } from "@/features/auth/auth.types";
import { createApiError } from "./safe-error-response";

export function getCurrentUserMock(
  request?: Request,
  hint: AuthSessionHint = {},
): MockSession | null {
  return getCurrentSession(request, hint);
}

export function requireMockSession(
  request?: Request,
  hint: AuthSessionHint = {},
) {
  const session = getCurrentUserMock(request, hint);
  if (!session) {
    throw createApiError(
      "UNAUTHORIZED",
      "Sesi mock belum valid. Kirim companyId dan userId dari sesi customer.",
      401,
    );
  }
  return session;
}

export function requireAuth(request?: Request, hint: AuthSessionHint = {}) {
  return requireCompanyUser(request, hint);
}

export function requireAdminPlaceholder(request?: Request) {
  const role = request?.headers.get("x-ofissio-internal-role")?.trim();
  if (!role || !INTERNAL_ROLES.includes(role as InternalRole)) {
    throw createApiError("FORBIDDEN", "Akses admin internal belum tersedia.", 403);
  }
  return {
    actorType: "internal" as const,
    role: role as InternalRole,
    actorId: request?.headers.get("x-ofissio-internal-user-id") ?? "internal-dev",
  };
}
