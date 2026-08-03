import { NextResponse } from "next/server";

import { getAdminOrderDetail, requireInternalAdmin } from "@/features/admin/admin.service";
import { createPaymentForOrder } from "@/features/payment/payment.service";
import { logPaymentEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";
import { z } from "zod";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().trim().min(1).max(160),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.order.payment.create"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:order:update");
    const { id } = validateInput(paramsSchema, await context.params);
    const detail = await getAdminOrderDetail(id);
    if (!detail) {
      return NextResponse.json({ ok: false, message: "Order tidak ditemukan." }, { status: 404 });
    }
    const result = await createPaymentForOrder({
      orderId: id,
      companyId: detail.order.companyId,
      userId: actor.id,
    });
    logPaymentEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      companyId: detail.order.companyId,
      action: "payment_create",
      entityId: result.paymentId,
      metadata: {
        orderId: result.orderId,
        provider: result.provider,
        idempotent: result.idempotent ?? false,
      },
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Payment link belum dapat dibuat.",
      503,
    );
  }
}
