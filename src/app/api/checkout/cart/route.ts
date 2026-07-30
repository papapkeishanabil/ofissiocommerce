import { NextResponse } from "next/server";

import { syncCheckoutCart } from "@/features/checkout/checkout-cart.service";
import { syncCheckoutCartSchema } from "@/features/checkout/checkout-cart.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
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
      key: createRateLimitKey(request, "checkout.cart"),
      limit: 30,
      windowMs: 60_000,
    });
    const payload: unknown = await request.json();
    const parsed = validateInput(syncCheckoutCartSchema, payload);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "cart:write");
    requireCompanyAccess(session, parsed.companyId, request, "checkout_cart");

    const cart = await syncCheckoutCart({
      ...parsed,
      companyId: session.companyId,
      userId: session.userId,
    });
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "checkout_cart_synced",
      entityType: "checkout_cart",
      entityId: cart.id,
      metadata: { itemCount: cart.items.length, totalQty: cart.totalQty },
    });
    return NextResponse.json({
      ok: true,
      cartId: cart.id,
      subtotal: cart.subtotal,
      totalQty: cart.totalQty,
      expiresAt: cart.expiresAt,
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Keranjang belum dapat disiapkan untuk checkout.",
      400,
    );
  }
}
