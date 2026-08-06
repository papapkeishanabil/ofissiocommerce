import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { listGineeWebhookEvents } from "@/features/integrations/ginee/ginee.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.webhooks"), limit: 60, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:view");
    const events = await listGineeWebhookEvents();
    return NextResponse.json({ ok: true, events }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Event webhook Ginee belum dapat dimuat.", 403);
  }
}
