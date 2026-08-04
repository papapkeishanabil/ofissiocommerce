import { NextResponse } from "next/server";

import { createCustomerAddress } from "@/features/customer-account/customer-account.service";
import { addressSchema } from "@/schemas/auth";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.addresses.create"),
      limit: 30,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    const address = validateInput(
      addressSchema,
      await request.json().catch(() => ({})),
    );
    const created = await createCustomerAddress({ session, address, request });
    return NextResponse.json({ ok: true, address: created }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Alamat belum dapat ditambahkan.", 400);
  }
}
