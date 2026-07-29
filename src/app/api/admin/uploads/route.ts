import { NextResponse } from "next/server";

import { listAdminUploads, requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.uploads.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:upload:view");
    const uploads = await listAdminUploads();
    return NextResponse.json({ ok: true, uploads });
  } catch (error) {
    return safeErrorResponse(error, "Admin uploads belum dapat dimuat.", 403);
  }
}
