import { embroideryTextSummary } from "@/lib/embroidery-names";
import "server-only";

import { randomUUID } from "node:crypto";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { getPaymentQrForInvoice } from "@/features/payment/payment-qr.service";
import {
  ensurePaymentForInvoice,
  recordPaymentEvent,
} from "@/features/payment/payment.service";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import type { PaymentOrderRecord, PaymentRecord } from "@/features/payment/payment.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { sanitizeQuotationForCustomer } from "@/features/quotation/quotation.utils";
import { getBriefApprovalStatus } from "@/features/quotation/quotation-requirement";
import { BRIEF_APPROVAL_CONSENT_TEXT } from "@/features/quotation/quotation.validation";
import { getProcessOrderDetail } from "@/features/process-orders/process-order.service";
import type { ProcessOrderDetail } from "@/features/process-orders/process-order.types";
import { storageService } from "@/features/storage/storage.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";
import { embroideryTechniqueLabel, zoneLabel } from "@/types/uniform-3d";

import { getDocumentRuntimeConfig } from "./document.config";
import { documentRepository } from "./document.repository";
import type {
  DesignApprovalSheetPdfData,
  DocumentEntityType,
  EmbroideryWorkOrderPdfData,
  DocumentRecord,
  DocumentSignedUrlResult,
  DocumentTemplateId,
  DocumentType,
  GenerateDesignApprovalSheetPdfInput,
  GenerateInvoicePdfInput,
  GenerateEmbroideryWorkOrderPdfInput,
  GenerateProductionWorkOrderPdfInput,
  GenerateQuotationPdfInput,
  InvoicePdfData,
  ProductionWorkOrderPdfData,
  QuotationPdfData,
} from "./document.types";
import {
  amountToIndonesianWords,
  formatInvoiceDate,
  formatRupiah,
  isInvoiceTemplate,
  isEmbroideryWorkOrderTemplate,
  isProductionWorkOrderTemplate,
  isDesignApprovalSheetTemplate,
  isQuotationFinalForPdf,
  isQuotationTemplate,
  nextMonthlyDocumentSequence,
  publicDocument,
  safeDocumentNumber,
  sizeMatrixSummary,
} from "./document.utils";
import {
  renderInvoicePdfByTemplate,
  renderEmbroideryWorkOrderPdfByTemplate,
  renderProductionWorkOrderPdfByTemplate,
  renderDesignApprovalSheetPdfByTemplate,
  renderQuotationPdfByTemplate,
} from "./pdf/pdf-template.registry";
import { DESIGN_APPROVAL_SHEET_RENDERER_VERSION } from "./pdf/templates/design-approval-sheet-ofissio.template";
import {
  getGeneratedPdfSignedUrl,
  uploadGeneratedPdf,
} from "./providers/storage-document.provider";

