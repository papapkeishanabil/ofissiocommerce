import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { acknowledgeNotification } from "@/features/admin-notifications/admin-notification.service";
import { adminNotificationIdSchema } from "@/features/admin-notifications/admin-notification.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";
interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.notifications.acknowledge"), limit: 80, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:notification:update");
    const { id } = validateInput(adminNotificationIdSchema, await context.params);
    const notification = await acknowledgeNotification(id, { actorId: actor.id, request });
    if (!notification) throw createApiError("NOT_FOUND", "Notifikasi tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    return safeErrorResponse(error, "Notifikasi belum dapat diproses.", 403);
  }
}
