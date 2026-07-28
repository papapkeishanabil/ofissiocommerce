import { NextResponse } from "next/server";

import { shippingService } from "@/features/shipping/shipping.service";
import { trackingQuerySchema } from "@/features/shipping/shipping.validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = trackingQuerySchema.safeParse({
    shipmentId: url.searchParams.get("shipmentId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Parameter pelacakan tidak valid." },
      { status: 400 },
    );
  }
  const shipment = shippingService.trackShipment(parsed.data.shipmentId);
  if (!shipment) {
    return NextResponse.json(
      { ok: false, message: "Data pengiriman belum tersedia." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, shipment });
}
