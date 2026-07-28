import "server-only";

import {
  CUSTOMER_ROLES,
  INTERNAL_ROLES,
  type CustomerRole,
  type InternalRole,
  type MockSession,
} from "./security.types";
import { createApiError } from "./safe-error-response";

interface MockSessionHint {
  companyId?: string | null;
  userId?: string | null;
  role?: string | null;
}

export function getCurrentUserMock(
  request?: Request,
  hint: MockSessionHint = {},
): MockSession | null {
  const companyId =
    hint.companyId?.trim() ||
    request?.headers.get("x-ofissio-company-id")?.trim() ||
    null;
  const userId =
    hint.userId?.trim() ||
    request?.headers.get("x-ofissio-user-id")?.trim() ||
    null;
  const roleCandidate =
    hint.role?.trim() || request?.headers.get("x-ofissio-role")?.trim() || "company_admin";
  const role = CUSTOMER_ROLES.includes(roleCandidate as CustomerRole)
    ? (roleCandidate as CustomerRole)
    : "viewer";

  if (!companyId || !userId) return null;
  return { companyId, userId, role };
}

export function requireMockSession(
  request?: Request,
  hint: MockSessionHint = {},
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

export function requireAuth(request?: Request, hint: MockSessionHint = {}) {
  // TODO Phase production: replace this placeholder with server session/JWT
  // verification from the real auth provider. Do not trust client-supplied
  // companyId/userId outside local mock mode.
  return requireMockSession(request, hint);
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
