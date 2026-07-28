import { NextResponse } from "next/server";

import { getPaymentStatus } from "@/features/payment/payment.service";
import { paymentStatusQuerySchema } from "@/features/payment/payment.validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = paymentStatusQuerySchema.safeParse({
    paymentId: url.searchParams.get("paymentId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Status pembayaran belum dapat diverifikasi." },
      { status: 400 },
    );
  }
  const payment = getPaymentStatus(parsed.data.paymentId);
  if (!payment) {
    return NextResponse.json(
      { ok: false, message: "Status pembayaran belum dapat diverifikasi." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, payment });
}
