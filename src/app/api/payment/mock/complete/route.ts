import { NextResponse } from "next/server";

import { getPaymentRuntimeConfig } from "@/features/payment/payment.config";
import {
  completeMockPayment,
  getPaymentStatus,
} from "@/features/payment/payment.service";
import { mockPaymentCompletionSchema } from "@/features/payment/payment.validation";
import { logPaymentEvent } from "@/lib/security/audit-log";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "payment.mock.complete"),
      limit: 20,
      windowMs: 60_000,
    });
    if (getPaymentRuntimeConfig().provider !== "mock") {
      return NextResponse.json(
        { ok: false, message: "Simulasi pembayaran tidak tersedia." },
        { status: 404 },
      );
    }
    const payload: unknown = await request.json();
    const parsed = validateInput(mockPaymentCompletionSchema, payload);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "checkout:create");
    const currentPayment = getPaymentStatus(parsed.paymentId);
    if (!currentPayment) {
      throw createApiError("NOT_FOUND", "Status pembayaran belum dapat diverifikasi.", 404);
    }
    requireCompanyAccess(session, currentPayment.companyId, request, "payment", parsed.paymentId);

    const result = completeMockPayment(
      parsed.paymentId,
      parsed.status,
    );
    logPaymentEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "payment_mock_complete",
      entityId: parsed.paymentId,
      metadata: {
        status: parsed.status,
        idempotent: result.idempotent,
        orderId: result.payment.orderId,
      },
    });
    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      payment: getPaymentStatus(parsed.paymentId),
      tracking: result.tracking,
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Status pembayaran belum dapat diverifikasi.",
      404,
    );
  }
}
