import { NextResponse } from "next/server";

import { shippingService } from "@/features/shipping/shipping.service";
import { createShipmentSchema } from "@/features/shipping/shipping.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = createShipmentSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Data pengiriman tidak valid." },
        { status: 400 },
      );
    }
    const shipment = shippingService.createShipment(parsed.data);
    return NextResponse.json({ ok: true, shipment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Provider pengiriman sedang tidak tersedia." },
      { status: 503 },
    );
  }
}
