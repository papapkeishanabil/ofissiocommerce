import { NextResponse } from "next/server";

import { completeAdminProcessOrderTask, requireInternalAdmin } from "@/features/admin/admin.service";
import { completeProcessTaskSchema, processOrderTaskIdParamSchema } from "@/features/process-orders/process-order.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string; taskId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.process-orders.task.complete"),
      limit: 60,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:process-order:update");
    const { id, taskId } = validateInput(processOrderTaskIdParamSchema, await context.params);
    const payload = validateInput(
      completeProcessTaskSchema,
      await request.json().catch(() => ({})),
    );
    const detail = await completeAdminProcessOrderTask({
      id,
      taskId,
      notes: payload.notes,
      actor,
      request,
    });
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Task process order belum dapat diselesaikan.", 403);
  }
}
