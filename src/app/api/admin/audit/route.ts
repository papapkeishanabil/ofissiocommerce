import { NextResponse } from "next/server";

import { listAdminAuditEvents, requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.audit.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:audit:view");
    const audit = await listAdminAuditEvents();
    return NextResponse.json({ ok: true, audit });
  } catch (error) {
    return safeErrorResponse(error, "Admin audit belum dapat dimuat.", 403);
  }
}
