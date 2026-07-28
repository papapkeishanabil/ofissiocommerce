import { NextResponse } from "next/server";

import {
  getDashboardTrackingSnapshot,
  type TrackingScope,
} from "@/features/tracking/tracking.service";
import { listTrackingOrders } from "@/features/tracking/tracking.server-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope: TrackingScope = {
    companyId: url.searchParams.get("companyId"),
    companyName: url.searchParams.get("companyName"),
  };
  const dynamicOrders = listTrackingOrders(scope.companyId);
  const snapshot = getDashboardTrackingSnapshot(scope, dynamicOrders);
  return NextResponse.json({
    ok: true,
    snapshot,
    dynamicOrders,
  });
}
