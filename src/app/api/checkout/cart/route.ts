import { NextResponse } from "next/server";

import { syncCheckoutCart } from "@/features/checkout/checkout-cart.service";
import { syncCheckoutCartSchema } from "@/features/checkout/checkout-cart.validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = syncCheckoutCartSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Data keranjang checkout tidak valid." },
        { status: 400 },
      );
    }
    const cart = syncCheckoutCart(parsed.data);
    return NextResponse.json({
      ok: true,
      cartId: cart.id,
      subtotal: cart.subtotal,
      totalQty: cart.totalQty,
      expiresAt: cart.expiresAt,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Keranjang belum dapat disiapkan untuk checkout." },
      { status: 400 },
    );
  }
}
