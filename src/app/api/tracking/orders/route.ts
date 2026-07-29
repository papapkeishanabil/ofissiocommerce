import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getDashboardTrackingSnapshot,
  type TrackingScope,
} from "@/features/tracking/tracking.service";
import { listTrackingOrders } from "@/features/tracking/tracking.server-store";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { logAuditEvent } from "@/lib/security/audit-log";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const trackingOrdersQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(100),
  companyName: z.string().trim().min(1).max(160).optional(),
  userId: z.string().trim().min(1).max(100),
});

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "tracking.orders"),
      limit: 80,
      windowMs: 60_000,
    });
    const query = parseQueryParams(trackingOrdersQuerySchema, request);
    const session = requireAuth(request, {
      companyId: query.companyId,
      userId: query.userId,
    });
    requireRole(session, "order:view");
    requireCompanyAccess(session, query.companyId, request, "tracking_order");

    const scope: TrackingScope = {
      companyId: session.companyId,
      companyName: session.companyName ?? query.companyName,
    };
    const persistedOrders =
      await repositoryRegistry.tracking.listTrackingByCompany(session.companyId);
    const dynamicOrders = mergeTrackingOrders([
      persistedOrders,
      listTrackingOrders(session.companyId),
    ]);
    const snapshot = getDashboardTrackingSnapshot(scope, dynamicOrders);
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "tracking_orders_listed",
      entityType: "tracking_order",
      metadata: { dynamicCount: dynamicOrders.length },
    });
    return NextResponse.json({
      ok: true,
      snapshot,
      dynamicOrders,
    });
  } catch (error) {
    return safeErrorResponse(error, "Tracking order tidak ditemukan.", 404);
  }
}

function mergeTrackingOrders<T extends { id: string }>(sources: T[][]) {
  const map = new Map<string, T>();
  for (const order of sources.flat()) {
    if (!map.has(order.id)) map.set(order.id, order);
  }
  return [...map.values()];
}
