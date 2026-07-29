import { NextResponse } from "next/server";

import { storageService } from "@/features/storage/storage.service";
import { uploadFormSchema } from "@/features/storage/storage.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "files.upload"),
      limit: 20,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "file:write");

    const formData = await request.formData();
    const payload = validateInput(uploadFormSchema, {
      fileType: formData.get("fileType"),
      metadata: formData.get("metadata") ?? undefined,
    });
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw createApiError("VALIDATION_ERROR", "File upload belum valid.", 400);
    }

    let metadata: Record<string, unknown> = {};
    if (payload.metadata) {
      try {
        const parsed: unknown = JSON.parse(payload.metadata);
        metadata =
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
      } catch {
        throw createApiError("VALIDATION_ERROR", "Metadata upload belum valid.", 400);
      }
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const uploaded = await storageService.uploadFile({
      companyId: session.companyId,
      userId: session.userId,
      fileType: payload.fileType,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      data: buffer,
      metadata,
      request,
    });

    return NextResponse.json({ ok: true, file: uploaded }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(
      error,
      "File belum bisa diupload. Periksa format dan ukuran file.",
      400,
    );
  }
}
