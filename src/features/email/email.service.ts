import "server-only";

import { randomUUID } from "node:crypto";

import { logAuditEvent } from "@/lib/security/audit-log";
import { getDocumentsByEntity } from "@/features/documents/document.service";

import { getEmailRuntimeConfig, validateEmailConfig } from "./email.config";
import { emailRepository } from "./email.repository";
import { sendEmailSchema, safeEmailSubject } from "./email.validation";
import {
  renderQuotationConfirmationToCustomer,
  renderQuotationReadyToCustomer,
  renderQuotationRequestToSales,
  renderTestEmail,
} from "./email.templates";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type {
  EmailProviderAdapter,
  EmailSendInput,
  EmailSendResult,
} from "./email.types";
import { mockEmailProvider } from "./providers/mock-email.provider";
import { resendEmailProvider } from "./providers/resend-email.provider";

function activeProvider(): EmailProviderAdapter {
  return getEmailRuntimeConfig().provider === "resend"
    ? resendEmailProvider
    : mockEmailProvider;
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const blocked = /(api[_-]?key|secret|token|password|authorization|html|raw)/i;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blocked.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" && value.length > 240
          ? `${value.slice(0, 240)}...`
          : value,
      ]),
  );
}

async function skippedEmail(input: {
  type: EmailSendInput["type"];
  companyId: string | null;
  userId: string | null;
  to: string[];
  subject: string;
  reason: string;
  safeMetadata?: Record<string, unknown>;
  request?: Request;
}): Promise<EmailSendResult> {
  const config = getEmailRuntimeConfig();
  const provider = activeProvider();
  const now = new Date().toISOString();
  const id = `email_${randomUUID()}`;
  await emailRepository.save({
    id,
    companyId: input.companyId,
    userId: input.userId,
    to: input.to,
    from: config.from,
    replyTo: config.replyTo,
    subject: safeEmailSubject(input.subject),
    type: input.type,
    provider: provider.name,
    status: "skipped",
    providerMessageId: null,
    safeMetadata: sanitizeMetadata({
      ...(input.safeMetadata ?? {}),
      skippedReason: input.reason,
    }),
    errorMessage: input.reason,
    createdAt: now,
    sentAt: null,
  });
  logAuditEvent({
    request: input.request,
    actorId: input.userId,
    actorType: "system",
    companyId: input.companyId,
    action: "email_skipped",
    entityType: "email",
    entityId: id,
    metadata: { type: input.type, provider: provider.name, reason: input.reason },
  });
  return {
    id,
    provider: provider.name,
    status: "skipped",
    providerMessageId: null,
    errorMessage: input.reason,
  };
}

export function getEmailProvider() {
  return getEmailRuntimeConfig().provider;
}

export function renderEmailTemplate(
  name:
    | "quotation_request_sales"
    | "quotation_confirmation_customer"
    | "test_email",
  context?: Parameters<typeof renderQuotationRequestToSales>[0],
) {
  if (name === "test_email") return renderTestEmail();
  if (!context) throw new Error("Email template context belum tersedia.");
  return name === "quotation_request_sales"
    ? renderQuotationRequestToSales(context)
    : renderQuotationConfirmationToCustomer(context);
}

