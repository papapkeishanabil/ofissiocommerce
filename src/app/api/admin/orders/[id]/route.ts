import { NextResponse } from "next/server";

import { getAdminOrderDetail, requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
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
      key: createRateLimitKey(request, "admin.orders.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:order:view");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const detail = await getAdminOrderDetail(id);
    if (!detail) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Admin order tidak ditemukan.", 404);
  }
}
