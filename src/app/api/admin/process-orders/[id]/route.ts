import { NextResponse } from "next/server";

import {
  getAdminProcessOrderDetail,
  patchAdminProcessOrder,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { processOrderIdParamSchema, processOrderPatchSchema } from "@/features/process-orders/process-order.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.process-orders.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:process-order:view");
    const { id } = validateInput(processOrderIdParamSchema, await context.params);
    const detail = await getAdminProcessOrderDetail(id);
    if (!detail) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Process order tidak ditemukan.", 404);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.process-orders.patch"),
      limit: 40,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:process-order:update");
    const { id } = validateInput(processOrderIdParamSchema, await context.params);
    const payload = validateInput(processOrderPatchSchema, await request.json().catch(() => ({})));
    const detail = await patchAdminProcessOrder({ id, payload, actor, request });
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Process order belum dapat diupdate.", 403);
  }
}