export function logEmailEvent(input: Parameters<typeof logAuditEvent>[0]) {
  return logAuditEvent(input);
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const config = getEmailRuntimeConfig();
  const parsed = sendEmailSchema.parse({
    type: input.type,
    to: input.to,
    subject: safeEmailSubject(input.subject),
    html: input.html,
    text: input.text,
  });
  const provider = activeProvider();
  const now = new Date().toISOString();
  const id = `email_${randomUUID()}`;
  const log = await emailRepository
    .save({
      id,
      companyId: input.companyId,
      userId: input.userId,
      to: parsed.to,
      from: input.from ?? config.from,
      replyTo: input.replyTo ?? config.replyTo,
      subject: parsed.subject,
      type: parsed.type,
      provider: provider.name,
      status: "queued",
      providerMessageId: null,
      safeMetadata: sanitizeMetadata(input.safeMetadata ?? {}),
      errorMessage: null,
      createdAt: now,
      sentAt: null,
    })
    .catch(() => null);

  if (!log) {
    const fallbackStatus = provider.name === "mock" ? "mocked" : "failed";
    logAuditEvent({
      request: input.request,
      actorId: input.userId,
      actorType: "system",
      companyId: input.companyId,
      action: fallbackStatus === "mocked" ? "email_mocked" : "email_failed",
      entityType: "email",
      entityId: id,
      metadata: {
        type: parsed.type,
        provider: provider.name,
        reason: "email_log_unavailable",
      },
    });
    return {
      id,
      provider: provider.name,
      status: fallbackStatus,
      providerMessageId: null,
      errorMessage:
        fallbackStatus === "mocked" ? null : "Email log belum dapat disimpan.",
    };
  }

  if (!config.enabled && provider.name !== "mock") {
    await emailRepository.setStatus({
      id,
      status: "skipped",
      errorMessage: "EMAIL_ENABLED=false",
    });
    logAuditEvent({
      request: input.request,
      actorId: input.userId,
      actorType: "system",
      companyId: input.companyId,
      action: "email_skipped",
      entityType: "email",
      entityId: id,
      metadata: { type: parsed.type, provider: provider.name },
    });
    return {
      id,
      provider: provider.name,
      status: "skipped",
      providerMessageId: null,
      errorMessage: "EMAIL_ENABLED=false",
    };
  }

  try {
    const result = await provider.send({
      to: log.to,
      from: log.from,
      replyTo: log.replyTo,
      subject: log.subject,
      html: parsed.html,
      text: parsed.text,
    });
    const status = provider.name === "mock" ? "mocked" : "sent";
    const sentAt = new Date().toISOString();
    await emailRepository.setStatus({
      id,
      status,
      providerMessageId: result.providerMessageId,
      sentAt,
    });
    logAuditEvent({
      request: input.request,
      actorId: input.userId,
      actorType: "system",
      companyId: input.companyId,
      action: status === "mocked" ? "email_mocked" : "email_sent",
      entityType: "email",
      entityId: id,
      metadata: {
        type: parsed.type,
        provider: provider.name,
        recipientCount: log.to.length,
      },
    });
    return {
      id,
      provider: provider.name,
      status,
      providerMessageId: result.providerMessageId,
      errorMessage: null,
    };
  } catch {
    await emailRepository.setStatus({
      id,
      status: "failed",
      errorMessage: "Provider email gagal memproses request.",
    });
    logAuditEvent({
      request: input.request,
      actorId: input.userId,
      actorType: "system",
      companyId: input.companyId,
      action: "email_failed",
      entityType: "email",
      entityId: id,
      metadata: { type: parsed.type, provider: provider.name },
    });
    return {
      id,
      provider: provider.name,
      status: "failed",
      providerMessageId: null,
      errorMessage: "Provider email gagal memproses request.",
    };
  }
}

export async function sendQuotationRequestToSales(input: {
  companyId: string;
  userId: string;
  context: Parameters<typeof renderQuotationRequestToSales>[0];
  request?: Request;
}) {
  const config = getEmailRuntimeConfig();
  if (!config.salesQuotationEmail) {
    if (config.provider !== "mock") {
      return skippedEmail({
        type: "quotation_request_sales",
        companyId: input.companyId,
        userId: input.userId,
        to: [],
        subject: "Request quotation sales email skipped",
        reason: "SALES_QUOTATION_EMAIL belum dikonfigurasi.",
        safeMetadata: { quotationNumber: input.context.quotationNumber },
        request: input.request,
      });
    }
    return sendEmail({
      type: "quotation_request_sales",
      companyId: input.companyId,
      userId: input.userId,
      to: ["sales-placeholder@ofissio.local"],
      subject: "Request quotation skipped",
      html: "<p>SALES_QUOTATION_EMAIL belum dikonfigurasi.</p>",
      text: "SALES_QUOTATION_EMAIL belum dikonfigurasi.",
      safeMetadata: { skippedReason: "missing_sales_email" },
      request: input.request,
    });
  }
  const template = renderQuotationRequestToSales(input.context);
  return sendEmail({
    type: "quotation_request_sales",
    companyId: input.companyId,
    userId: input.userId,
    to: [config.salesQuotationEmail],
    subject: template.subject,
    html: template.html,
    text: template.text,
    safeMetadata: { quotationNumber: input.context.quotationNumber },
    request: input.request,
  });
}

