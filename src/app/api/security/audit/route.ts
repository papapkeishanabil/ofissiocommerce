import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/security/audit-log";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const clientAuditSchema = z.object({
  companyId: z.string().trim().min(1).max(100),
  userId: z.string().trim().min(1).max(100),
  action: z.enum(["repeat_order", "ofistant_tracking_request"]),
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().trim().min(1).max(160).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "security.audit.client"),
      limit: 120,
      windowMs: 60_000,
    });
    const payload = validateInput(clientAuditSchema, await request.json());
    const session = requireAuth(request, {
      companyId: payload.companyId,
      userId: payload.userId,
    });
    requireCompanyAccess(session, payload.companyId, request, payload.entityType, payload.entityId);
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      metadata: payload.metadata ?? {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "Audit event tidak valid.", 400);
  }
}
