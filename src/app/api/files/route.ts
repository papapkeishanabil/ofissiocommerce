import { NextResponse } from "next/server";

import { storageService } from "@/features/storage/storage.service";
import { fileListQuerySchema } from "@/features/storage/storage.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "files.list"),
      limit: 80,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "file:view");
    const query = parseQueryParams(fileListQuerySchema, request);
    const files = await storageService.getFilesByCompany(session.companyId, query);
    return NextResponse.json({
      ok: true,
      files: files.map(storageService.toPublicUploadedFile),
    });
  } catch (error) {
    return safeErrorResponse(error, "File belum dapat ditampilkan.", 400);
  }
}