export async function sendQuotationConfirmationToCustomer(input: {
  companyId: string;
  userId: string;
  customerEmail: string | null;
  context: Parameters<typeof renderQuotationConfirmationToCustomer>[0];
  request?: Request;
}) {
  if (!input.customerEmail) {
    if (getEmailRuntimeConfig().provider !== "mock") {
      return skippedEmail({
        type: "quotation_confirmation_customer",
        companyId: input.companyId,
        userId: input.userId,
        to: [],
        subject: "Request quotation customer email skipped",
        reason: "Email customer belum tersedia.",
        safeMetadata: { quotationNumber: input.context.quotationNumber },
        request: input.request,
      });
    }
    return sendEmail({
      type: "quotation_confirmation_customer",
      companyId: input.companyId,
      userId: input.userId,
      to: ["customer-placeholder@ofissio.local"],
      subject: "Request quotation customer email skipped",
      html: "<p>Email customer belum tersedia.</p>",
      text: "Email customer belum tersedia.",
      safeMetadata: { skippedReason: "missing_customer_email" },
      request: input.request,
    });
  }
  const template = renderQuotationConfirmationToCustomer(input.context);
  return sendEmail({
    type: "quotation_confirmation_customer",
    companyId: input.companyId,
    userId: input.userId,
    to: [input.customerEmail],
    subject: template.subject,
    html: template.html,
    text: template.text,
    safeMetadata: { quotationNumber: input.context.quotationNumber },
    request: input.request,
  });
}

export async function sendQuotationReadyToCustomer(input: {
  quotation: QuotationRequestRecord;
  customerEmail: string | null;
  request?: Request;
}) {
  const quotation = input.quotation;
  if (!input.customerEmail) {
    if (getEmailRuntimeConfig().provider !== "mock") {
      return skippedEmail({
        type: "quotation_ready_customer",
        companyId: quotation.companyId,
        userId: quotation.userId,
        to: [],
        subject: "Quotation ready customer email skipped",
        reason: "Email customer belum tersedia.",
        safeMetadata: { quotationNumber: quotation.quotationNumber },
        request: input.request,
      });
    }
  }
  const template = renderQuotationReadyToCustomer(quotation, {
    customerUrl: buildPublicUrl(`/quotes/${quotation.id}`),
    pdfAvailable: await hasQuotationPdf(quotation),
  });
  return sendEmail({
    type: "quotation_ready_customer",
    companyId: quotation.companyId,
    userId: quotation.userId,
    to: [input.customerEmail || "customer-placeholder@ofissio.local"],
    subject: template.subject,
    html: template.html,
    text: template.text,
    safeMetadata: {
      quotationNumber: quotation.quotationNumber,
      grandTotal: quotation.grandTotal,
      validUntil: quotation.validUntil,
      missingRecipient: !input.customerEmail,
      portalLinkIncludesPdfFoundation: true,
    },
    request: input.request,
  });
}

export async function sendPaymentReceivedEmail() {
  return { status: "skipped" as const, reason: "Phase 13 skeleton." };
}

export async function sendOrderTrackingUpdateEmail() {
  return { status: "skipped" as const, reason: "Phase 13 skeleton." };
}

export const emailService = {
  sendEmail,
  sendQuotationRequestToSales,
  sendQuotationConfirmationToCustomer,
  sendQuotationReadyToCustomer,
  sendPaymentReceivedEmail,
  sendOrderTrackingUpdateEmail,
  getEmailProvider,
  validateEmailConfig,
  renderEmailTemplate,
  logEmailEvent,
};

function buildPublicUrl(path: string) {
  const baseUrl = process.env.APP_URL?.trim() || "http://localhost:8000";
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

async function hasQuotationPdf(quotation: QuotationRequestRecord) {
  try {
    const documents = await getDocumentsByEntity({
      companyId: quotation.companyId,
      entityType: "quotation",
      entityId: quotation.id,
      documentType: "quotation_pdf",
    });
    return documents.some((document) => document.status === "generated");
  } catch {
    return false;
  }
}
