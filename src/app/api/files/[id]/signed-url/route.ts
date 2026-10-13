import { NextResponse } from "next/server";

import { storageService } from "@/features/storage/storage.service";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { assertLogoPreviewFile, readLogoPreview } from "@/features/storage/logo-preview.service";
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
    const url = new URL(request.url);
    const content = url.searchParams.get("content") === "1";
    const preview = url.searchParams.get("preview") === "1";
    const file = content || preview ? assertLogoPreviewFile(
      await storageService.getFileById({ companyId: session.companyId, fileId: id }),
      session.companyId,
    ) : null;
    const signed = await storageService.getSignedFileUrl({
      companyId: session.companyId,
      fileId: id,
    });
    if (!signed) {
      throw createApiError("NOT_FOUND", "File tidak ditemukan.", 404);
    }
    if (content && file) {
      const upstream = await fetch(signed.signedUrl, {
        cache: "no-store", redirect: "error",
        headers: { "Accept-Encoding": "identity" },
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
      });
      const bytes = await readLogoPreview(upstream, file.sizeBytes);
      return new Response(bytes, {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "private, no-store",
          "Vary": "Cookie",
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin",
          "Content-Security-Policy": "sandbox; default-src 'none'",
        },
      });
    }
    // Supabase sessions use cookies, including image requests from Three.js.
    // Keep direct URLs for the mock development boundary that uses headers.
    const signedUrl = preview && getAuthRuntimeConfig().provider === "supabase"
      ? `/api/files/${encodeURIComponent(id)}/signed-url?content=1`
      : signed.signedUrl;
    return NextResponse.json({ ok: true, ...signed, signedUrl }, {
      headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" },
    });
  } catch (error) {
    return safeErrorResponse(error, "Signed URL belum dapat dibuat.", 404);
  }
}
