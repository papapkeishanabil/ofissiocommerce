import { NextResponse } from "next/server";

import { processGineeWebhook } from "@/features/integrations/ginee/ginee.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "integrations.ginee.webhook"),
      limit: 120,
      windowMs: 60_000,
    });
    const rawBody = await request.text();
    if (!rawBody || Buffer.byteLength(rawBody, "utf8") > 512 * 1024) {
      throw createApiError("BAD_REQUEST", "Payload webhook tidak valid.", 400);
    }
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const result = await processGineeWebhook({
      headers: request.headers,
      rawBody,
      payload,
      request,
    });
    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      eventId: result.event.id,
      status: result.event.status,
    });
  } catch (error) {
    return safeErrorResponse(error, "Webhook Ginee tidak valid.", 401);
  }
}
