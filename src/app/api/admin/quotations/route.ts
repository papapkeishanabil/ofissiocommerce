import { NextResponse } from "next/server";

import { listAdminQuotations, requireInternalAdmin } from "@/features/admin/admin.service";
import { adminListQuerySchema } from "@/features/admin/admin.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.quotations.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:quotation:view");
    const query = validateInput(
      adminListQuerySchema,
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const quotations = await listAdminQuotations(query);
    return NextResponse.json({ ok: true, quotations });
  } catch (error) {
    return safeErrorResponse(error, "Admin quotations belum dapat dimuat.", 403);
  }
}
