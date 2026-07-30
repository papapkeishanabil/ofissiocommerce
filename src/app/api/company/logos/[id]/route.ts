import { NextResponse } from "next/server";

import { companyAssetsService } from "@/features/company-assets/company-assets.service";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import {
  rejectInternalAdminUploadWithoutRoute,
  requireCompanyLogoWriteRole,
} from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.logos.delete"),
      limit: 30,
      windowMs: 60_000,
    });
    rejectInternalAdminUploadWithoutRoute(request);
    const session = requireAuth(request);
    requireCompanyLogoWriteRole(session);
    const { id } = await context.params;
    const deleted = await companyAssetsService.deleteCompanyLogo({
      companyId: session.companyId,
      userId: session.userId,
      logoId: id,
      actorRole: session.role,
      request,
    });
    if (!deleted) {
      throw createApiError("NOT_FOUND", "Logo tidak ditemukan.", 404);
    }
    return NextResponse.json({ ok: true, logoId: id });
  } catch (error) {
    return safeErrorResponse(error, "Logo belum dapat dihapus.", 404);
  }
}
