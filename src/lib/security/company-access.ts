import "server-only";

import { logSecurityEvent } from "./audit-log";
import { createApiError } from "./safe-error-response";
import type { MockSession } from "./security.types";

export function assertSameCompany(input: {
  request?: Request;
  sessionCompanyId?: string | null;
  resourceCompanyId?: string | null;
  actorId?: string | null;
  entityType?: string;
  entityId?: string | null;
}) {
  if (!input.sessionCompanyId || !input.resourceCompanyId) {
    logSecurityEvent({
      request: input.request,
      actorId: input.actorId ?? null,
      companyId: input.sessionCompanyId ?? null,
      action: "company_access_missing_scope",
      entityType: input.entityType ?? "unknown",
      entityId: input.entityId ?? null,
    });
    throw createApiError("UNAUTHORIZED", "Sesi company belum valid.", 401);
  }
  if (input.sessionCompanyId !== input.resourceCompanyId) {
    logSecurityEvent({
      request: input.request,
      actorId: input.actorId ?? null,
      companyId: input.sessionCompanyId,
      action: "company_access_denied",
      entityType: input.entityType ?? "unknown",
      entityId: input.entityId ?? null,
      metadata: { resourceCompanyId: input.resourceCompanyId },
    });
    throw createApiError("FORBIDDEN", "Anda tidak memiliki akses ke data ini.", 403);
  }
}

export function requireCompanyAccess(
  session: MockSession,
  resourceCompanyId: string | null | undefined,
  request?: Request,
  entityType?: string,
  entityId?: string | null,
) {
  assertSameCompany({
    request,
    sessionCompanyId: session.companyId,
    resourceCompanyId,
    actorId: session.userId,
    entityType,
    entityId,
  });
  return true;
}

export function filterByCompanyId<T extends { companyId: string }>(
  rows: T[],
  companyId: string,
) {
  return rows.filter((row) => row.companyId === companyId);
}

export function getScopedCompanyId(input: {
  queryCompanyId?: string | null;
  bodyCompanyId?: string | null;
  headerCompanyId?: string | null;
}) {
  return input.bodyCompanyId ?? input.queryCompanyId ?? input.headerCompanyId ?? null;
}
