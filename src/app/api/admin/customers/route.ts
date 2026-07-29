import { NextResponse } from "next/server";

import { listAdminCustomers, requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.customers.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:customer:view");
    const customers = await listAdminCustomers();
    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    return safeErrorResponse(error, "Admin customers belum dapat dimuat.", 403);
  }
}
