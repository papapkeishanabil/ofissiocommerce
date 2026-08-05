import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { generateInvoicePdf } from "@/features/documents/document.service";
import {
  documentIdParamSchema,
  generateInvoicePdfBodySchema,
} from "@/features/documents/document.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.order.generate_invoice"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:order:update");
    const { id } = validateInput(documentIdParamSchema, await context.params);
    const payload = validateInput(
      generateInvoicePdfBodySchema,
      await request.json().catch(() => ({})),
    );
    const result = await generateInvoicePdf({
      orderId: id,
      templateId: payload.templateId,
      forceRegenerate: payload.forceRegenerate,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({
      ok: true,
      document: {
        id: result.document.id,
        documentNumber: result.document.documentNumber,
        templateId: result.document.templateId,
        filename: result.document.filename,
        status: result.document.status,
        generatedAt: result.document.generatedAt,
      },
      idempotent: result.idempotent,
      paymentIncluded: result.paymentIncluded,
      qrIncluded: result.qrIncluded,
    });
  } catch (error) {
    return safeErrorResponse(error, "Invoice PDF belum dapat dibuat.", 400);
  }
}
