import { NextResponse } from "next/server";

import {
  getOrderTrackingById,
  type TrackingScope,
} from "@/features/tracking/tracking.service";
import { listTrackingOrders } from "@/features/tracking/tracking.server-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const scope: TrackingScope = {
    companyId: url.searchParams.get("companyId"),
    companyName: url.searchParams.get("companyName"),
  };
  const dynamicOrders = listTrackingOrders(scope.companyId);
  const order = getOrderTrackingById(id, scope, dynamicOrders);
  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Tracking order tidak ditemukan." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, order });
}
