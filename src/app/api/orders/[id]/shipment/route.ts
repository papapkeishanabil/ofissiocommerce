import { NextResponse } from "next/server";
import { z } from "zod";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { getPublicShipmentForOrder } from "@/features/shipments/shipment.service";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const shipmentOrderQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "customer.order.shipment"),
      limit: 80,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const query = parseQueryParams(shipmentOrderQuerySchema, request);
    const session = requireAuth(request, {
      companyId: query.companyId,
      userId: query.userId,
    });
    requireRole(session, "order:view");
    requireCompanyAccess(session, session.companyId, request, "shipment_order", id);
    const scopedOrder = await repositoryRegistry.orders.getOrderById({
      companyId: session.companyId,
      orderId: id,
    });
    if (!scopedOrder) {
      const orderExistsForAnotherCompany =
        (await repositoryRegistry.orders.listAll?.())?.some(
          (order) => order.id === id && order.companyId !== session.companyId,
        ) ?? false;
      throw orderExistsForAnotherCompany
        ? createApiError("FORBIDDEN", "Anda tidak memiliki akses ke data pengiriman ini.", 403)
        : createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
    }
    const shipment = await getPublicShipmentForOrder({
      orderId: id,
      companyId: session.companyId,
    });
    return NextResponse.json({ ok: true, shipment });
  } catch (error) {
    return safeErrorResponse(error, "Shipment tidak ditemukan.", 404);
  }
}
