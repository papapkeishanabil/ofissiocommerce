import { NextResponse } from "next/server";

import { getPaymentRuntimeConfig } from "@/features/payment/payment.config";
import {
  completeMockPayment,
  getPaymentStatus,
} from "@/features/payment/payment.service";
import { mockPaymentCompletionSchema } from "@/features/payment/payment.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (getPaymentRuntimeConfig().provider !== "mock") {
      return NextResponse.json(
        { ok: false, message: "Simulasi pembayaran tidak tersedia." },
        { status: 404 },
      );
    }
    const payload: unknown = await request.json();
    const parsed = mockPaymentCompletionSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Data simulasi pembayaran tidak valid." },
        { status: 400 },
      );
    }
    const result = completeMockPayment(
      parsed.data.paymentId,
      parsed.data.status,
    );
    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      payment: getPaymentStatus(parsed.data.paymentId),
      tracking: result.tracking,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Status pembayaran belum dapat diverifikasi." },
      { status: 404 },
    );
  }
}