const INVOICE_RENDERER_VERSION = "invoice-payment-links-v1";
const EMBROIDERY_WORK_ORDER_RENDERER_VERSION = "bwo-ofissio-v1";
const PRODUCTION_WORK_ORDER_RENDERER_VERSION = "pwo-ofissio-v1";

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
    const existingMatchesFinalState =
      Boolean(existing?.metadata.final) === isFinal;
    if (existing && !input.forceRegenerate && existingMatchesFinalState) {
      return { document: existing, idempotent: true };
    }
    if (existing && (input.forceRegenerate || !existingMatchesFinalState)) {
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
    const filename = `${documentNumber.replaceAll("/", "-")}.pdf`;
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
    const payment = await ensurePaymentForInvoice({
      orderId: order.id,
      companyId: order.companyId,
      userId: order.userId,
    });
    const invoicePaymentQr = getPaymentQrForInvoice(payment);
    const existing = await latestGeneratedDocument({
      companyId: order.companyId,
      entityType: "order",
      entityId: order.id,
      documentType: "invoice_pdf",
    });
    const existingUsesCurrentPayment = Boolean(
      existing &&
        existing.metadata.paymentReference === payment.referenceId &&
        existing.metadata.paymentLinkAvailable === true &&
        existing.metadata.paymentQrAvailable === true &&
        existing.metadata.rendererVersion === INVOICE_RENDERER_VERSION,
    );
    if (existing && !input.forceRegenerate && existingUsesCurrentPayment) {
      return {
        document: existing,
        idempotent: true,
        paymentIncluded: true,
        qrIncluded: true,
      };
    }
    if (existing && (input.forceRegenerate || !existingUsesCurrentPayment)) {
      await documentRepository.update(existing.id, {
        status: "expired",
        deletedAt: new Date().toISOString(),
      });
    }
    const now = new Date().toISOString();
    const previousInvoice = existing ?? (await documentRepository.listByEntity({
      companyId: order.companyId,
      entityType: "order",
      entityId: order.id,
      documentType: "invoice_pdf",
    }))[0];
    const allDocuments = previousInvoice || !documentRepository.listAll
      ? []
      : await documentRepository.listAll();
    const sequence = nextMonthlyDocumentSequence({
      existingNumbers: allDocuments.map((document) => document.documentNumber),
      prefix: "INV",
      processRoute: order.processRoute ?? "fulfillment",
      date: new Date(now),
    });
    const documentNumber = previousInvoice?.documentNumber ?? safeDocumentNumber({
      documentType: "invoice_pdf",
      processRoute: order.processRoute ?? "fulfillment",
      sequence,
      date: new Date(now),
    });
    const data = mapOrderToInvoicePdfData({
      order,
      payment,
      invoiceNumber: documentNumber,
      generatedAt: now,
    });
    const pdf = renderInvoicePdfByTemplate(templateId, data);
    const filename = `${documentNumber.replaceAll("/", "-")}.pdf`;
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
        paymentReference: payment.referenceId,
        paymentLinkAvailable: Boolean(payment.paymentUrl),
        paymentQrAvailable: invoicePaymentQr.kind !== "none",
        rendererVersion: INVOICE_RENDERER_VERSION,
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
        paymentId: payment.id,
        paymentReference: payment.referenceId,
        paymentLinkAvailable: Boolean(payment.paymentUrl),
        paymentQrAvailable: invoicePaymentQr.kind !== "none",
        rendererVersion: INVOICE_RENDERER_VERSION,
      },
    });
    if (payment) {
      await repositoryRegistry.payments.updatePayment?.({
        companyId: payment.companyId,
        paymentId: payment.id,
        patch: {
          invoiceDocumentId: document.id,
        },
      });
      recordPaymentEvent(payment, "invoice_regenerated_with_payment", {
        metadataJson: {
          documentId: document.id,
          invoiceNumber: document.documentNumber,
        },
      });
    }
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
    return {
      document,
      idempotent: false,
      paymentIncluded: Boolean(payment.paymentUrl),
      qrIncluded: invoicePaymentQr.kind !== "none",
    };
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

export async function generateEmbroideryWorkOrderPdf(
  input: GenerateEmbroideryWorkOrderPdfInput,
) {
  const config = getDocumentRuntimeConfig();
  const templateId = input.templateId ?? config.defaultEmbroideryWorkOrderTemplate;
  if (!isEmbroideryWorkOrderTemplate(templateId)) {
    throw createApiError("BAD_REQUEST", "Template Bordir Work Order tidak valid.", 400);
  }

  const detail = await getProcessOrderDetail(input.processOrderId);
  if (!detail) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  if (detail.processOrder.processRoute !== "customization") {
    throw createApiError(
      "BAD_REQUEST",
      "Bordir Work Order hanya dapat dibuat untuk routing customization.",
      400,
    );
  }

  const existing = await latestGeneratedDocument({
    companyId: detail.processOrder.companyId,
    entityType: "process_order",
    entityId: detail.processOrder.id,
    documentType: "embroidery_work_order_pdf",
  });
  if (existing && !input.forceRegenerate) {
    return { document: existing, idempotent: true };
  }
  if (existing) {
    await documentRepository.update(existing.id, {
      status: "expired",
      deletedAt: new Date().toISOString(),
    });
  }

  const previous = existing ?? (await documentRepository.listByEntity({
    companyId: detail.processOrder.companyId,
    entityType: "process_order",
    entityId: detail.processOrder.id,
    documentType: "embroidery_work_order_pdf",
  }))[0];
  const now = new Date();
  const allDocuments = previous || !documentRepository.listAll
    ? []
    : await documentRepository.listAll();
  const sequence = nextMonthlyDocumentSequence({
    existingNumbers: allDocuments.map((document) => document.documentNumber),
    prefix: "BWO",
    processRoute: "customization",
    date: now,
  });
  const documentNumber = previous?.documentNumber ?? safeDocumentNumber({
    documentType: "embroidery_work_order_pdf",
    processRoute: "customization",
    sequence,
    date: now,
  });
  const generatedAt = now.toISOString();
  const data = mapProcessOrderToEmbroideryWorkOrderPdfData({
    detail,
    documentNumber,
    generatedAt,
  });
  const pdf = renderEmbroideryWorkOrderPdfByTemplate(templateId, data);
  const filename = `${documentNumber.replaceAll("/", "-")}.pdf`;
  const file = await uploadGeneratedPdf({
    companyId: detail.processOrder.companyId,
    userId: detail.sourceOrder?.userId ?? null,
    documentType: "embroidery_work_order_pdf",
    documentNumber,
    filename,
    data: pdf,
    metadata: {
      documentType: "embroidery_work_order_pdf",
      entityType: "process_order",
      entityId: detail.processOrder.id,
      templateId,
      processOrderNumber: detail.processOrder.processOrderNumber,
      orderNumber: data.orderNumber,
      rendererVersion: EMBROIDERY_WORK_ORDER_RENDERER_VERSION,
    },
  });
  const document = await saveDocumentRecord({
    companyId: detail.processOrder.companyId,
    userId: detail.sourceOrder?.userId ?? null,
    documentType: "embroidery_work_order_pdf",
    entityType: "process_order",
    entityId: detail.processOrder.id,
    documentNumber,
    templateId,
    file,
    filename,
    generatedAt,
    metadata: {
      processOrderNumber: detail.processOrder.processOrderNumber,
      orderNumber: data.orderNumber,
      rendererVersion: EMBROIDERY_WORK_ORDER_RENDERER_VERSION,
    },
  });
  auditDocument({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "pdf_generated",
    companyId: detail.processOrder.companyId,
    entityType: "process_order",
    entityId: detail.processOrder.id,
    document,
    metadata: {
      documentNumber,
      regenerated: Boolean(input.forceRegenerate),
    },
  });
  return { document, idempotent: false };
}

