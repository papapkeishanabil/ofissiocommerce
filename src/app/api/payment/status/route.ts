import { NextResponse } from "next/server";

import { getPaymentStatus } from "@/features/payment/payment.service";
import { paymentStatusQuerySchema } from "@/features/payment/payment.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "payment.status"),
      limit: 60,
      windowMs: 60_000,
    });
    const parsed = parseQueryParams(paymentStatusQuerySchema, request);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "payment:view");
    const payment = await getPaymentStatus({
      paymentId: parsed.paymentId,
      orderId: parsed.orderId,
      companyId: session.companyId,
    });
    if (!payment) {
      // The customer tracking page checks by orderId before a payment link may
      // exist. That is a valid "not created yet" state, not a missing API
      // resource. Keep a true paymentId lookup strict so invalid links remain
      // distinguishable as 404 responses.
      if (parsed.orderId && !parsed.paymentId) {
        return NextResponse.json({ ok: true, payment: null });
      }
      throw createApiError(
        "NOT_FOUND",
        "Status pembayaran belum dapat diverifikasi.",
        404,
      );
    }
    requireCompanyAccess(session, payment.companyId, request, "payment", payment.paymentId);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Status pembayaran belum dapat diverifikasi.",
      404,
    );
  }
}
