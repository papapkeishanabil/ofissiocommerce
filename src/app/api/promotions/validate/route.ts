import { NextResponse } from "next/server";
import { z } from "zod";

import { validatePromotionCode } from "@/features/promotions/promotion.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

const schema = z.object({
  code: z.string().trim().min(3).max(50),
  email: z.string().email().nullable().optional(),
  lines: z.array(z.object({ productId: z.string().min(1).max(120), quantity: z.number().int().positive(), subtotal: z.number().min(0) })).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "promotions.validate"), limit: 30, windowMs: 60_000 });
    const payload = schema.parse(await request.json());
    const result = await validatePromotionCode(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeErrorResponse(error, "Kode promo belum dapat divalidasi.", 400);
  }
}
