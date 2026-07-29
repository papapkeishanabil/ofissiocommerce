import "server-only";

import { randomUUID } from "node:crypto";

import { syncCheckoutCart } from "@/features/checkout/checkout-cart.service";
import type { EmailSendResult, EmailStatus } from "@/features/email/email.types";
import { emailService } from "@/features/email/email.service";
import { logAuditEvent } from "@/lib/security/audit-log";

import { quotationRepository } from "./quotation.repository";
import type {
  CreateQuotationRequestInput,
  CreateQuotationRequestResult,
  QuotationRequestRecord,
} from "./quotation.types";

export async function createQuotationRequest(
  input: CreateQuotationRequestInput,
  request?: Request,
): Promise<CreateQuotationRequestResult> {
  const cart = await syncCheckoutCart({
    companyId: input.companyId,
    userId: input.userId,
    items: input.items.map((item) => ({
      productId: item.productId,
      selectedColor: item.selectedColor,
      sizeMatrix: item.sizeMatrix as never,
      customization: item.customization,
      embroideryPlacements: item.embroideryPlacements as never,
    })),
  });
  const now = new Date().toISOString();
  const id = `quo_${randomUUID()}`;
  const quotationNumber = buildQuotationNumber(now);
  const picName =
    input.picName?.trim() ||
    input.userName?.trim() ||
    input.companyName ||
    "Customer Ofissio";
  const picEmail = input.picEmail?.trim() || input.userEmail;
  const emailContext = {
    quotationNumber,
    companyName: input.companyName || input.companyId,
    picName,
    picEmail,
    picWhatsapp: input.picWhatsapp,
    customerNotes: input.customerNotes,
    items: cart.items,
    createdAt: now,
    internalUrl: `/internal/quotations/${id}`,
  };
  const emails = await Promise.all([
    emailService.sendQuotationRequestToSales({
      companyId: input.companyId,
      userId: input.userId,
      context: emailContext,
      request,
    }),
    emailService.sendQuotationConfirmationToCustomer({
      companyId: input.companyId,
      userId: input.userId,
      customerEmail: picEmail,
      context: emailContext,
      request,
    }),
  ]);
  const emailStatus = aggregateEmailStatus(emails);
  const record: QuotationRequestRecord = {
    id,
    quotationNumber,
    companyId: input.companyId,
    companyName: input.companyName || input.companyId,
    userId: input.userId,
    userEmail: input.userEmail,
    picName,
    picEmail,
    picWhatsapp: input.picWhatsapp,
    status:
      emailStatus === "sent" || emailStatus === "mocked"
        ? "emailed"
        : "submitted",
    source: "web_cart",
    items: cart.items,
    subtotalEstimate: cart.subtotal,
    totalQty: cart.totalQty,
    embroideryPointCount: cart.items.reduce(
      (total, item) => total + item.embroideryPlacements.length,
      0,
    ),
    customerNotes: input.customerNotes,
    shippingDestination: input.shippingDestination,
    emailStatus,
    emailLogIds: emails.map((email) => email.id),
    emailResults: emails,
    createdAt: now,
    updatedAt: now,
  };
  quotationRepository.save(record);
  logAuditEvent({
    request,
    actorId: input.userId,
    actorType: "customer",
    companyId: input.companyId,
    action: "quotation_request_created",
    entityType: "quotation",
    entityId: id,
    metadata: {
      quotationNumber,
      totalQty: cart.totalQty,
      itemCount: cart.items.length,
      embroideryPointCount: record.embroideryPointCount,
      emailStatus,
    },
  });
  return { quotation: record, emails };
}

export function listQuotationRequests(companyId: string) {
  return quotationRepository.listByCompany(companyId);
}

export function getQuotationRequestById(id: string, companyId: string) {
  const quotation = quotationRepository.getById(id);
  if (!quotation || quotation.companyId !== companyId) return null;
  return quotation;
}

function buildQuotationNumber(nowIso: string) {
  const date = nowIso.slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `OF-QUO-${date}-${suffix}`;
}

function aggregateEmailStatus(results: EmailSendResult[]): EmailStatus {
  if (results.some((result) => result.status === "failed")) return "failed";
  if (results.some((result) => result.status === "sent")) return "sent";
  if (results.some((result) => result.status === "mocked")) return "mocked";
  if (results.some((result) => result.status === "queued")) return "queued";
  return "skipped";
}
