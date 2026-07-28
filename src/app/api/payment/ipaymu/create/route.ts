import { NextResponse } from "next/server";

import { createPayment } from "@/features/payment/payment.service";
import { createPaymentSchema } from "@/features/payment/payment.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = createPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Pembayaran belum bisa dibuat. Silakan coba lagi atau hubungi tim Ofissio.",
        },
        { status: 400 },
      );
    }
    const result = await createPayment(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Pembayaran belum bisa dibuat. Silakan coba lagi atau hubungi tim Ofissio.",
      },
      { status: 503 },
    );
  }
}
