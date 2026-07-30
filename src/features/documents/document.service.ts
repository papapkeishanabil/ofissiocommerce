import "server-only";

import { randomUUID } from "node:crypto";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import type { PaymentOrderRecord, PaymentRecord } from "@/features/payment/payment.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

import { getDocumentRuntimeConfig } from "./document.config";
import { documentRepository } from "./document.repository";
import type {
  DocumentEntityType,
  DocumentRecord,
  DocumentSignedUrlResult,
  DocumentTemplateId,
  DocumentType,
  GenerateInvoicePdfInput,
  GenerateQuotationPdfInput,
  InvoicePdfData,
  QuotationPdfData,
} from "./document.types";
import {
  amountToIndonesianWords,
  formatInvoiceDate,
  isInvoiceTemplate,
  isQuotationFinalForPdf,
  isQuotationTemplate,
  publicDocument,
  safeDocumentNumber,
  sizeMatrixSummary,
} from "./document.utils";
import {
  renderInvoicePdfByTemplate,
  renderQuotationPdfByTemplate,
} from "./pdf/pdf-template.registry";
import {
  getGeneratedPdfSignedUrl,
  uploadGeneratedPdf,
} from "./providers/storage-document.provider";

export async function getDocumentsByEntity(input: {
  companyId?: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType?: DocumentType;
}) {
  try {
    return await documentRepository.listByEntity(input);
  } catch (error) {
    if (isMissingDocumentsSchema(error)) return [];
    throw error;
  }
}

export async function getDocumentById(input: {
  documentId: string;
  companyId?: string;
}) {
  try {
    return await documentRepository.getById(input);
  } catch (error) {
    if (isMissingDocumentsSchema(error)) return null;
    throw error;
  }
}

