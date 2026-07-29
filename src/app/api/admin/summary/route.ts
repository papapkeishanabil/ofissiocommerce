import { NextResponse } from "next/server";

import { getAdminSummary, requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.summary"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:view");
    const summary = await getAdminSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return safeErrorResponse(error, "Admin summary belum dapat dimuat.", 403);
  }
}