export async function getEmbroideryWorkOrderPdfSignedUrl(input: {
  processOrderId: string;
  request?: Request;
  actorId?: string | null;
}): Promise<DocumentSignedUrlResult> {
  const detail = await getProcessOrderDetail(input.processOrderId);
  if (!detail) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  const document = await latestGeneratedDocument({
    companyId: detail.processOrder.companyId,
    entityType: "process_order",
    entityId: detail.processOrder.id,
    documentType: "embroidery_work_order_pdf",
  });
  if (!document) {
    throw createApiError("NOT_FOUND", "Bordir Work Order PDF belum tersedia.", 404);
  }
  return signedUrlForDocument({
    document,
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
  });
}

export async function generateProductionWorkOrderPdf(input: GenerateProductionWorkOrderPdfInput) {
  const config = getDocumentRuntimeConfig();
  const templateId = input.templateId ?? config.defaultProductionWorkOrderTemplate;
  if (!isProductionWorkOrderTemplate(templateId)) throw createApiError("BAD_REQUEST", "Template Production Work Order tidak valid.", 400);
  const detail = await getProcessOrderDetail(input.processOrderId);
  if (!detail) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  if (detail.processOrder.processRoute !== "production") throw createApiError("BAD_REQUEST", "Production Work Order hanya untuk routing production.", 400);
  const quotation = detail.processOrder.quotationId
    ? await repositoryRegistry.quotations.getById(detail.processOrder.quotationId)
    : null;
  const brief = quotation?.productionBrief;
  if (!brief) throw createApiError("BAD_REQUEST", "Brief produksi belum tersedia pada quotation.", 400);
  const briefApproval = getBriefApprovalStatus(brief);
  if (
    briefApproval === "pending_customer_approval" ||
    briefApproval === "revision_requested"
  ) {
    throw createApiError("BAD_REQUEST", "Brief produksi harus disetujui customer sebelum PWO dibuat.", 400);
  }

  const lookup = { companyId: detail.processOrder.companyId, entityType: "process_order" as const, entityId: detail.processOrder.id, documentType: "production_work_order_pdf" as const };
  const existing = await latestGeneratedDocument(lookup);
  if (existing && !input.forceRegenerate) return { document: existing, idempotent: true };
  if (existing) await documentRepository.update(existing.id,{status:"expired",deletedAt:new Date().toISOString()});
  const previous = existing ?? (await documentRepository.listByEntity(lookup))[0];
  const now=new Date();
  const all=previous||!documentRepository.listAll?[]:await documentRepository.listAll();
  const sequence=nextMonthlyDocumentSequence({existingNumbers:all.map(d=>d.documentNumber),prefix:"PWO",processRoute:"production",date:now});
  const documentNumber=previous?.documentNumber??safeDocumentNumber({documentType:"production_work_order_pdf",processRoute:"production",sequence,date:now});
  const generatedAt=now.toISOString();
  const data=mapProcessOrderToProductionWorkOrderPdfData({detail,quotation,documentNumber,generatedAt});
  const pdf=renderProductionWorkOrderPdfByTemplate(templateId,data);
  const filename=`${documentNumber.replaceAll("/","-")}.pdf`;
  const file=await uploadGeneratedPdf({companyId:detail.processOrder.companyId,userId:detail.sourceOrder?.userId??null,documentType:"production_work_order_pdf",documentNumber,filename,data:pdf,metadata:{documentType:"production_work_order_pdf",entityType:"process_order",entityId:detail.processOrder.id,templateId,rendererVersion:PRODUCTION_WORK_ORDER_RENDERER_VERSION}});
  const document=await saveDocumentRecord({companyId:detail.processOrder.companyId,userId:detail.sourceOrder?.userId??null,documentType:"production_work_order_pdf",entityType:"process_order",entityId:detail.processOrder.id,documentNumber,templateId,file,filename,generatedAt,metadata:{processOrderNumber:detail.processOrder.processOrderNumber,rendererVersion:PRODUCTION_WORK_ORDER_RENDERER_VERSION}});
  auditDocument({request:input.request,actorId:input.actorId,actorType:"internal",action:"pdf_generated",companyId:detail.processOrder.companyId,entityType:"process_order",entityId:detail.processOrder.id,document,metadata:{documentNumber,regenerated:Boolean(input.forceRegenerate)}});
  return {document,idempotent:false};
}

