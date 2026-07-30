import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getInvoicePdfSignedUrl } from "@/features/documents/document.service";
import { documentIdParamSchema } from "@/features/documents/document.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.order.invoice"),
      limit: 60,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:order:view");
    const { id } = validateInput(documentIdParamSchema, await context.params);
    const result = await getInvoicePdfSignedUrl({
      orderId: id,
      companyId: "",
      actorId: actor.id,
      request,
      internal: true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeErrorResponse(error, "Invoice PDF belum tersedia.", 404);
  }
}
