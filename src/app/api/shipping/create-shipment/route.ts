import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "shipping.create_shipment"),
      limit: 20,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    requireRole(session, "order:view");

    throw createApiError(
      "FORBIDDEN",
      "Shipment production hanya dapat dibuat oleh admin Ofissio.",
      403,
    );
  } catch (error) {
    return safeErrorResponse(
      error,
      "Shipment production hanya dapat dibuat oleh admin Ofissio.",
      403,
    );
  }
}
