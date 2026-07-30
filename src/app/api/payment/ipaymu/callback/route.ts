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
    const payload = await parseCallbackPayload(request);
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

async function parseCallbackPayload(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return Object.fromEntries(
      [...form.entries()].map(([key, value]) => [
        key,
        typeof value === "string" ? value : value.name,
      ]),
    );
  }
  return request.json();
}
