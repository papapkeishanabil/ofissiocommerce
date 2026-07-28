import { NextResponse } from "next/server";

import { processIpaymuCallback } from "@/features/payment/payment.webhook";
import { paymentCallbackSchema } from "@/features/payment/payment.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = paymentCallbackSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Callback pembayaran tidak valid." },
        { status: 400 },
      );
    }
    const result = await processIpaymuCallback(parsed.data, request.headers);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.warn("[payment.callback] Rejected unverified callback.");
    // Do not reveal signature, expected amount, or provider internals.
    return NextResponse.json(
      { ok: false, message: "Callback pembayaran tidak valid." },
      { status: 401 },
    );
  }
}
