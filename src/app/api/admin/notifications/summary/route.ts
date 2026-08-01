import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getAdminNotificationSummary } from "@/features/admin-notifications/admin-notification.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.notifications.summary"),
      limit: 120,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:notification:view");
    const summary = await getAdminNotificationSummary({
      role: actor.role,
      userId: actor.id,
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return safeErrorResponse(error, "Ringkasan notifikasi belum tersedia.", 403);
  }
}
