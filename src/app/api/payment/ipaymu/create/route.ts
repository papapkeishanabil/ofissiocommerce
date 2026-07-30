import { NextResponse } from "next/server";

import { createPayment } from "@/features/payment/payment.service";
import { createPaymentSchema } from "@/features/payment/payment.validation";
import { logPaymentEvent } from "@/lib/security/audit-log";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "payment.create"),
      limit: 20,
      windowMs: 60_000,
    });
    const payload: unknown = await request.json();
    const parsed = validateInput(createPaymentSchema, payload);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "checkout:create");
    requireCompanyAccess(session, parsed.companyId, request, "payment");

    const result = await createPayment({
      ...parsed,
      companyId: session.companyId,
      userId: session.userId,
    });
    logPaymentEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "payment_create",
      entityId: result.paymentId,
      metadata: { orderId: result.orderId, provider: result.provider },
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Pembayaran belum bisa dibuat. Silakan coba lagi atau hubungi tim Ofissio.",
      503,
    );
  }
}
