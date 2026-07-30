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
      key: createRateLimitKey(request, "files.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "file:view");
    const { id } = await context.params;
    const file = await storageService.getFileById({
      companyId: session.companyId,
      fileId: id,
    });
    if (!file || file.status === "deleted") {
      throw createApiError("NOT_FOUND", "File tidak ditemukan.", 404);
    }
    return NextResponse.json({
      ok: true,
      file: storageService.toPublicUploadedFile(file),
    });
  } catch (error) {
    return safeErrorResponse(error, "File tidak ditemukan.", 404);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "files.delete"),
      limit: 30,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "file:write");
    const { id } = await context.params;
    const deleted = await storageService.deleteFile({
      companyId: session.companyId,
      userId: session.userId,
      fileId: id,
      request,
    });
    if (!deleted) {
      throw createApiError("NOT_FOUND", "File tidak ditemukan.", 404);
    }
    return NextResponse.json({
      ok: true,
      file: storageService.toPublicUploadedFile(deleted),
    });
  } catch (error) {
    return safeErrorResponse(error, "File belum dapat dihapus.", 404);
  }
}
