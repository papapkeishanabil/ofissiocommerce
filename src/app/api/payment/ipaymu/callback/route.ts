import { NextResponse } from "next/server";

import { processIpaymuCallback } from "@/features/payment/payment.webhook";
import { paymentCallbackSchema } from "@/features/payment/payment.validation";
import { logPaymentEvent, logSecurityEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "payment.callback"),
      limit: 60,
      windowMs: 60_000,
    });
    const payload: unknown = await request.json();
    const parsed = validateInput(paymentCallbackSchema, payload);
    const result = await processIpaymuCallback(parsed, request.headers);
    logPaymentEvent({
      request,
      action: "payment_callback_processed",
      entityId: result.paymentId,
      metadata: { idempotent: result.idempotent },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logSecurityEvent({
      request,
      action: "payment_callback_rejected",
      entityType: "payment",
      entityId: null,
      metadata: { reason: "invalid_or_unverified_callback" },
    });
    // Do not reveal signature, expected amount, or provider internals.
    return safeErrorResponse(
      error,
      "Callback pembayaran tidak valid.",
      401,
    );
  }
}
