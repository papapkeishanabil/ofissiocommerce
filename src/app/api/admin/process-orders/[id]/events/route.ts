import { NextResponse } from "next/server";

import { addAdminProcessOrderEvent, requireInternalAdmin } from "@/features/admin/admin.service";
import { processOrderEventSchema, processOrderIdParamSchema } from "@/features/process-orders/process-order.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.process-orders.events"),
      limit: 40,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:process-order:update");
    const { id } = validateInput(processOrderIdParamSchema, await context.params);
    const payload = validateInput(
      processOrderEventSchema,
      await request.json().catch(() => ({})),
    );
    const event = await addAdminProcessOrderEvent({ id, payload, actor, request });
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return safeErrorResponse(error, "Event process order belum dapat disimpan.", 403);
  }
}
