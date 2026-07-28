import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getOrderTrackingById,
  type TrackingScope,
} from "@/features/tracking/tracking.service";
import { listTrackingOrders } from "@/features/tracking/tracking.server-store";
import { logAuditEvent } from "@/lib/security/audit-log";
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

const trackingOrderQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(100),
  companyName: z.string().trim().min(1).max(160).optional(),
  userId: z.string().trim().min(1).max(100),
});

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "tracking.order_detail"),
      limit: 80,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const query = parseQueryParams(trackingOrderQuerySchema, request);
    const session = requireAuth(request, {
      companyId: query.companyId,
      userId: query.userId,
    });
    requireRole(session, "order:view");
    requireCompanyAccess(session, query.companyId, request, "tracking_order", id);

    const scope: TrackingScope = {
      companyId: session.companyId,
      companyName: query.companyName,
    };
    const dynamicOrders = listTrackingOrders(session.companyId);
    const order = getOrderTrackingById(id, scope, dynamicOrders);
    if (!order) {
      throw createApiError("NOT_FOUND", "Tracking order tidak ditemukan.", 404);
    }
    requireCompanyAccess(session, order.companyId, request, "tracking_order", order.id);
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "tracking_order_opened",
      entityType: "tracking_order",
      entityId: order.id,
    });
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return safeErrorResponse(error, "Tracking order tidak ditemukan.", 404);
  }
}
