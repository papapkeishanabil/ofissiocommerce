import { NextResponse } from "next/server";

import {
  getAdminOrderDetail,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { sendInvoiceReadyEmail } from "@/features/email/invoice-email.service";
import { documentIdParamSchema } from "@/features/documents/document.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.order.send_invoice"),
      limit: 10,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:order:update");
    const { id } = validateInput(documentIdParamSchema, await context.params);
    const detail = await getAdminOrderDetail(id);
    if (!detail) {
      throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
    }

    const invoice = detail.documents.find(
      (document) =>
        document.documentType === "invoice_pdf" &&
        document.status === "generated",
    );
    if (!invoice) {
      throw createApiError(
        "BAD_REQUEST",
        "Generate invoice PDF terlebih dahulu sebelum mengirim email.",
        400,
      );
    }

    const result = await sendInvoiceReadyEmail({
      order: detail.order,
      payment: detail.payment,
      invoice,
      actorId: actor.id,
      request,
    });

    return NextResponse.json({
      ok: true,
      message:
        result.email.status === "mocked"
          ? "Email invoice tercatat di mode mock."
          : "Invoice berhasil dikirim ke customer.",
      email: {
        status: result.email.status,
        provider: result.email.provider,
      },
      invoiceNumber: result.invoiceNumber,
    });
  } catch (error) {
    return safeErrorResponse(error, "Invoice belum dapat dikirim ke customer.", 400);
  }
}
