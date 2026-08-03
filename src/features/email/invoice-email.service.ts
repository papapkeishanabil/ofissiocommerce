import "server-only";

import type { DocumentRecord } from "@/features/documents/document.types";
import type {
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import { quotationRepository } from "@/features/quotation/quotation.repository";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

import { sendEmail } from "./email.service";
import { renderInvoiceReadyToCustomer } from "./email.templates";
import { isValidEmailAddress } from "./email.validation";

export async function sendInvoiceReadyEmail(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord | null;
  invoice: DocumentRecord;
  actorId: string;
  request?: Request;
}) {
  if (
    input.invoice.documentType !== "invoice_pdf" ||
    input.invoice.entityType !== "order" ||
    input.invoice.entityId !== input.order.id ||
    input.invoice.companyId !== input.order.companyId ||
    input.invoice.status !== "generated"
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Generate invoice PDF terlebih dahulu sebelum mengirim email.",
      400,
    );
  }

  if (!input.order.quotationId) {
    throw createApiError(
      "BAD_REQUEST",
      "Email customer belum tersedia pada order ini.",
      400,
    );
  }

  const quotation = await quotationRepository.getById(input.order.quotationId);
  if (!quotation || quotation.companyId !== input.order.companyId) {
    throw createApiError(
      "NOT_FOUND",
      "Data customer untuk invoice tidak ditemukan.",
      404,
    );
  }

  const recipient =
    quotation.customerEmail ?? quotation.picEmail ?? quotation.userEmail ?? null;
  if (!recipient || !isValidEmailAddress(recipient)) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Email customer belum tersedia atau tidak valid.",
      400,
    );
  }
  const recipientEmail = recipient;

  const template = renderInvoiceReadyToCustomer({
    order: input.order,
    payment: input.payment,
    invoiceNumber: input.invoice.documentNumber,
    portalUrl: buildPublicUrl(`/orders/${input.order.id}`),
  });
  const result = await sendEmail({
    // This existing payment email log type keeps the live Supabase constraint
    // compatible. safeMetadata distinguishes invoice delivery from paid email.
    type: "payment_received_customer",
    companyId: input.order.companyId,
    userId: input.order.userId,
    to: [recipientEmail],
    subject: template.subject,
    html: template.html,
    text: template.text,
    safeMetadata: {
      emailPurpose: "invoice_ready",
      orderId: input.order.id,
      orderNumber: input.order.orderNumber ?? input.order.id,
      invoiceDocumentId: input.invoice.id,
      invoiceNumber: input.invoice.documentNumber,
      paymentStatus: input.payment?.status ?? input.order.status,
    },
    request: input.request,
  });

  if (result.status !== "sent" && result.status !== "mocked") {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      result.errorMessage ?? "Email invoice belum berhasil dikirim.",
      503,
    );
  }

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: input.order.companyId,
    action: "invoice_email_sent",
    entityType: "order",
    entityId: input.order.id,
    metadata: {
      invoiceDocumentId: input.invoice.id,
      invoiceNumber: input.invoice.documentNumber,
      emailLogId: result.id,
      provider: result.provider,
      status: result.status,
    },
  });

  return {
    email: result,
    recipient: recipientEmail,
    invoiceNumber: input.invoice.documentNumber,
  };
}

function buildPublicUrl(path: string) {
  const baseUrl = process.env.APP_URL?.trim() || "http://localhost:8000";
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}