export async function getProductionWorkOrderPdfSignedUrl(input:{processOrderId:string;request?:Request;actorId?:string|null}):Promise<DocumentSignedUrlResult>{
  const detail=await getProcessOrderDetail(input.processOrderId);
  if(!detail) throw createApiError("NOT_FOUND","Process order tidak ditemukan.",404);
  const document=await latestGeneratedDocument({companyId:detail.processOrder.companyId,entityType:"process_order",entityId:detail.processOrder.id,documentType:"production_work_order_pdf"});
  if(!document) throw createApiError("NOT_FOUND","Production Work Order PDF belum tersedia.",404);
  return signedUrlForDocument({document,request:input.request,actorId:input.actorId,actorType:"internal"});
}

export async function generateDesignApprovalSheetPdf(
  input: GenerateDesignApprovalSheetPdfInput,
) {
  const config = getDocumentRuntimeConfig();
  const templateId = input.templateId ?? config.defaultDesignApprovalSheetTemplate;
  if (!isDesignApprovalSheetTemplate(templateId)) {
    throw createApiError("BAD_REQUEST", "Template Lembar Approval Desain tidak valid.", 400);
  }
  const quotation = await repositoryRegistry.quotations.getById(input.quotationId);
  if (!quotation) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  const brief = quotation.productionBrief;
  if (
    quotation.source !== "custom_request" ||
    !brief ||
    !(brief.technicalSpecifications ?? []).length
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Lembar approval desain hanya untuk permintaan Full Custom dengan brief produksi.",
      400,
    );
  }

  const lookup = {
    companyId: quotation.companyId,
    entityType: "quotation" as const,
    entityId: quotation.id,
    documentType: "design_approval_sheet_pdf" as const,
  };
  const activeSignatureCount = (brief.signatures ?? []).filter(
    (signature) => !signature.revokedAt,
  ).length;
  // Idempoten per isi brief: revisi baru, ttd baru, atau renderer baru memicu regen.
  const sheetFingerprint = [
    templateId,
    DESIGN_APPROVAL_SHEET_RENDERER_VERSION,
    brief.revisionNo ?? 0,
    activeSignatureCount,
    (brief.technicalSpecifications ?? [])
      .map((garment) => `${garment.id}:${garment.figureFrontFileId ?? "-"}:${garment.figureBackFileId ?? "-"}`)
      .join("|"),
  ].join("::");
  const existing = await latestGeneratedDocument(lookup);
  if (existing && !input.forceRegenerate && existing.metadata.sheetFingerprint === sheetFingerprint) {
    return { document: existing, idempotent: true };
  }
  if (existing) {
    await documentRepository.update(existing.id, {
      status: "expired",
      deletedAt: new Date().toISOString(),
    });
  }

  const previous = existing ?? (await documentRepository.listByEntity(lookup))[0];
  const now = new Date();
  const allDocuments = previous || !documentRepository.listAll
    ? []
    : await documentRepository.listAll();
  const sequence = nextMonthlyDocumentSequence({
    existingNumbers: allDocuments.map((document) => document.documentNumber),
    prefix: "DAS",
    processRoute: "production",
    date: now,
  });
  const documentNumber = previous?.documentNumber ?? safeDocumentNumber({
    documentType: "design_approval_sheet_pdf",
    processRoute: "production",
    sequence,
    date: now,
  });
  const generatedAt = now.toISOString();
  const data = await mapQuotationToDesignApprovalSheetPdfData({
    quotation,
    documentNumber,
    generatedAt,
  });
  const pdf = renderDesignApprovalSheetPdfByTemplate(templateId, data);
  const filename = `${documentNumber.replaceAll("/", "-")}.pdf`;
  const file = await uploadGeneratedPdf({
    companyId: quotation.companyId,
    userId: quotation.userId,
    documentType: "design_approval_sheet_pdf",
    documentNumber,
    filename,
    data: pdf,
    metadata: {
      documentType: "design_approval_sheet_pdf",
      entityType: "quotation",
      entityId: quotation.id,
      templateId,
      rendererVersion: DESIGN_APPROVAL_SHEET_RENDERER_VERSION,
    },
  });
  const document = await saveDocumentRecord({
    companyId: quotation.companyId,
    userId: quotation.userId,
    documentType: "design_approval_sheet_pdf",
    entityType: "quotation",
    entityId: quotation.id,
    documentNumber,
    templateId,
    file,
    filename,
    generatedAt,
    metadata: {
      quotationNumber: quotation.quotationNumber,
      revisionNo: brief.revisionNo ?? 0,
      sheetFingerprint,
      rendererVersion: DESIGN_APPROVAL_SHEET_RENDERER_VERSION,
    },
  });
  auditDocument({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "pdf_generated",
    companyId: quotation.companyId,
    entityType: "quotation",
    entityId: quotation.id,
    document,
    metadata: {
      documentNumber,
      revisionNo: brief.revisionNo ?? 0,
      regenerated: Boolean(input.forceRegenerate),
    },
  });
  return { document, idempotent: false };
}

