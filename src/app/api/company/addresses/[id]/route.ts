import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/features/customer-account/customer-account.service";
import { addressSchema } from "@/schemas/auth";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const addressIdSchema = z.object({ id: z.string().uuid("ID alamat tidak valid.") });

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.addresses.update"),
      limit: 30,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    const { id } = validateInput(addressIdSchema, await context.params);
    const address = validateInput(
      addressSchema,
      await request.json().catch(() => ({})),
    );
    const updated = await updateCustomerAddress({
      session,
      addressId: id,
      address,
      request,
    });
    return NextResponse.json({ ok: true, address: updated });
  } catch (error) {
    return safeErrorResponse(error, "Alamat belum dapat diperbarui.", 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.addresses.delete"),
      limit: 30,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    const { id } = validateInput(addressIdSchema, await context.params);
    await deleteCustomerAddress({ session, addressId: id, request });
    return NextResponse.json({ ok: true, addressId: id });
  } catch (error) {
    return safeErrorResponse(error, "Alamat belum dapat dihapus.", 400);
  }
}
