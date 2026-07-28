import { NextResponse } from "next/server";

import { shippingService } from "@/features/shipping/shipping.service";
import { shippingRateRequestSchema } from "@/features/shipping/shipping.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = shippingRateRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Ongkir belum bisa dihitung otomatis. Tim Ofissio akan mengonfirmasi ongkir melalui quotation.",
        },
        { status: 400 },
      );
    }
    const clientKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const rates = await shippingService.getRates(parsed.data, clientKey);
    return NextResponse.json({ ok: true, rates });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Ongkir belum bisa dihitung otomatis. Tim Ofissio akan mengonfirmasi ongkir melalui quotation.",
      },
      { status: 503 },
    );
  }
}