export async function getDesignApprovalSheetPdfSignedUrl(input: {
  quotationId: string;
  request?: Request;
  actorId?: string | null;
}): Promise<DocumentSignedUrlResult> {
  const quotation = await repositoryRegistry.quotations.getById(input.quotationId);
  if (!quotation) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  const document = await latestGeneratedDocument({
    companyId: quotation.companyId,
    entityType: "quotation",
    entityId: quotation.id,
    documentType: "design_approval_sheet_pdf",
  });
  if (!document) {
    throw createApiError("NOT_FOUND", "Lembar Approval Desain PDF belum tersedia.", 404);
  }
  return signedUrlForDocument({
    document,
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
  });
}

const GENDER_ROW_LABELS: Record<string, string> = {
  men: "Pria",
  women: "Wanita",
  custom: "Custom",
  unspecified: "Umum",
};

async function mapQuotationToDesignApprovalSheetPdfData(input: {
  quotation: QuotationRequestRecord;
  documentNumber: string;
  generatedAt: string;
}): Promise<DesignApprovalSheetPdfData> {
  const { quotation } = input;
  const brief = quotation.productionBrief!;
  const config = getDocumentRuntimeConfig();
  const projectName = brief.projectName ?? quotation.companyName ?? "Proyek Ofissio";
  const projectInitials = buildProjectInitials(projectName);
  const [frontBytesById, backBytesById] = await Promise.all([
    resolveFigureBytesMap(
      quotation.companyId,
      (brief.technicalSpecifications ?? []).map((garment) => garment.figureFrontFileId),
    ),
    resolveFigureBytesMap(
      quotation.companyId,
      (brief.technicalSpecifications ?? []).map((garment) => garment.figureBackFileId),
    ),
  ]);

  const garments = (brief.technicalSpecifications ?? []).map((garment, index) => {
    const allSizes = Array.from(
      new Set(garment.sizeBreakdown.filter((entry) => entry.quantity > 0).map((entry) => entry.size)),
    );
    const rows = (["men", "women", "custom", "unspecified"] as const)
      .map((gender) => {
        const entries = garment.sizeBreakdown.filter(
          (entry) => entry.quantity > 0 && (entry.gender ?? "unspecified") === gender,
        );
        if (!entries.length) return null;
        return {
          group: GENDER_ROW_LABELS[gender] ?? "Umum",
          cells: allSizes.map((size) => ({
            size,
            quantity: entries
              .filter((entry) => entry.size === size)
              .reduce((total, entry) => total + entry.quantity, 0),
          })),
          total: entries.reduce((total, entry) => total + entry.quantity, 0),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const materialSpec = garment.specifications.find((spec) => spec.key.toLowerCase().includes("bahan"));
    const colorSpec = garment.specifications.find((spec) => spec.key.toLowerCase().includes("warna"));

    return {
      itemCode: `${projectInitials}-${String(index + 1).padStart(3, "0")}`,
      garmentType: garment.garmentType,
      projectName,
      clientLabel: [quotation.companyName, quotation.picName].filter(Boolean).join(" — "),
      poNumber: brief.externalReference ?? null,
      deadline: brief.targetDate ?? null,
      totalQuantity: garment.sizeBreakdown.reduce((total, entry) => total + entry.quantity, 0),
      materialLabel: materialSpec?.option ?? materialSpec?.detail ?? brief.materialPreference ?? null,
      colorLabel: colorSpec?.option ?? colorSpec?.detail ?? brief.colorPreference ?? null,
      sizeNotes: brief.sizeNotes ?? null,
      specifications: garment.specifications
        .filter((spec) => spec.status !== "not_used")
        .map((spec) => ({
          label: spec.label,
          value: [spec.option, spec.detail, spec.notes].filter(Boolean).join(", ") || "-",
          measurements: spec.measurements ?? null,
          status: spec.status,
        })),
      areas: (garment.embroideryAreas ?? []).map((area) => ({
        label: area.label,
        zone: area.zone,
        zoneLabel: zoneLabel(area.zone),
        techniqueLabel: embroideryTechniqueLabel(area.technique),
        positionNote: area.positionNote,
        widthCm: area.widthCm,
        heightCm: area.heightCm,
        offsetXCm: area.offsetXCm,
        offsetYCm: area.offsetYCm,
        logoFileName: area.logoFileName,
        notes: area.notes,
      })),
      allSizes,
      sizeRows: rows,
      adjustments: (brief.customAdjustments ?? []).map((adjustment) => ({
        size: adjustment.size,
        color: adjustment.color,
        changeNote: adjustment.changeNote,
        quantity: adjustment.quantity,
      })),
      figures: {
        front: figureEntry(garment.figureFrontFileId, "front", frontBytesById),
        back: figureEntry(garment.figureBackFileId, "back", backBytesById),
      },
    };
  });

  return {
    documentNumber: input.documentNumber,
    quotationNumber: quotation.quotationNumber,
    projectName,
    clientName: quotation.picName ?? quotation.companyName,
    clientCompany: quotation.companyName,
    poNumber: brief.externalReference ?? null,
    deadline: brief.targetDate ?? null,
    revisionNo: brief.revisionNo ?? 0,
    revisedAt: brief.revisedAt ?? null,
    approvalStatus: getBriefApprovalStatus(brief),
    createdAt: quotation.createdAt,
    generatedAt: input.generatedAt,
    garments,
    signatures: (brief.signatures ?? [])
      .filter((signature) => !signature.revokedAt)
      .map((signature) => ({
        party: signature.party,
        signerName: signature.signerName,
        signerTitle: signature.signerTitle,
        signedAt: signature.signedAt,
      })),
    consentText: BRIEF_APPROVAL_CONSENT_TEXT,
    productionNotes: quotation.internalNotes?.[0]?.note ?? null,
    locationLabel: config.companyLocationLabel,
    contactTel: config.contactTel,
    contactWeb: config.contactWeb,
    contactEmail: config.contactEmail,
    rendererVersion: DESIGN_APPROVAL_SHEET_RENDERER_VERSION,
  };
}

function figureEntry(
  fileId: string | null | undefined,
  side: "front" | "back",
  bytesById: Map<string, Uint8Array>,
) {
  if (!fileId) return null;
  const bytes = bytesById.get(fileId);
  if (!bytes) return null;
  return { side, bytes, fileName: fileId };
}

/** Ambil bytes figur dari storage sekali per fileId (dedupe antar garment). */
async function resolveFigureBytesMap(companyId: string, fileIds: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(fileIds.filter((fileId): fileId is string => Boolean(fileId))));
  const entries = await Promise.all(
    uniqueIds.map(async (fileId) => {
      const bytes = await fetchFigureBytes(companyId, fileId);
      return bytes ? ([fileId, bytes] as const) : null;
    }),
  );
  return new Map(entries.filter((entry): entry is Readonly<[string, Uint8Array]> => entry !== null));
}

async function fetchFigureBytes(companyId: string, fileId: string): Promise<Uint8Array | null> {
  try {
    const file = await storageService.getFileById({ companyId, fileId });
    if (!file || file.status === "deleted" || file.status === "rejected") return null;
    if (file.mimeType !== "image/jpeg" && file.mimeType !== "image/png") return null;
    const signed = await storageService.getSignedFileUrl({ companyId, fileId });
    if (!signed) return null;
    const response = await fetch(signed.signedUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024) return null;
    return bytes;
  } catch (error) {
    logInternalError(error, {
      area: "documents",
      action: "design_approval_figure_fetch_failed",
      companyId,
      fileId,
    });
    return null;
  }
}

function buildProjectInitials(projectName: string) {
  const initials = projectName
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .split(/[\s-]+/)
    .filter((word) => word.length > 2 || /^\d+$/.test(word))
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return initials.padEnd(2, "X") || "OF";
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
  if (
    isQuotationFinalForPdf(quotation.status) &&
    document.metadata.final !== true
  ) {
    throw createApiError(
      "NOT_FOUND",
      "PDF final quotation belum tersedia.",
      404,
    );
  }
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
  const customerQuotation = sanitizeQuotationForCustomer(input.quotation);
  const config = getDocumentRuntimeConfig();
  return {
    quotation: customerQuotation,
    documentNumber: input.documentNumber,
    generatedAt: input.generatedAt,
    isFinal: input.isFinal,
    items: customerQuotation.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      selectedColor: item.selectedColor,
      sizeSummary: sizeMatrixSummary(item.sizeMatrix),
      totalQty: item.totalQty,
      unitPrice: item.finalUnitPrice ?? item.unitPrice,
      productSubtotal:
        (item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom) * item.totalQty,
      embroideryTotal: item.embroideryTotal,
      discountAmount: item.discountAmount,
      lineTotal: item.finalLineTotal ?? item.lineSubtotal,
      customizationSummary: quotationCustomizationSummary(item),
    })),
    terms: [
      customerQuotation.validUntil
        ? `Harga berlaku sampai ${formatInvoiceDate(customerQuotation.validUntil)}.`
        : "Harga mengikuti valid until yang dikonfirmasi sales.",
      "Produksi/custom mengikuti approval final dari customer.",
      "Harga final tidak termasuk perubahan spesifikasi setelah approval.",
      "Pembayaran mengikuti invoice/payment instruction dari Ofissio.",
    ],
    locationLabel: config.companyLocationLabel,
    signerName: config.signerName,
    signerTitle: config.signerTitle,
    contactTel: config.contactTel,
    contactWeb: config.contactWeb,
    contactEmail: config.contactEmail,
  };
}

