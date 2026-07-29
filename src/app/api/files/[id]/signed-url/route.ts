import { NextResponse } from "next/server";

import { storageService } from "@/features/storage/storage.service";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "files.signed_url"),
      limit: 80,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "file:view");
    const { id } = await context.params;
    const signed = await storageService.getSignedFileUrl({
      companyId: session.companyId,
      fileId: id,
    });
    if (!signed) {
      throw createApiError("NOT_FOUND", "File tidak ditemukan.", 404);
    }
    return NextResponse.json({ ok: true, ...signed });
  } catch (error) {
    return safeErrorResponse(error, "Signed URL belum dapat dibuat.", 404);
  }
}
