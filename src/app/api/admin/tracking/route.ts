import { NextResponse } from "next/server";

import { listAdminTracking, requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.tracking.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:tracking:view");
    const tracking = await listAdminTracking();
    return NextResponse.json({ ok: true, tracking });
  } catch (error) {
    return safeErrorResponse(error, "Admin tracking belum dapat dimuat.", 403);
  }
}