function quotationCustomizationSummary(
  item: QuotationRequestRecord["items"][number],
) {
  if (item.embroideryPlacements.length === 0) return item.customization ?? "-";
  const placements = item.embroideryPlacements.map((placement) =>
    [
      zoneLabel(placement.zone),
      embroideryTechniqueLabel(placement.technique),
      embroideryTextSummary(placement),
      `${placement.widthCm}x${placement.heightCm} cm`,
      `Rotasi ${placement.rotation} deg`,
      placement.notes,
    ]
      .filter(Boolean)
      .join(" / "),
  );
  if (item.embroideryTotal > 0) {
    placements.push(`Biaya bordir ${formatRupiah(item.embroideryTotal)}`);
  }
  return placements.join("; ");
}

export function mapOrderToInvoicePdfData(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord | null;
  invoiceNumber: string;
  generatedAt: string;
}): InvoicePdfData {
  const config = getDocumentRuntimeConfig();
  const orderNumber = input.order.orderNumber ?? input.order.id;
  const subtotal = input.order.items.reduce(
    (total, item) =>
      total + (item.finalUnitPrice ?? item.priceFrom) * item.totalQty,
    0,
  );
  const customizationTotal = input.order.items.reduce(
    (total, item) =>
      total + (item.customizationTotal ?? item.embroideryTotal ?? 0),
    0,
  );
  const shippingTotal = input.order.calculation.shippingFee;
  const taxTotal = input.order.calculation.tax;
  const grandTotal = input.order.calculation.grandTotal;
  const dpp = Math.max(0, grandTotal - shippingTotal - taxTotal);
  const discountTotal = Math.max(0, subtotal + customizationTotal - dpp);
  const taxEnabled = input.order.calculation.taxEnabled ?? taxTotal > 0;
  const inferredTaxRate = taxTotal > 0 && dpp > 0
    ? Math.round((taxTotal / dpp) * 10_000) / 100
    : 0;
  const taxRate = input.order.calculation.taxRate ?? inferredTaxRate;
  const taxLabel = input.order.calculation.taxLabel?.trim() || "PPN";
  const paymentProvider = input.payment?.provider ?? "mock";
  const paymentQr = getPaymentQrForInvoice(input.payment);
  const paymentLink = publicPaymentUrl(input.payment?.paymentUrl ?? null);
  const paymentQrValue =
    paymentQr.kind === "payment_url" ? paymentLink : paymentQr.value;
  const amountPaid = input.payment?.status === "paid" ? input.payment.amount : 0;
  return {
    invoiceNumber: input.invoiceNumber,
    orderNumber,
    quotationNumber: input.order.quotationId ?? null,
    invoiceDate: input.generatedAt,
    dueDate: null,
    paymentStatus: input.payment?.status ?? invoiceStatusFromOrder(input.order.status),
    paymentProvider,
    paymentReference: input.payment?.referenceId ?? null,
    paymentLink,
    paymentQr: paymentQrValue,
    paymentQrKind: paymentQr.kind,
    paymentExpiry: input.payment?.expiredAt ?? null,
    companyName: input.order.companyId,
    companyAddress: null,
    picName: input.order.userId,
    picPhone: null,
    locationLabel: config.companyLocationLabel,
    items: input.order.items.map((item) => ({
      description: invoiceItemDescription(item),
      unitPrice: item.finalUnitPrice ?? item.priceFrom,
      qty: item.totalQty,
      total:
        (item.finalUnitPrice ?? item.priceFrom) * item.totalQty +
        (item.customizationTotal ?? item.embroideryTotal ?? 0),
    })),
    subtotal,
    customizationTotal,
    discountTotal,
    uniqueCode: input.payment?.uniqueCode ?? 0,
    dpp,
    taxEnabled,
    taxLabel,
    taxRate,
    taxTotal,
    shippingTotal,
    grandTotal,
    amountPaid,
    balanceDue: Math.max(0, grandTotal - amountPaid),
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

export function mapProcessOrderToEmbroideryWorkOrderPdfData(input: {
  detail: ProcessOrderDetail;
  documentNumber: string;
  generatedAt: string;
}): EmbroideryWorkOrderPdfData {
  const config = getDocumentRuntimeConfig();
  const { processOrder, sourceOrder } = input.detail;
  return {
    workOrderNumber: input.documentNumber,
    processOrderNumber: processOrder.processOrderNumber,
    orderNumber: sourceOrder?.orderNumber ?? processOrder.ofissioOrderId,
    quotationNumber: processOrder.quotationId,
    companyName: sourceOrder?.companyId ?? processOrder.companyId,
    createdAt: processOrder.createdAt,
    deadline: processOrder.deadline,
    priority: processOrder.priority,
    assignedTeam: processOrder.assignedTeam,
    notes: processOrder.notes,
    items: input.detail.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      selectedColor: item.selectedColor,
      totalQty: item.totalQty,
      sizeSummary: sizeMatrixSummary(item.sizeMatrix),
      instruction: item.customization.text,
      placements: item.customization.placements.map((placement) => ({
        zone: zoneLabel(placement.zone),
        technique: embroideryTechniqueLabel(placement.technique),
        logoFileName: placement.logoFileName ?? null,
        widthCm: placement.widthCm,
        heightCm: placement.heightCm,
        rotation: placement.rotation,
        notes: placement.textBordir ? embroideryTextSummary(placement) : placement.notes ?? null,
      })),
    })),
    locationLabel: config.companyLocationLabel,
    signerName: config.signerName,
    signerTitle: config.signerTitle,
    contactTel: config.contactTel,
    contactWeb: config.contactWeb,
    contactEmail: config.contactEmail,
    generatedAt: input.generatedAt,
  };
}

