import { NextResponse } from "next/server";

import {
  listAdminShipments,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { shipmentListQuerySchema } from "@/features/shipments/shipment.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.shipments.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:shipment:view");
    const query = parseQueryParams(shipmentListQuerySchema, request);
    const shipments = await listAdminShipments(query);
    return NextResponse.json({ ok: true, shipments });
  } catch (error) {
    return safeErrorResponse(error, "Shipment belum dapat ditampilkan.", 403);
  }
}
