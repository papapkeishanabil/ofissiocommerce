import { NextResponse } from "next/server";

import { updateCustomerCompanyProfile } from "@/features/customer-account/customer-account.service";
import { companyProfileSchema } from "@/schemas/auth";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "company.profile.update"),
      limit: 20,
      windowMs: 60_000,
    });
    const session = requireAuth(request);
    const profile = validateInput(
      companyProfileSchema,
      await request.json().catch(() => ({})),
    );
    await updateCustomerCompanyProfile({ session, profile, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "Profil perusahaan belum dapat disimpan.", 400);
  }
}