export function mapProcessOrderToProductionWorkOrderPdfData(input:{
  detail:ProcessOrderDetail;
  quotation:QuotationRequestRecord;
  documentNumber:string;
  generatedAt:string;
}):ProductionWorkOrderPdfData{
  const base=mapProcessOrderToEmbroideryWorkOrderPdfData({detail:input.detail,documentNumber:input.documentNumber,generatedAt:input.generatedAt});
  const brief=input.quotation.productionBrief;
  if(!brief) throw createApiError("BAD_REQUEST","Brief produksi belum tersedia.",400);
  return {
    ...base,
    projectName:brief.projectName?.trim()||"Proyek Produksi Ofissio",
    garmentType:brief.garmentType?.trim()||"Belum ditentukan",
    usageContext:brief.usageContext??null,
    designDescription:brief.designDescription,
    materialPreference:brief.materialPreference??null,
    colorPreference:brief.colorPreference??null,
    sizeNotes:brief.sizeNotes??null,
    targetDate:brief.targetDate??null,
    approvalStatus:brief.approvalStatus??"approved",
    revisionNote:brief.approvalRevisionNote??null,
    technicalSpecifications:(brief.technicalSpecifications??[]).flatMap(group=>group.specifications.filter(spec=>spec.status!=="not_used").map(spec=>({label:`${group.garmentType} / ${spec.label}`,value:[spec.option,spec.detail,spec.notes].filter(Boolean).join(" / ")||spec.status}))),
    referenceFiles:(brief.referenceFiles??[]).map(file=>({label:"Referensi desain",fileName:file.filename})),
  };
}

function publicPaymentUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    const baseUrl = process.env.APP_URL?.trim() || "http://localhost:8000";
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return value;
    }
  }
}

function invoiceItemDescription(item: PaymentOrderRecord["items"][number]) {
  const product = [
    item.productName,
    `SKU ${item.sku}`,
    `Warna ${item.selectedColor}`,
    `Ukuran ${sizeMatrixSummary(item.sizeMatrix)}`,
  ];
  const placements = item.embroideryPlacements.map((placement) =>
    [
      zoneLabel(placement.zone),
      embroideryTechniqueLabel(placement.technique),
      embroideryTextSummary(placement),
      `${placement.widthCm}x${placement.heightCm} cm`,
      `Rotasi ${placement.rotation} deg`,
    ]
      .filter(Boolean)
      .join(" / "),
  );
  const customization = placements.length > 0
    ? `Customization: ${placements.join("; ")}. Biaya bordir ${formatRupiah(
        item.customizationTotal ?? item.embroideryTotal ?? 0,
      )}`
    : item.customization;
  return [...product, customization].filter(Boolean).join(" | ");
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

function auditDocument(input: {
  request?: Request;
  actorId: string;
  actorType: "internal" | "customer" | "system";
  companyId?: string | null;
  action: "pdf_generated" | "pdf_generation_failed";
  entityType: "quotation" | "order" | "process_order";
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
