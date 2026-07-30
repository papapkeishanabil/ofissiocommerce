import { NextResponse } from "next/server";

import { companyAssetsService } from "@/features/company-assets/company-assets.service";
import { companyLogoCreateSchema } from "@/features/company-assets/company-assets.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import {
  rejectInternalAdminUploadWithoutRoute,
  requireCompanyLogoWriteRole,
  requireRole,
} from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.logos.list"),
      limit: 80,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "file:view");
    const logos = await companyAssetsService.listCompanyLogos(session.companyId);
    return NextResponse.json({ ok: true, logos });
  } catch (error) {
    return safeErrorResponse(error, "Logo belum dapat ditampilkan.", 400);
  }
}

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.logos.create"),
      limit: 30,
      windowMs: 60_000,
    });
    rejectInternalAdminUploadWithoutRoute(request);
    const session = requireAuth(request);
    requireCompanyLogoWriteRole(session);
    const payload: unknown = await request.json();
    if (hasBodyCompanyId(payload)) {
      throw createApiError(
        "VALIDATION_ERROR",
        "companyId logo harus berasal dari sesi customer.",
        400,
      );
    }
    const parsed = validateInput(companyLogoCreateSchema, payload);
    const logo = await companyAssetsService.createCompanyLogo({
      companyId: session.companyId,
      fileId: parsed.fileId,
      label: parsed.label,
      actorRole: session.role,
    });
    if (!logo) {
      throw createApiError("NOT_FOUND", "File logo tidak ditemukan.", 404);
    }
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "company_logo_registered",
      entityType: "company_logo",
      entityId: logo.id,
      metadata: { fileId: logo.fileId },
    });
    return NextResponse.json({ ok: true, logo }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Logo belum dapat disimpan.", 400);
  }
}

function hasBodyCompanyId(payload: unknown) {
  return (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    ("companyId" in payload || "company_id" in payload)
  );
}