export async function generateQuotationPdf(input: GenerateQuotationPdfInput) {
  const config = getDocumentRuntimeConfig();
  const templateId = input.templateId ?? config.defaultQuotationTemplate;
  if (!isQuotationTemplate(templateId)) {
    throw createApiError("BAD_REQUEST", "Template quotation tidak valid.", 400);
  }
  let companyId: string | null = null;
  try {
    const quotation = await repositoryRegistry.quotations.getById(input.quotationId);
    if (!quotation) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
    companyId = quotation.companyId;
    const isFinal = isQuotationFinalForPdf(quotation.status);
    if (!isFinal && !input.allowDraft) {
      throw createApiError(
        "BAD_REQUEST",
        "Quotation belum final, PDF final belum bisa dibuat.",
        400,
      );
    }
    const existing = await latestGeneratedDocument({
      companyId: quotation.companyId,
      entityType: "quotation",
      entityId: quotation.id,
      documentType: "quotation_pdf",
    });
    if (existing && !input.forceRegenerate) {
      return { document: existing, idempotent: true };
    }
    if (existing && input.forceRegenerate) {
      await documentRepository.update(existing.id, {
        status: "expired",
        deletedAt: new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const documentNumber = safeDocumentNumber({
      documentType: "quotation_pdf",
      sourceNumber: quotation.quotationNumber,
    });
    const data = mapQuotationToPdfData({
      quotation,
      documentNumber,
      generatedAt: now,
      isFinal,
    });
    const pdf = renderQuotationPdfByTemplate(templateId, data);
    const filename = `${documentNumber}.pdf`;
    const file = await uploadGeneratedPdf({
      companyId: quotation.companyId,
      userId: quotation.userId,
      documentType: "quotation_pdf",
      documentNumber,
      filename,
      data: pdf,
      metadata: {
        documentType: "quotation_pdf",
        entityType: "quotation",
        entityId: quotation.id,
        templateId,
        quotationNumber: quotation.quotationNumber,
        final: isFinal,
      },
    });
    const document = await saveDocumentRecord({
      companyId: quotation.companyId,
      userId: quotation.userId,
      documentType: "quotation_pdf",
      entityType: "quotation",
      entityId: quotation.id,
      documentNumber,
      templateId,
      file,
      filename,
      generatedAt: now,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        quotationStatus: quotation.status,
        final: isFinal,
      },
    });
    await repositoryRegistry.quotations.update(quotation.id, {
      quotationPdfDocumentId: document.id,
      quotationPdfGeneratedAt: now,
    } as Partial<QuotationRequestRecord>);
    auditDocument({
      request: input.request,
      actorId: input.actorId,
      actorType: "internal",
      companyId: quotation.companyId,
      action: "pdf_generated",
      entityType: "quotation",
      entityId: quotation.id,
      document,
    });
    return { document, idempotent: false };
  } catch (error) {
    auditDocument({
      request: input.request,
      actorId: input.actorId,
      actorType: "internal",
      companyId,
      action: "pdf_generation_failed",
      entityType: "quotation",
      entityId: input.quotationId,
      metadata: { templateId },
    });
    throw error;
  }
}

export async function generateInvoicePdf(input: GenerateInvoicePdfInput) {
  const config = getDocumentRuntimeConfig();
  const templateId = input.templateId ?? config.defaultInvoiceTemplate;
  if (!isInvoiceTemplate(templateId)) {
    throw createApiError("BAD_REQUEST", "Template invoice tidak valid.", 400);
  }
  let companyId: string | null = null;
  try {
    const order = await getOrderGlobal(input.orderId);
    if (!order) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
    companyId = order.companyId;
    const existing = await latestGeneratedDocument({
      companyId: order.companyId,
      entityType: "order",
      entityId: order.id,
      documentType: "invoice_pdf",
    });
    if (existing && !input.forceRegenerate) {
      return { document: existing, idempotent: true };
    }
    if (existing && input.forceRegenerate) {
      await documentRepository.update(existing.id, {
        status: "expired",
        deletedAt: new Date().toISOString(),
      });
    }
    const now = new Date().toISOString();
    const payment = await findPaymentForOrder(order);
    const documentNumber = safeDocumentNumber({
      documentType: "invoice_pdf",
      sourceNumber: order.orderNumber ?? order.id,
    });
    const data = mapOrderToInvoicePdfData({
      order,
      payment,
      invoiceNumber: documentNumber,
      generatedAt: now,
    });
    const pdf = renderInvoicePdfByTemplate(templateId, data);
    const filename = `${documentNumber}.pdf`;
    const file = await uploadGeneratedPdf({
      companyId: order.companyId,
      userId: order.userId,
      documentType: "invoice_pdf",
      documentNumber,
      filename,
      data: pdf,
      metadata: {
        documentType: "invoice_pdf",
        entityType: "order",
        entityId: order.id,
        templateId,
        orderNumber: order.orderNumber ?? order.id,
        paymentStatus: data.paymentStatus,
      },
    });
    const document = await saveDocumentRecord({
      companyId: order.companyId,
      userId: order.userId,
      documentType: "invoice_pdf",
      entityType: "order",
      entityId: order.id,
      documentNumber,
      templateId,
      file,
      filename,
      generatedAt: now,
      metadata: {
        orderNumber: order.orderNumber ?? order.id,
        quotationId: order.quotationId ?? null,
        paymentStatus: data.paymentStatus,
        paymentProvider: data.paymentProvider,
      },
    });
    await repositoryRegistry.orders.updateOrderProcess?.({
      companyId: order.companyId,
      orderId: order.id,
      patch: {
        ...(order.processRoute ? { processRoute: order.processRoute } : {}),
        ...(order.processStatus ? { processStatus: order.processStatus } : {}),
        ...(order.replenishmentStatus
          ? { replenishmentStatus: order.replenishmentStatus }
          : {}),
        hasCustomization: order.hasCustomization ?? false,
        customizationType: order.customizationType ?? "none",
        processRouteReason: order.processRouteReason ?? null,
        invoicePdfDocumentId: document.id,
        invoicePdfGeneratedAt: now,
      },
    });
    auditDocument({
      request: input.request,
      actorId: input.actorId,
      actorType: "internal",
      companyId: order.companyId,
      action: "pdf_generated",
      entityType: "order",
      entityId: order.id,
      document,
    });
    return { document, idempotent: false };
  } catch (error) {
    auditDocument({
      request: input.request,
      actorId: input.actorId,
      actorType: "internal",
      companyId,
      action: "pdf_generation_failed",
      entityType: "order",
      entityId: input.orderId,
      metadata: { templateId },
    });
    throw error;
  }
}

export async function getQuotationPdfSignedUrl(input: {
  quotationId: string;
  companyId: string;
  request?: Request;
  actorId?: string | null;
  internal?: boolean;
}): Promise<DocumentSignedUrlResult> {
  const quotation = input.internal
    ? await repositoryRegistry.quotations.getById(input.quotationId)
    : await repositoryRegistry.quotations.getById(input.quotationId).then((record) =>
        record?.companyId === input.companyId ? record : null,
      );
  if (!quotation) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  const document = await latestGeneratedDocument({
    companyId: quotation.companyId,
    entityType: "quotation",
    entityId: quotation.id,
    documentType: "quotation_pdf",
  });
  if (!document) throw createApiError("NOT_FOUND", "PDF quotation belum tersedia.", 404);
  return signedUrlForDocument({
    document,
    request: input.request,
    actorId: input.actorId,
    actorType: input.internal ? "internal" : "customer",
  });
}

export async function getInvoicePdfSignedUrl(input: {
  orderId: string;
  companyId: string;
  request?: Request;
  actorId?: string | null;
  internal?: boolean;
}): Promise<DocumentSignedUrlResult> {
  const order = input.internal
    ? await getOrderGlobal(input.orderId)
    : await repositoryRegistry.orders.getOrderById({
        companyId: input.companyId,
        orderId: input.orderId,
      });
  if (!order) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
  const document = await latestGeneratedDocument({
    companyId: order.companyId,
    entityType: "order",
    entityId: order.id,
    documentType: "invoice_pdf",
  });
  if (!document) throw createApiError("NOT_FOUND", "Invoice PDF belum tersedia.", 404);
  return signedUrlForDocument({
    document,
    request: input.request,
    actorId: input.actorId,
    actorType: input.internal ? "internal" : "customer",
  });
}

export async function latestGeneratedDocument(input: {
  companyId: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType: DocumentType;
}) {
  const rows = await documentRepository.listByEntity(input);
  return (
    rows.find((document) => document.status === "generated" && !document.deletedAt) ??
    null
  );
}

export function mapQuotationToPdfData(input: {
  quotation: QuotationRequestRecord;
  documentNumber: string;
  generatedAt: string;
  isFinal: boolean;
}): QuotationPdfData {
  return {
    quotation: input.quotation,
    documentNumber: input.documentNumber,
    generatedAt: input.generatedAt,
    isFinal: input.isFinal,
    items: input.quotation.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      selectedColor: item.selectedColor,
      sizeSummary: sizeMatrixSummary(item.sizeMatrix),
      totalQty: item.totalQty,
      unitPrice: item.finalUnitPrice ?? item.unitPrice,
      discountAmount: item.discountAmount,
      lineTotal: item.finalLineTotal ?? item.lineSubtotal,
      customizationSummary:
        item.embroideryPlacements.length === 0
          ? item.customization ?? "-"
          : item.embroideryPlacements
              .map((placement) =>
                [
                  placement.zone,
                  placement.logoFileName,
                  `${placement.widthCm}x${placement.heightCm} cm`,
                  placement.notes,
                ]
                  .filter(Boolean)
                  .join(" / "),
              )
              .join("; "),
    })),
    terms: [
      input.quotation.validUntil
        ? `Harga berlaku sampai ${formatInvoiceDate(input.quotation.validUntil)}.`
        : "Harga mengikuti valid until yang dikonfirmasi sales.",
      "Produksi/custom mengikuti approval final dari customer.",
      "Harga final tidak termasuk perubahan spesifikasi setelah approval.",
      "Pembayaran mengikuti invoice/payment instruction dari Ofissio.",
    ],
  };
}

