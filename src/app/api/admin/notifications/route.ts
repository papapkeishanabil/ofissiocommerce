import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { listAdminNotifications } from "@/features/admin-notifications/admin-notification.service";
import { adminNotificationListQuerySchema } from "@/features/admin-notifications/admin-notification.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.notifications.list"),
      limit: 100,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:notification:view");
    const query = parseQueryParams(adminNotificationListQuerySchema, request);
    const result = await listAdminNotifications(
      { role: actor.role, userId: actor.id },
      query,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeErrorResponse(error, "Notifikasi belum dapat ditampilkan.", 403);
  }
}