export function mapOrderToInvoicePdfData(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord | null;
  invoiceNumber: string;
  generatedAt: string;
}): InvoicePdfData {
  const config = getDocumentRuntimeConfig();
  const orderNumber = input.order.orderNumber ?? input.order.id;
  const subtotal = input.order.calculation.itemSubtotal;
  const shippingTotal = input.order.calculation.shippingFee;
  const taxTotal = input.order.calculation.tax;
  const dpp = Math.max(0, subtotal + shippingTotal);
  const grandTotal = input.order.calculation.grandTotal;
  const paymentProvider = input.payment?.provider ?? "mock";
  return {
    invoiceNumber: input.invoiceNumber,
    orderNumber,
    quotationNumber: input.order.quotationId ?? null,
    invoiceDate: input.generatedAt,
    dueDate: null,
    paymentStatus: input.payment?.status ?? invoiceStatusFromOrder(input.order.status),
    paymentProvider,
    paymentLink: input.payment?.paymentUrl ?? null,
    paymentQr: null,
    paymentExpiry: null,
    companyName: input.order.companyId,
    companyAddress: null,
    picName: input.order.userId,
    picPhone: null,
    locationLabel: config.companyLocationLabel,
    items: input.order.items.map((item) => ({
      description: [
        item.productName,
        item.sku,
        item.selectedColor,
        sizeMatrixSummary(item.sizeMatrix),
        item.customization,
        item.embroideryPlacements.length > 0
          ? `Custom: ${item.embroideryPlacements.map((p) => p.zone).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" / "),
      unitPrice: item.priceFrom,
      qty: item.totalQty,
      total: item.priceFrom * item.totalQty,
    })),
    subtotal,
    uniqueCode: 0,
    dpp,
    taxRate: 11,
    taxTotal,
    shippingTotal,
    grandTotal,
    amountInWords: amountToIndonesianWords(grandTotal),
    terms: [
      "Barang yang sudah dipesan tidak dapat dikembalikan.",
      "Kerusakan/cacat produksi diganti maksimal 7 hari setelah barang diterima.",
      "Invoice ini adalah foundation staging Ofissio; faktur pajak resmi belum termasuk.",
    ],
    signerName: config.signerName,
    signerTitle: config.signerTitle,
    contactTel: config.contactTel,
    contactWeb: config.contactWeb,
    contactEmail: config.contactEmail,
    isPaymentLive: paymentProvider === "ipaymu" && Boolean(input.payment?.paymentUrl),
    generatedAt: input.generatedAt,
  };
}

async function saveDocumentRecord(input: {
  companyId: string;
  userId: string | null;
  documentType: DocumentType;
  entityType: DocumentEntityType;
  entityId: string;
  documentNumber: string;
  templateId: DocumentTemplateId;
  file: { id: string; storageBucket: string; storageKey: string; sizeBytes: number };
  filename: string;
  generatedAt: string;
  metadata: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const document: DocumentRecord = {
    id: `doc_${randomUUID()}`,
    companyId: input.companyId,
    userId: input.userId,
    documentType: input.documentType,
    entityType: input.entityType,
    entityId: input.entityId,
    documentNumber: input.documentNumber,
    templateId: input.templateId,
    fileId: input.file.id,
    storageBucket: input.file.storageBucket,
    storageKey: input.file.storageKey,
    filename: input.filename,
    mimeType: "application/pdf",
    sizeBytes: input.file.sizeBytes,
    status: "generated",
    generatedAt: input.generatedAt,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return documentRepository.save(document);
}

async function signedUrlForDocument(input: {
  document: DocumentRecord;
  request?: Request;
  actorId?: string | null;
  actorType: "customer" | "internal";
}): Promise<DocumentSignedUrlResult> {
  const signed = await getGeneratedPdfSignedUrl({
    bucket: input.document.storageBucket,
    key: input.document.storageKey,
    mimeType: input.document.mimeType,
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId ?? input.document.userId,
    actorType: input.actorType,
    companyId: input.document.companyId,
    action: "pdf_download_url_created",
    entityType: input.document.entityType,
    entityId: input.document.entityId,
    metadata: {
      documentId: input.document.id,
      documentType: input.document.documentType,
      expiresAt: signed.expiresAt,
    },
  });
  return {
    document: publicDocument(input.document),
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
  };
}

async function getOrderGlobal(orderId: string) {
  const orders = (await repositoryRegistry.orders.listAll?.()) ?? [];
  return orders.find((order) => order.id === orderId || order.orderNumber === orderId) ?? null;
}

async function findPaymentForOrder(order: PaymentOrderRecord) {
  for (const reference of [order.orderNumber, order.id]) {
    if (!reference) continue;
    try {
      const payment = await repositoryRegistry.payments.getPaymentByReference(reference);
      if (payment?.orderId === order.id || payment?.companyId === order.companyId) {
        return payment;
      }
    } catch (error) {
      logInternalError(error, {
        area: "documents",
        action: "payment_lookup_for_invoice_failed",
      });
    }
  }
  return null;
}

function auditDocument(input: {
  request?: Request;
  actorId: string;
  actorType: "internal" | "customer" | "system";
  companyId?: string | null;
  action: "pdf_generated" | "pdf_generation_failed";
  entityType: "quotation" | "order";
  entityId: string;
  document?: DocumentRecord;
  metadata?: Record<string, unknown>;
}) {
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
    companyId: input.companyId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: {
      documentId: input.document?.id ?? null,
      documentType: input.document?.documentType ?? null,
      templateId: input.document?.templateId ?? null,
      ...input.metadata,
    },
  });
}

function invoiceStatusFromOrder(status: PaymentOrderRecord["status"]) {
  if (status === "payment_received") return "payment_received" as const;
  if (status === "payment_failed") return "failed" as const;
  if (status === "cancelled") return "cancelled" as const;
  return "waiting_payment" as const;
}

function isMissingDocumentsSchema(error: unknown) {
  return (
    error instanceof SupabaseDatabaseError &&
    (error.reason === "relation_does_not_exist" ||
      (error.reason === "query_error" &&
        ["PGRST204", "42703"].includes(String(error.code))))
  );
}
