import "server-only";

import { randomUUID } from "node:crypto";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { syncCheckoutCart } from "@/features/checkout/checkout-cart.service";
import type { EmailSendResult, EmailStatus } from "@/features/email/email.types";
import { emailService } from "@/features/email/email.service";
import type { PaymentOrderRecord, PaymentRecord } from "@/features/payment/payment.types";
import { createWooCommerceOrderFromQuotation } from "@/features/orders/woocommerce-order-sync.service";
import { deriveOrderProcessRouting } from "@/features/orders/order-routing.service";
import { mapPaymentOrderToTracking } from "@/features/tracking/tracking.service";
import {
  createOrderCreatedNotification,
  createQuotationAcceptedNotification,
  createQuotationRequestedNotification,
} from "@/features/admin-notifications/admin-notification.service";
import { getGlobalTaxSettings } from "@/features/tax/tax.service";
import { validatePromotionCode } from "@/features/promotions/promotion.service";
import { storageService } from "@/features/storage/storage.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";
import type { AuditActorType } from "@/lib/security/security.types";

import { quotationRepository } from "./quotation.repository";
import {
  getBriefApprovalStatus,
  normalizeProductionBrief,
  requiresCustomerBriefApproval,
  requirementTypeLabel,
  resolveQuotationRequirement,
} from "./quotation-requirement";
import type {
  BriefCustomerRequestSnapshot,
  BriefSignature,
  BriefSignatureParty,
  CreateCustomQuotationRequestInput,
  CreateQuotationRequestInput,
  CreateQuotationRequestResult,
  ProductionRequestBrief,
  QuotationEventRecord,
  QuotationEventType,
  QuotationPricingInput,
  QuotationRequestRecord,
  QuotationStatus,
  EmbroideryConsultationEstimate,
  ProductionPlan,
} from "./quotation.types";
import { BRIEF_APPROVAL_CONSENT_TEXT } from "./quotation.validation";
import type { EmbroideryEstimatePayload } from "./embroidery-estimate.validation";
import type { ProductionPlanPayload } from "./production-plan.validation";
import { buildCustomProductionItem } from "./custom-quotation";
import {
  buildQuotationItems,
  calculateQuotationPricing,
  canAdminTransitionQuotationStatus,
  canCustomerAcceptQuotation,
  finalizeQuotationForCustomer,
  getQuotationAcceptDisabledReason,
  hasFinalQuotationPricing,
  isConvertableQuotationStatus,
  isQuotationExpired,
  isQuotationPricingEditable,
  isQuotationSendable,
  isSuccessfulQuotationEmailStatus,
  normalizeQuotationRecord,
  safeMoney,
} from "./quotation.utils";

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
      selectedSleeve: item.selectedSleeve,
      sizeMatrix: item.sizeMatrix as never,
      customization: item.customization,
      embroideryPlacements: item.embroideryPlacements as never,
    })),
  });
  const now = new Date().toISOString();
  const promotion = input.couponCode
    ? await validatePromotionCode({
        code: input.couponCode,
        email: input.userEmail,
        lines: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.totalQty,
          subtotal: item.finalEstimatedTotal,
        })),
      })
    : null;
  if (promotion && !promotion.valid) {
    throw createApiError("BAD_REQUEST", promotion.message, 400);
  }
  const id = `quo_${randomUUID()}`;
  const requirement = resolveQuotationRequirement({
    requestedType: input.requirementType,
    items: cart.items,
  });
  const quotationNumber = await buildQuotationNumber(
    now,
    requirement.requestedProcessRoute,
  );
  const productionBrief =
    requirement.requirementType === "custom_production"
      ? normalizeProductionBrief(input.productionBrief)
      : null;
  if (
    requirement.requirementType === "custom_production" &&
    !productionBrief
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Ringkasan desain atau kebutuhan produksi khusus wajib diisi.",
      400,
    );
  }
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
    requirementType: requirement.requirementType,
    requestedProcessRoute: requirement.requestedProcessRoute,
    productionBrief,
    items: cart.items,
    createdAt: now,
    internalUrl: buildPublicUrl(`/admin/quotations/${id}`),
    customerUrl: buildPublicUrl(`/quotes/${id}`),
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
  const taxState = await getGlobalTaxSettings();
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
    status: "submitted",
    source: "web_cart",
    items: buildQuotationItems(cart.items, id, now),
    subtotalEstimate: cart.subtotal,
    internalNotes: [],
    salesNotes: null,
    customerMessage: null,
    subtotal: null,
    discountTotal: promotion?.valid ? promotion.discountTotal : 0,
    couponCode: promotion?.valid ? promotion.code : null,
    taxEnabled: taxState.settings.enabled,
    taxRate: taxState.settings.rate,
    taxLabel: taxState.settings.label,
    taxTotal: 0,
    shippingEstimate: 0,
    grandTotal: null,
    currency: "IDR",
    validUntil: null,
    salesEmail: null,
    customerEmail: picEmail,
    totalQty: cart.totalQty,
    embroideryPointCount: cart.items.reduce(
      (total, item) => total + item.embroideryPlacements.length,
      0,
    ),
    requirementType: requirement.requirementType,
    requestedProcessRoute: requirement.requestedProcessRoute,
    productionBrief,
    customerNotes: input.customerNotes,
    shippingDestination: input.shippingDestination,
    emailStatus,
    emailLogIds: emails.map((email) => email.id),
    emailResults: emails,
    acceptedAt: null,
    rejectedAt: null,
    convertedOrderId: null,
    wooOrderId: null,
    wooOrderNumber: null,
    wooSyncStatus: "disabled",
    wooSyncError: null,
    wooSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await quotationRepository.save(record);
  await notifyQuotationRequestedSafely({
    quotation: record,
    actorId: input.userId,
    request,
  });
  await addQuotationEvent({
    quotation: record,
    actorId: input.userId,
    actorType: "customer",
    eventType: "submitted",
    oldStatus: null,
    newStatus: "submitted",
    note: input.customerNotes,
    metadata: {
      quotationNumber,
      totalQty: cart.totalQty,
      itemCount: cart.items.length,
      requirementType: requirement.requirementType,
      requestedProcessRoute: requirement.requestedProcessRoute,
      emailStatus,
    },
  });
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
      requirementType: requirementTypeLabel(requirement.requirementType),
      requestedProcessRoute: requirement.requestedProcessRoute,
      emailStatus,
    },
  });
  return { quotation: record, emails };
}

export async function createCustomQuotationRequest(
  input: CreateCustomQuotationRequestInput,
  request?: Request,
): Promise<CreateQuotationRequestResult> {
  const actorType = input.actorType ?? "customer";
  const sendCustomerConfirmation = input.sendCustomerConfirmation ?? true;
  const now = new Date().toISOString();
  const id = `quo_${randomUUID()}`;
  const quotationNumber = await buildQuotationNumber(now, "production");
  // Jalur customer hanya boleh membawa kebutuhan desain — field internal
  // (spesifikasi teknis, penyesuaian, No. PO, kanal intake) di-strip agar
  // tidak bisa disuntikkan lewat raw JSON.
  const productionBrief = normalizeProductionBrief(
    actorType === "internal"
      ? input.productionBrief
      : {
          ...input.productionBrief,
          intakeChannel: "customer_portal",
          externalReference: null,
          technicalSpecifications: undefined,
          customAdjustments: undefined,
        },
  );
  if (
    !productionBrief?.projectName ||
    !productionBrief.garmentType ||
    !productionBrief.estimatedQuantity ||
    productionBrief.designDescription.length < 10
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Brief full custom belum lengkap. Isi nama proyek, jenis pakaian, jumlah, dan kebutuhan desain.",
      400,
    );
  }

  const referenceFiles = await resolveCustomReferenceFiles({
    companyId: input.companyId,
    fileIds: input.referenceFileIds,
  });
  const requireApproval =
    actorType === "internal" && (input.requireCustomerApproval ?? true);
  const completeBrief = normalizeProductionBrief({
    ...productionBrief,
    referenceFiles,
    approvalStatus:
      actorType === "internal"
        ? requireApproval
          ? "pending_customer_approval"
          : "not_required"
        : "approved",
    approvalRequestedAt: requireApproval ? now : null,
    approvedAt: actorType === "customer" ? now : null,
    approvalRevisionNote: null,
  });
  if (!completeBrief) {
    throw createApiError("BAD_REQUEST", "Brief full custom belum valid.", 400);
  }

  const customItem = buildCustomProductionItem({
    quotationId: id,
    brief: completeBrief,
  });
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
    requirementType: "custom_production" as const,
    requestedProcessRoute: "production" as const,
    productionBrief: completeBrief,
    items: [customItem],
    createdAt: now,
    internalUrl: buildPublicUrl(`/admin/quotations/${id}`),
    customerUrl: buildPublicUrl(`/quotes/${id}`),
  };
  const emailTasks = actorType === "internal"
    ? []
    : [
        emailService.sendQuotationRequestToSales({
          companyId: input.companyId,
          userId: input.userId,
          context: emailContext,
          request,
        }),
      ];
  if (sendCustomerConfirmation) {
    emailTasks.push(emailService.sendQuotationConfirmationToCustomer({
      companyId: input.companyId,
      userId: input.userId,
      customerEmail: picEmail,
      context: emailContext,
      request,
    }));
  }
  const emails = await Promise.all(emailTasks);
  const taxState = await getGlobalTaxSettings();
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
    status: actorType === "internal" ? "draft" : "submitted",
    source: "custom_request",
    items: buildQuotationItems([customItem], id, now),
    subtotalEstimate: 0,
    internalNotes: [],
    salesNotes: null,
    customerMessage: null,
    subtotal: null,
    discountTotal: 0,
    taxEnabled: taxState.settings.enabled,
    taxRate: taxState.settings.rate,
    taxLabel: taxState.settings.label,
    taxTotal: 0,
    shippingEstimate: 0,
    grandTotal: null,
    currency: "IDR",
    validUntil: null,
    salesEmail: null,
    customerEmail: picEmail,
    totalQty: completeBrief.estimatedQuantity ?? 1,
    embroideryPointCount: 0,
    requirementType: "custom_production",
    requestedProcessRoute: "production",
    productionBrief: completeBrief,
    customerNotes: input.customerNotes,
    shippingDestination: null,
    emailStatus,
    emailLogIds: emails.map((email) => email.id),
    emailResults: emails,
    acceptedAt: null,
    rejectedAt: null,
    convertedOrderId: null,
    wooOrderId: null,
    wooOrderNumber: null,
    wooSyncStatus: "disabled",
    wooSyncError: null,
    wooSyncedAt: null,
    quotationPdfDocumentId: null,
    quotationPdfGeneratedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await quotationRepository.save(record);
  if (actorType !== "internal") {
    await notifyQuotationRequestedSafely({
      quotation: record,
      actorId: input.userId,
      request,
    });
  }
  await Promise.all(
    referenceFiles.map((file) =>
      storageService
        .markFileAsUsed({ companyId: input.companyId, fileId: file.fileId, request })
        .catch((error) =>
          logInternalError(error, {
            area: "quotation_custom_request",
            action: "reference_file_mark_used_failed",
            fileId: file.fileId,
          }),
        ),
    ),
  );
  await addQuotationEvent({
    quotation: record,
    actorId: input.userId,
    actorType,
    eventType: actorType === "internal" ? "status_changed" : "submitted",
    oldStatus: null,
    newStatus: actorType === "internal" ? "draft" : "submitted",
    note: input.customerNotes,
    metadata: {
      source: "custom_request",
      briefApprovalStatus: getBriefApprovalStatus(completeBrief),
      intakeChannel: completeBrief.intakeChannel ?? "customer_portal",
      quotationNumber,
      totalQty: record.totalQty,
      itemCount: 1,
      referenceFileCount: referenceFiles.length,
      requirementType: "custom_production",
      requestedProcessRoute: "production",
      emailStatus,
    },
  });
  logAuditEvent({
    request,
    actorId: input.userId,
    actorType,
    companyId: input.companyId,
    action:
      actorType === "internal"
        ? "sales_assisted_custom_quotation_created"
        : "custom_quotation_request_created",
    entityType: "quotation",
    entityId: id,
    metadata: {
      quotationNumber,
      totalQty: record.totalQty,
      referenceFileCount: referenceFiles.length,
      requestedProcessRoute: "production",
      intakeChannel: completeBrief.intakeChannel ?? "customer_portal",
      emailStatus,
    },
  });
  return { quotation: record, emails };
}

async function resolveCustomReferenceFiles(input: {
  companyId: string;
  fileIds: string[];
}) {
  const fileIds = [...new Set(input.fileIds)].slice(0, 5);
  const files = await Promise.all(
    fileIds.map((fileId) =>
      storageService.getFileById({ companyId: input.companyId, fileId }),
    ),
  );
  return files.map((file, index) => {
    if (
      !file ||
      file.fileType !== "artwork" ||
      file.companyId !== input.companyId ||
      ["deleted", "rejected"].includes(file.status)
    ) {
      throw createApiError(
        "BAD_REQUEST",
        `File referensi ke-${index + 1} tidak valid atau bukan milik perusahaan Anda.`,
        400,
      );
    }
    return {
      fileId: file.id,
      filename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  });
}

export async function listQuotationRequests(companyId: string) {
  return (await quotationRepository.listByCompany(companyId)).map(normalizeQuotationRecord);
}

export async function getQuotationRequestById(id: string, companyId: string) {
  const quotation = await quotationRepository.getById(id);
  if (!quotation || quotation.companyId !== companyId) return null;
  return normalizeQuotationRecord(quotation);
}

export async function getQuotationEventsById(id: string, companyId: string) {
  const quotation = await quotationRepository.getById(id);
  if (!quotation || quotation.companyId !== companyId) return [];
  return quotationRepository.getEvents?.(id) ?? [];
}

export async function updateEmbroideryConsultationEstimate(input: {
  id: string;
  payload: EmbroideryEstimatePayload;
  actorId: string;
  request?: Request;
}) {
  const current = await quotationRepository.getById(input.id);
  if (!current) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  const now = new Date().toISOString();
  const { publishToCustomer, ...estimatePayload } = input.payload;
  const estimate: EmbroideryConsultationEstimate = {
    ...estimatePayload,
    status: publishToCustomer ? "sent_to_customer" : "estimate_ready",
    estimatedBy: input.actorId,
    estimatedAt: now,
  };
  const updated = await quotationRepository.update(input.id, { embroideryEstimate: estimate });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await quotationRepository.addEvent?.({
    id: `qev_${randomUUID()}`,
    quotationId: current.id,
    companyId: current.companyId,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: current.status,
    note: publishToCustomer ? "Estimasi bordir dikirim ke customer." : "Estimasi bordir disimpan sebagai draft.",
    metadata: { supervisorName: estimate.supervisorName, estimatedCompletionDate: estimate.estimatedCompletionDate, courierService: estimate.courierService },
    createdAt: now,
  });
  logAuditEvent({ request: input.request, actorId: input.actorId, actorType: "internal", companyId: current.companyId, action: "embroidery_estimate_updated", entityType: "quotation", entityId: current.id, metadata: { published: publishToCustomer } });
  return updated;
}

export async function updateProductionPlan(input: {
  id: string;
  payload: ProductionPlanPayload;
  actorId: string;
  request?: Request;
}) {
  const current = await quotationRepository.getById(input.id);
  if (!current) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  if (current.requirementType !== "custom_production") {
    throw createApiError("BAD_REQUEST", "Rencana produksi hanya berlaku untuk quotation production.", 400);
  }
  if (!current.grandTotal || current.grandTotal <= 0) {
    throw createApiError("BAD_REQUEST", "Lengkapi harga final sebelum menyusun termin DP.", 400);
  }
  const now = new Date().toISOString();
  const { publishToCustomer, ...payload } = input.payload;
  const depositAmount = Math.round(current.grandTotal * payload.depositPercent / 100);
  const plan: ProductionPlan = {
    ...payload,
    status: publishToCustomer ? "sent_to_customer" : "plan_ready",
    depositAmount,
    balanceAmount: Math.max(0, current.grandTotal - depositAmount),
    balanceDueStage: "after_production_before_shipping",
    plannedBy: input.actorId,
    plannedAt: now,
  };
  const updated = await quotationRepository.update(input.id, { productionPlan: plan });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await quotationRepository.addEvent?.({
    id: `qev_${randomUUID()}`,
    quotationId: current.id,
    companyId: current.companyId,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: current.status,
    note: publishToCustomer ? "Rencana produksi dan termin DP dikirim ke customer." : "Draft rencana produksi disimpan.",
    metadata: { estimatedCompletionDate: plan.estimatedCompletionDate, depositPercent: plan.depositPercent, depositAmount: plan.depositAmount },
    createdAt: now,
  });
  logAuditEvent({ request: input.request, actorId: input.actorId, actorType: "internal", companyId: current.companyId, action: "production_plan_updated", entityType: "quotation", entityId: current.id, metadata: { published: publishToCustomer, depositPercent: plan.depositPercent } });
  return normalizeQuotationRecord(updated);
}

function requireSalesAssistedBrief(quotation: QuotationRequestRecord) {
  const brief = quotation.productionBrief;
  if (
    quotation.source !== "custom_request" ||
    !brief ||
    // Brief portal hanya bisa diakses alur sales setelah diambil alih
    // (lihat startBriefEnrichment).
    (brief.intakeChannel === "customer_portal" && !brief.enrichedAt)
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Dokumen ini bukan brief Full Custom yang dibuat oleh sales.",
      400,
    );
  }
  return brief;
}

/**
 * Sales mengambil alih brief customer portal menjadi brief teknis:
 * permintaan awal customer disimpan sebagai snapshot (tidak ditimpa),
 * lalu editor brief/ttd/figur menjadi tersedia. Status approval tidak
 * berubah di tahap ini — pilihan minta ttd customer ada saat menyimpan
 * pengayaan (updateSalesAssistedBrief).
 */
export async function startBriefEnrichment(input: {
  id: string;
  actorId: string | null;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  const brief = current.productionBrief;
  if (current.source !== "custom_request" || !brief) {
    throw createApiError(
      "BAD_REQUEST",
      "Quotation ini tidak memiliki brief Full Custom.",
      400,
    );
  }
  if (brief.intakeChannel !== "customer_portal") {
    throw createApiError(
      "BAD_REQUEST",
      "Pengayaan hanya untuk brief yang berasal dari customer portal.",
      400,
    );
  }
  if (brief.enrichedAt) return normalizeQuotationRecord(current);

  const now = new Date().toISOString();
  const snapshot: BriefCustomerRequestSnapshot = {
    projectName: brief.projectName ?? null,
    garmentType: brief.garmentType ?? null,
    estimatedQuantity: brief.estimatedQuantity ?? null,
    usageContext: brief.usageContext ?? null,
    designDescription: brief.designDescription,
    materialPreference: brief.materialPreference,
    colorPreference: brief.colorPreference,
    sizeNotes: brief.sizeNotes,
    targetDate: brief.targetDate,
    referenceFiles: (brief.referenceFiles ?? []).map((file) => ({
      fileId: file.fileId,
      fileName: file.filename,
    })),
    capturedAt: now,
  };
  const nextBrief = normalizeProductionBrief({
    ...brief,
    enrichedAt: now,
    enrichedByUserId: input.actorId,
    customerRequestSnapshot: snapshot,
  });
  if (!nextBrief) {
    throw createApiError("BAD_REQUEST", "Brief Full Custom belum valid.", 400);
  }

  const updated = await quotationRepository.update(current.id, {
    productionBrief: nextBrief,
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  }
  const normalized = normalizeQuotationRecord(updated);

  await addQuotationEvent({
    quotation: normalized,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: current.status,
    note: "Sales mulai mengembangkan brief teknis dari permintaan customer (permintaan awal disimpan sebagai snapshot).",
    metadata: {
      briefApprovalStatus: nextBrief.approvalStatus,
      intakeChannel: nextBrief.intakeChannel,
      enrichedAt: now,
    },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: current.companyId,
    action: "customer_brief_enrichment_started",
    entityType: "quotation",
    entityId: current.id,
    metadata: { enrichedAt: now, referenceFileCount: snapshot.referenceFiles.length },
  });

  return normalized;
}

/**
 * Tanda tangan digital customer pada lembar approval brief:
 * approve = identitas + klausa wajib; request_revision = catatan wajib,
 * revisionNo naik dan semua ttd aktif dicabut.
 */
export async function signSalesAssistedBrief(input: {
  id: string;
  companyId: string;
  userId: string;
  action: "approve" | "request_revision";
  signerName?: string;
  signerTitle?: string;
  consentAccepted?: boolean;
  note?: string | null;
  request?: Request;
}) {
  const current = await requireCompanyQuotation(input.id, input.companyId);
  const brief = requireSalesAssistedBrief(current);

  const currentApproval = getBriefApprovalStatus(brief);
  if (input.action === "approve" && currentApproval === "approved") {
    return normalizeQuotationRecord(current);
  }
  const signerName = input.signerName?.trim() ?? "";
  const signerTitle = input.signerTitle?.trim() ?? "";
  if (input.action === "approve") {
    if (signerName.length < 2 || signerTitle.length < 2) {
      throw createApiError(
        "BAD_REQUEST",
        "Nama dan jabatan penandatangan wajib diisi.",
        400,
      );
    }
    if (input.consentAccepted !== true) {
      throw createApiError(
        "BAD_REQUEST",
        "Klausa persetujuan wajib dicentang sebelum menandatangani.",
        400,
      );
    }
  }
  if (input.action === "request_revision" && !input.note?.trim()) {
    throw createApiError(
      "BAD_REQUEST",
      "Jelaskan bagian brief yang perlu direvisi.",
      400,
    );
  }

  const now = new Date().toISOString();
  const approved = input.action === "approve";
  const revisionNo = approved
    ? (brief.revisionNo ?? 0)
    : Math.min(99, (brief.revisionNo ?? 0) + 1);
  const signatures: BriefSignature[] = approved
    ? [
        ...(brief.signatures ?? []),
        {
          party: "customer",
          signerName,
          signerTitle,
          signerUserId: input.userId,
          method: "portal_click",
          consentText: BRIEF_APPROVAL_CONSENT_TEXT,
          signedAt: now,
          revokedAt: null,
          revisionNo,
        },
      ]
    : (brief.signatures ?? []).map((signature) =>
        signature.revokedAt ? signature : { ...signature, revokedAt: now },
      );

  const nextBrief = normalizeProductionBrief({
    ...brief,
    approvalStatus: approved ? "approved" : "revision_requested",
    approvedAt: approved ? now : null,
    approvalRevisionNote: approved ? null : input.note?.trim() ?? null,
    revisionNo,
    revisedAt: approved ? brief.revisedAt ?? null : now,
    signatures,
  });
  if (!nextBrief) {
    throw createApiError("BAD_REQUEST", "Brief Full Custom belum valid.", 400);
  }

  const updated = await quotationRepository.update(current.id, {
    productionBrief: nextBrief,
    // Brief portal diperkaya: quotation sudah submitted sejak customer
    // mengirim permintaan — revisi tidak menurunkannya ke draft.
    status: approved
      ? "submitted"
      : brief.intakeChannel === "customer_portal"
        ? current.status
        : "draft",
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Brief Full Custom tidak ditemukan.", 404);
  }
  const normalized = normalizeQuotationRecord(updated);

  await addQuotationEvent({
    quotation: normalized,
    actorId: input.userId,
    actorType: "customer",
    eventType: "status_changed",
    oldStatus: current.status,
    newStatus: normalized.status,
    note: approved
      ? `Customer menyetujui brief Full Custom (ditandatangani: ${signerName} — ${signerTitle}).`
      : input.note?.trim() ?? null,
    metadata: {
      briefApprovalStatus: nextBrief.approvalStatus,
      action: input.action,
      signatureParty: approved ? "customer" : null,
      signerName: approved ? signerName : null,
      revisionNo,
    },
  });

  if (approved) {
    await notifyQuotationRequestedSafely({
      quotation: normalized,
      actorId: input.userId,
      request: input.request,
    });
  }

  logAuditEvent({
    request: input.request,
    actorId: input.userId,
    actorType: "customer",
    companyId: current.companyId,
    action: approved
      ? "sales_assisted_brief_customer_approved"
      : "sales_assisted_brief_revision_requested",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      previousApprovalStatus: currentApproval,
      nextApprovalStatus: nextBrief.approvalStatus,
      signerName: approved ? signerName : null,
      signerTitle: approved ? signerTitle : null,
      revisionNo,
    },
  });

  return normalized;
}

/** Admin mengubah isi brief — hanya sebelum approval customer. */
export async function updateSalesAssistedBrief(input: {
  id: string;
  actorId: string | null;
  brief: ProductionRequestBrief;
  note?: string | null;
  /** Khusus brief portal: minta ttd customer (default) atau simpan tanpa persetujuan formal. */
  requireCustomerApproval?: boolean;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  const brief = requireSalesAssistedBrief(current);
  const portalOrigin = brief.intakeChannel === "customer_portal";
  const hasActiveCustomerSignature = (brief.signatures ?? []).some(
    (signature) => signature.party === "customer" && !signature.revokedAt,
  );
  // "Approved" bawaan brief portal hanyalah artefak (belum pernah ditandatangani
  // customer) — tetap boleh diediter setelah takeover. Brief sales-assisted
  // yang sudah ditandatangani customer tetap terkunci sampai minta revisi.
  if (
    getBriefApprovalStatus(brief) === "approved" &&
    (!portalOrigin || hasActiveCustomerSignature)
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Brief sudah disetujui customer. Minta revisi dari customer sebelum mengubah brief.",
      400,
    );
  }

  const now = new Date().toISOString();
  // Pilihan per kasus berlaku untuk semua kanal (repeat order boleh tanpa ttd).
  const requireApproval = input.requireCustomerApproval ?? true;
  const nextBrief = normalizeProductionBrief({
    ...input.brief,
    // intakeChannel & approval timeline milik brief asal — bukan bagian edit admin.
    intakeChannel: brief.intakeChannel,
    approvalStatus: requireApproval
      ? "pending_customer_approval"
      : "not_required",
    approvalRequestedAt: requireApproval
      ? (brief.approvalRequestedAt ?? now)
      : null,
    approvedAt: null,
    approvalRevisionNote: null,
    revisionNo: brief.revisionNo ?? 0,
    revisedAt: brief.revisedAt ?? null,
    signatures: (brief.signatures ?? []).map((signature) =>
      signature.revokedAt ? signature : { ...signature, revokedAt: now },
    ),
    // Provenansi pengayaan portal tetap menyertai brief.
    enrichedAt: brief.enrichedAt ?? null,
    enrichedByUserId: brief.enrichedByUserId ?? null,
    customerRequestSnapshot: brief.customerRequestSnapshot ?? null,
  });
  if (!nextBrief) {
    throw createApiError("BAD_REQUEST", "Brief Full Custom belum valid.", 400);
  }

  const updated = await quotationRepository.update(current.id, {
    productionBrief: nextBrief,
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Brief Full Custom tidak ditemukan.", 404);
  }
  const normalized = normalizeQuotationRecord(updated);

  await addQuotationEvent({
    quotation: normalized,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: current.status,
    note: input.note?.trim()
      ? `Brief Full Custom diperbarui: ${input.note.trim()}`
      : requireApproval
        ? "Brief Full Custom diperbarui; menunggu persetujuan customer."
        : "Brief Full Custom diperbarui; tanpa persetujuan customer (pilihan sales).",
    metadata: {
      briefApprovalStatus: nextBrief.approvalStatus,
      revisionNo: nextBrief.revisionNo,
    },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: current.companyId,
    action: "sales_assisted_brief_updated",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      revisionNo: nextBrief.revisionNo,
      garmentCount: nextBrief.technicalSpecifications?.length ?? 0,
    },
  });

  return normalized;
}

/** Tanda tangan internal (Desain/Produksi) — tidak mengubah approvalStatus. */
export async function addInternalBriefSignature(input: {
  id: string;
  actorId: string | null;
  party: BriefSignatureParty;
  signerName: string;
  signerTitle: string;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  const brief = requireSalesAssistedBrief(current);

  const signerName = input.signerName.trim();
  const signerTitle = input.signerTitle.trim();
  if (signerName.length < 2 || signerTitle.length < 2) {
    throw createApiError(
      "BAD_REQUEST",
      "Nama dan jabatan penandatangan wajib diisi.",
      400,
    );
  }

  const now = new Date().toISOString();
  // Ganti ttd aktif lain dengan partai sama (satu ttd aktif per partai).
  const signatures = (brief.signatures ?? []).filter(
    (signature) => signature.party !== input.party || signature.revokedAt,
  );
  const nextBrief = normalizeProductionBrief({
    ...brief,
    signatures: [
      ...signatures,
      {
        party: input.party,
        signerName,
        signerTitle,
        signerUserId: input.actorId,
        method: "portal_click",
        consentText: null,
        signedAt: now,
        revokedAt: null,
        revisionNo: brief.revisionNo ?? 0,
      },
    ],
  });
  if (!nextBrief) {
    throw createApiError("BAD_REQUEST", "Brief Full Custom belum valid.", 400);
  }

  const updated = await quotationRepository.update(current.id, {
    productionBrief: nextBrief,
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Brief Full Custom tidak ditemukan.", 404);
  }
  const normalized = normalizeQuotationRecord(updated);

  const partyLabel =
    input.party === "design" ? "Desain" : "Produksi";
  await addQuotationEvent({
    quotation: normalized,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: current.status,
    note: `Tanda tangan ${partyLabel}: ${signerName} — ${signerTitle}.`,
    metadata: {
      signatureParty: input.party,
      signerName,
      revisionNo: brief.revisionNo ?? 0,
    },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: current.companyId,
    action: "sales_assisted_brief_internal_signed",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      signatureParty: input.party,
      signerName,
      signerTitle,
      revisionNo: brief.revisionNo ?? 0,
    },
  });

  return normalized;
}

const BRIEF_FIGURE_ALLOWED_MIME = ["image/jpeg", "image/png"] as const;
const BRIEF_FIGURE_MAX_BYTES = 10 * 1024 * 1024;

/** Upload foto mockup garment (tampak depan/belakang) untuk lembar approval. */
export async function attachSalesAssistedBriefFigure(input: {
  id: string;
  garmentId: string;
  side: "front" | "back";
  file: File;
  actorId: string | null;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  const brief = requireSalesAssistedBrief(current);
  const garment = brief.technicalSpecifications?.find(
    (candidate) => candidate.id === input.garmentId,
  );
  if (!garment) {
    throw createApiError(
      "NOT_FOUND",
      "Item garment tidak ditemukan pada brief.",
      404,
    );
  }
  if (getBriefApprovalStatus(brief) === "approved") {
    throw createApiError(
      "BAD_REQUEST",
      "Brief sudah disetujui customer. Minta revisi dari customer sebelum mengubah figur.",
      400,
    );
  }
  if (!BRIEF_FIGURE_ALLOWED_MIME.includes(input.file.type as never)) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Figur harus berupa file JPEG atau PNG.",
      400,
    );
  }
  if (input.file.size <= 0 || input.file.size > BRIEF_FIGURE_MAX_BYTES) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Ukuran file figur maksimal 10 MB.",
      400,
    );
  }

  const uploaded = await storageService.uploadFile({
    companyId: current.companyId,
    userId: input.actorId ?? "ofissio-internal",
    fileType: "artwork",
    originalFilename: input.file.name,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    data: new Uint8Array(await input.file.arrayBuffer()),
    metadata: {
      purpose: "design_approval_figure",
      quotationId: current.id,
      garmentId: garment.id,
      side: input.side,
    },
    request: input.request,
  });

  const now = new Date().toISOString();
  const nextBrief = normalizeProductionBrief({
    ...brief,
    technicalSpecifications: (brief.technicalSpecifications ?? []).map(
      (candidate) =>
        candidate.id === garment.id
          ? {
              ...candidate,
              figureFrontFileId:
                input.side === "front"
                  ? uploaded.id
                  : candidate.figureFrontFileId ?? null,
              figureBackFileId:
                input.side === "back"
                  ? uploaded.id
                  : candidate.figureBackFileId ?? null,
            }
          : candidate,
    ),
    signatures: (brief.signatures ?? []).map((signature) =>
      signature.revokedAt ? signature : { ...signature, revokedAt: now },
    ),
  });
  if (!nextBrief) {
    throw createApiError("BAD_REQUEST", "Brief Full Custom belum valid.", 400);
  }

  const updated = await quotationRepository.update(current.id, {
    productionBrief: nextBrief,
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Brief Full Custom tidak ditemukan.", 404);
  }
  const normalized = normalizeQuotationRecord(updated);

  await addQuotationEvent({
    quotation: normalized,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: current.status,
    note: `Figur ${input.side === "front" ? "depan" : "belakang"} diunggah untuk ${garment.garmentType}.`,
    metadata: {
      garmentId: garment.id,
      side: input.side,
      fileId: uploaded.id,
      filename: uploaded.originalFilename,
    },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: current.companyId,
    action: "sales_assisted_brief_figure_uploaded",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      garmentId: garment.id,
      side: input.side,
      fileId: uploaded.id,
      sizeBytes: uploaded.sizeBytes,
    },
  });

  return {
    quotation: normalized,
    file: storageService.toPublicUploadedFile(uploaded),
  };
}

export async function updateQuotationStatus(input: {
  id: string;
  status: QuotationStatus;
  actorId: string | null;
  actorType: AuditActorType;
  note?: string | null;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  if (requiresCustomerBriefApproval(current)) {
    throw createApiError(
      "BAD_REQUEST",
      "Brief Full Custom belum disetujui customer. Proses quotation masih dikunci.",
      400,
    );
  }
  if (!canAdminTransitionQuotationStatus(current.status, input.status)) {
    throw createApiError(
      "BAD_REQUEST",
      "Perubahan status quotation tidak sesuai urutan proses.",
      400,
    );
  }
  const updated = await quotationRepository.updateStatus?.(input.id, input.status, {
    acceptedAt: input.status === "accepted" ? new Date().toISOString() : current.acceptedAt,
    rejectedAt: input.status === "rejected" ? new Date().toISOString() : current.rejectedAt,
  }) ?? await quotationRepository.update(input.id, {
    status: input.status,
    acceptedAt: input.status === "accepted" ? new Date().toISOString() : current.acceptedAt,
    rejectedAt: input.status === "rejected" ? new Date().toISOString() : current.rejectedAt,
  });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updated,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: "status_changed",
    oldStatus: current.status,
    newStatus: input.status,
    note: input.note ?? null,
    metadata: { phase: "17_quotation_management" },
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
    companyId: current.companyId,
    action: "quotation_status_updated",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      previousStatus: current.status,
      nextStatus: input.status,
    },
  });
  return normalizeQuotationRecord(updated);
}

export async function updateQuotationPricing(input: {
  id: string;
  pricing: QuotationPricingInput;
  actorId: string | null;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  if (requiresCustomerBriefApproval(current)) {
    throw createApiError(
      "BAD_REQUEST",
      "Harga belum dapat diisi sebelum customer menyetujui brief Full Custom.",
      400,
    );
  }
  if (!isQuotationPricingEditable(current.status)) {
    throw createApiError(
      "BAD_REQUEST",
      "Harga quotation hanya dapat diperbarui sebelum penawaran final dikirim atau saat revisi diminta.",
      400,
    );
  }
  const calculated = calculateQuotationPricing(current, input.pricing);
  const updated = await quotationRepository.updatePricing?.(input.id, input.pricing) ??
    await quotationRepository.update(input.id, {
      items: calculated.items,
      subtotal: calculated.subtotal,
      discountTotal: calculated.discountTotal,
      taxEnabled: calculated.taxEnabled,
      taxRate: calculated.taxRate,
      taxLabel: calculated.taxLabel,
      taxTotal: calculated.taxTotal,
      shippingEstimate: calculated.shippingEstimate,
      grandTotal: calculated.grandTotal,
      customerMessage: calculated.customerMessage,
      salesNotes: calculated.salesNotes,
      validUntil: calculated.validUntil,
      salesEmail: calculated.salesEmail,
    });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updated,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "pricing_updated",
    oldStatus: current.status,
    newStatus: updated.status,
    note: input.pricing.salesNotes ?? null,
    metadata: {
      subtotal: updated.subtotal,
      grandTotal: updated.grandTotal,
      taxEnabled: updated.taxEnabled,
      taxRate: updated.taxRate,
      taxTotal: updated.taxTotal,
      itemCount: updated.items.length,
      overrideCount: updated.items.filter(
        (item) => item.finalUnitPrice !== item.unitPrice,
      ).length,
      originalCalculatedPrices: current.items.map((item) => ({
        itemId: item.id,
        unitPrice: item.unitPrice ?? item.priceFrom,
        tierLabel: item.quantityTierLabel ?? null,
        embroideryTotal: item.embroideryTotal,
        embroideryLines: item.embroideryLines,
      })),
    },
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: current.companyId,
    action: "quotation_pricing_updated",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      grandTotal: updated.grandTotal,
      subtotal: updated.subtotal,
      overrideCount: updated.items.filter(
        (item) => item.finalUnitPrice !== item.unitPrice,
      ).length,
      phase: "17_quotation_management",
    },
  });
  return normalizeQuotationRecord(updated);
}

export async function addQuotationInternalNote(input: {
  id: string;
  note: string;
  actorId: string | null;
  request?: Request;
}) {
  const current = await requireQuotation(input.id);
  const note = {
    id: `qnote_${randomUUID()}`,
    authorId: input.actorId,
    authorType: "internal" as const,
    note: input.note,
    createdAt: new Date().toISOString(),
  };
  const updated =
    await quotationRepository.addInternalNote?.(input.id, note) ??
    await quotationRepository.update(input.id, {
      internalNotes: [...current.internalNotes, note],
    });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updated,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "internal_note_added",
    oldStatus: current.status,
    newStatus: updated.status,
    note: input.note,
    metadata: { noteId: note.id },
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: current.companyId,
    action: "quotation_internal_note_added",
    entityType: "quotation",
    entityId: current.id,
    metadata: { noteId: note.id },
  });
  return normalizeQuotationRecord(updated);
}

export async function sendQuotationReadyToCustomer(input: {
  id: string;
  actorId: string | null;
  request?: Request;
}) {
  const quotation = await requireQuotation(input.id);
  if (requiresCustomerBriefApproval(quotation)) {
    throw createApiError(
      "BAD_REQUEST",
      "Quotation belum dapat dikirim karena brief Full Custom belum disetujui customer.",
      400,
    );
  }
  if (
    quotation.requirementType === "standard_customization" &&
    quotation.embroideryEstimate?.status !== "sent_to_customer"
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Quotation belum dapat dikirim karena estimasi supervisor bordir belum dipublikasikan.",
      400,
    );
  }
  if (
    quotation.requirementType === "custom_production" &&
    quotation.productionPlan?.status !== "sent_to_customer"
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Quotation belum dapat dikirim karena rencana produksi dan termin DP belum dipublikasikan.",
      400,
    );
  }
  if (!isQuotationSendable(quotation.status)) {
    throw createApiError(
      "BAD_REQUEST",
      "Quotation tidak dapat dikirim pada status saat ini.",
      400,
    );
  }
  if (!hasFinalQuotationPricing(quotation)) {
    throw createApiError("BAD_REQUEST", "Penawaran final belum tersedia.", 400);
  }
  const finalizedQuotation = finalizeQuotationForCustomer(quotation);
  if (isQuotationExpired(finalizedQuotation)) {
    throw createApiError(
      "BAD_REQUEST",
      "Masa berlaku quotation harus berada setelah waktu pengiriman.",
      400,
    );
  }
  const recipient = quotation.customerEmail ?? quotation.picEmail ?? quotation.userEmail;
  const results = await emailService.sendQuotationReadyNotifications({
    quotation: finalizedQuotation,
    customerEmail: recipient,
    request: input.request,
  });
  const nextEmailLogIds = [
    ...quotation.emailLogIds,
    ...results.map((result) => result.id),
  ];
  const nextEmailResults = [...quotation.emailResults, ...results];
  const deliverySucceeded =
    results.length > 0 &&
    results.every((result) => isSuccessfulQuotationEmailStatus(result.status));
  const emailStatus: EmailStatus = deliverySucceeded
    ? aggregateEmailStatus(results)
    : results.some((result) => result.status === "failed")
      ? "failed"
      : "skipped";

  if (!deliverySucceeded) {
    const failedUpdate = await quotationRepository.update(quotation.id, {
      emailStatus,
      emailLogIds: nextEmailLogIds,
      emailResults: nextEmailResults,
    });
    if (!failedUpdate) {
      throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
    }
    logAuditEvent({
      request: input.request,
      actorId: input.actorId,
      actorType: "internal",
      companyId: quotation.companyId,
      action: "quotation_send_failed",
      entityType: "quotation",
      entityId: quotation.id,
      metadata: {
        emailStatus,
        providers: results.map((result) => result.provider),
      },
    });
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Email penawaran belum berhasil dikirim. Status quotation belum diubah.",
      502,
    );
  }

  const updated = await quotationRepository.update(quotation.id, {
    status: "quoted",
    validUntil: finalizedQuotation.validUntil,
    emailStatus,
    emailLogIds: nextEmailLogIds,
    emailResults: nextEmailResults,
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  }
  await addQuotationEvent({
    quotation: updated,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "emailed_to_customer",
    oldStatus: quotation.status,
    newStatus: "quoted",
    note: "Quotation sent to customer.",
    metadata: {
      emailStatus,
      emailIds: results.map((result) => result.id),
      providers: results.map((result) => result.provider),
    },
  });
  return {
    quotation: normalizeQuotationRecord(updated),
    email: results[0],
    emails: results,
  };
}

export async function acceptQuotationByCustomer(input: {
  id: string;
  companyId: string;
  userId: string;
  note?: string | null;
  request?: Request;
}) {
  const current = await requireCompanyQuotation(input.id, input.companyId);
  if (current.status === "accepted") {
    await notifyQuotationAcceptedSafely({
      quotation: current,
      actorId: input.userId,
      request: input.request,
    });
    return normalizeQuotationRecord(current);
  }
  if (!canCustomerAcceptQuotation(current)) {
    throw createApiError(
      "BAD_REQUEST",
      getQuotationAcceptDisabledReason(current) ??
        "Quotation belum bisa disetujui.",
      400,
    );
  }
  const updated = await quotationRepository.accept?.(input.id, input.userId) ??
    await quotationRepository.update(input.id, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      rejectedAt: null,
    });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updated,
    actorId: input.userId,
    actorType: "customer",
    eventType: "customer_accepted",
    oldStatus: current.status,
    newStatus: "accepted",
    note: input.note ?? null,
    metadata: { phase: "17_customer_accept" },
  });
  logAuditEvent({
    request: input.request,
    actorId: input.userId,
    actorType: "customer",
    companyId: current.companyId,
    action: "quotation_customer_accepted",
    entityType: "quotation",
    entityId: current.id,
  });
  await notifyQuotationAcceptedSafely({
    quotation: updated,
    actorId: input.userId,
    request: input.request,
  });
  return normalizeQuotationRecord(updated);
}

export async function rejectQuotationByCustomer(input: {
  id: string;
  companyId: string;
  userId: string;
  note?: string | null;
  request?: Request;
}) {
  const current = await requireCompanyQuotation(input.id, input.companyId);
  if (current.status === "rejected") {
    return normalizeQuotationRecord(current);
  }
  if (current.status !== "quoted") {
    throw createApiError("BAD_REQUEST", "Quotation tidak bisa ditolak pada status ini.", 400);
  }
  const updated = await quotationRepository.reject?.(input.id, input.userId, input.note) ??
    await quotationRepository.update(input.id, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
    });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updated,
    actorId: input.userId,
    actorType: "customer",
    eventType: "customer_rejected",
    oldStatus: current.status,
    newStatus: "rejected",
    note: input.note ?? null,
    metadata: { phase: "17_customer_reject" },
  });
  logAuditEvent({
    request: input.request,
    actorId: input.userId,
    actorType: "customer",
    companyId: current.companyId,
    action: "quotation_customer_rejected",
    entityType: "quotation",
    entityId: current.id,
  });
  return normalizeQuotationRecord(updated);
}

export async function requestQuotationRevisionByCustomer(input: {
  id: string;
  companyId: string;
  userId: string;
  note: string;
  request?: Request;
}) {
  const current = await requireCompanyQuotation(input.id, input.companyId);
  if (current.status === "revision_requested") {
    return normalizeQuotationRecord(current);
  }
  if (!canCustomerAcceptQuotation(current)) {
    throw createApiError(
      "BAD_REQUEST",
      getQuotationAcceptDisabledReason(current) ??
        "Quotation belum bisa direvisi.",
      400,
    );
  }
  const updated = await quotationRepository.updateStatus?.(input.id, "revision_requested", {
    customerMessage: input.note,
  }) ?? await quotationRepository.update(input.id, {
    status: "revision_requested",
    customerMessage: input.note,
  });
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updated,
    actorId: input.userId,
    actorType: "customer",
    eventType: "status_changed",
    oldStatus: current.status,
    newStatus: "revision_requested",
    note: input.note,
    metadata: { phase: "17_request_revision_skeleton" },
  });
  return normalizeQuotationRecord(updated);
}

export async function convertQuotationToOrder(input: {
  id: string;
  actorId: string | null;
  request?: Request;
}) {
  const quotation = await requireQuotation(input.id);
  if (quotation.convertedOrderId) {
    const existingOrder = await repositoryRegistry.orders.getOrderById({
      companyId: quotation.companyId,
      orderId: quotation.convertedOrderId,
    });
    const existingTracking = existingOrder
      ? await repositoryRegistry.tracking.getTrackingByOrderId({
          companyId: quotation.companyId,
          orderId: existingOrder.id,
        })
      : null;
    if (existingOrder) {
      await notifyConvertedOrderSafely({
        order: existingOrder,
        quotation,
        actorId: input.actorId,
        request: input.request,
      });
    }
    return {
      quotation,
      order: existingOrder,
      tracking: existingTracking,
      idempotent: true,
    };
  }
  if (!isConvertableQuotationStatus(quotation.status)) {
    throw createApiError(
      "BAD_REQUEST",
      "Quotation hanya bisa dikonversi setelah diterima customer.",
      400,
    );
  }
  if (!quotation.grandTotal || quotation.items.some((item) => item.finalUnitPrice == null)) {
    throw createApiError("BAD_REQUEST", "Harga final quotation belum lengkap.", 400);
  }

  const now = new Date().toISOString();
  const orderId = `ord_${randomUUID()}`;
  const paymentId = `pay_${randomUUID()}`;
  const referenceId = `OF-QUO-${quotation.quotationNumber.split("-").slice(-1)[0]}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const orderItems = quotation.items.map((item) => ({
    ...item.itemSnapshot,
    priceFrom: item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom,
    finalUnitPrice: item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom,
    subtotal:
      (item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom) * item.totalQty,
    productSubtotal:
      (item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom) * item.totalQty,
    selectedEmbroideryZones: item.selectedEmbroideryZones,
    embroideryPricingSnapshot: item.embroideryPricingSnapshot,
    embroideryLines: item.embroideryLines,
    embroideryTotal: item.embroideryTotal,
    missingEmbroideryPricingZones: item.missingEmbroideryPricingZones,
    customizationTotal: item.embroideryTotal,
    finalEstimatedTotal:
      (item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom) * item.totalQty +
      item.embroideryTotal,
    quantityTierLabel: item.quantityTierLabel ?? null,
    quantityPricingBasis: item.quantityPricingBasis ?? "total_order_qty",
    quantityPricingMode: item.quantityPricingMode ?? "fixed_unit_price",
    quantityTierApplied: item.quantityTierApplied ?? false,
    transactionMode: "quotation_converted",
  }));
  const processRouting = deriveOrderProcessRouting({
    items: orderItems,
    requestedProcessRoute: quotation.requestedProcessRoute,
  });
  const productionPaymentTerms =
    quotation.requirementType === "custom_production" && quotation.productionPlan
      ? {
          mode: "deposit_balance" as const,
          contractTotal: safeMoney(quotation.grandTotal),
          depositPercent: quotation.productionPlan.depositPercent,
          depositAmount: quotation.productionPlan.depositAmount,
          balanceAmount: quotation.productionPlan.balanceAmount,
          amountDueNow: quotation.productionPlan.depositAmount,
          balanceDueStage: "after_production_before_shipping" as const,
          balanceStatus: "pending" as const,
        }
      : undefined;
  const order: PaymentOrderRecord = {
    id: orderId,
    orderNumber: referenceId,
    cartId: `quote_${quotation.id}`,
    companyId: quotation.companyId,
    userId: quotation.userId,
    items: orderItems,
    shippingRateId: null,
    calculation: {
      itemSubtotal: quotation.items.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            (item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom) * item.totalQty -
              item.discountAmount,
          ),
        0,
      ),
      customizationFee: quotation.items.reduce((total, item) => total + item.embroideryTotal, 0),
      shippingFee: safeMoney(quotation.shippingEstimate),
      tax: safeMoney(quotation.taxTotal),
      taxEnabled: quotation.taxEnabled,
      taxRate: quotation.taxRate,
      taxLabel: quotation.taxLabel,
      grandTotal: safeMoney(quotation.grandTotal),
    },
    paymentTerms: productionPaymentTerms,
    status: "waiting_payment",
    quotationId: quotation.id,
    ...processRouting,
    wooOrderId: null,
    wooOrderNumber: null,
    wooSyncStatus: "disabled",
    wooSyncError: null,
    wooSyncedAt: null,
    woocommerceOrderId: null,
    orderSyncStatus: "not_synced",
    createdAt: now,
    updatedAt: now,
  };
  const payment: PaymentRecord = {
    id: paymentId,
    orderId,
    companyId: quotation.companyId,
    provider: "mock",
    referenceId,
    providerPaymentId: null,
    providerTransactionId: null,
    amount: productionPaymentTerms?.amountDueNow ?? order.calculation.grandTotal,
    currency: "IDR",
    status: "waiting_payment",
    paymentUrl: null,
    paymentQrUrl: null,
    paymentQrDataUrl: null,
    paymentQrString: null,
    paymentMethod: null,
    paymentChannel: null,
    uniqueCode: 0,
    expiredAt: null,
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    callbackReceivedAt: null,
    callbackStatus: null,
    callbackReference: null,
    callbackAmount: null,
    callbackRawSafeJson: null,
    invoiceDocumentId: null,
    rawProviderResponse: {
      source: "quotation_conversion",
      quotationId: quotation.id,
      phase: "17_convert_to_order_foundation",
    },
    createdAt: now,
    updatedAt: now,
  };
  await repositoryRegistry.orders.saveOrder?.({ paymentOrder: order });
  await repositoryRegistry.payments.savePayment?.({ payment, order });
  const tracking = mapPaymentOrderToTracking({
    order,
    paymentStatus: "waiting_payment",
    paymentReferenceId: referenceId,
    companyName: quotation.companyName,
  });
  const preparedTracking = {
    ...tracking,
    productionTimeline: tracking.productionTimeline.map((stage, index) =>
      index === 0
        ? {
            ...stage,
            label: "Quotation disetujui",
            weight: stage.weight > 0 ? stage.weight : 10,
            state: "current" as const,
            progressRatio: 0.5,
          }
        : stage,
    ),
    items: tracking.items.map((item) => ({
      ...item,
      stages: item.stages.map((stage, index) =>
        index === 0
          ? {
              ...stage,
              label: "Quotation disetujui",
              weight: stage.weight > 0 ? stage.weight : 10,
              state: "current" as const,
              progressRatio: 0.5,
            }
          : stage,
      ),
    })),
    nextStep:
      order.items.some((item) => item.fulfillmentType === "MADE_TO_ORDER")
        ? productionPaymentTerms
          ? `Menunggu DP ${productionPaymentTerms.depositPercent}% dan approval desain`
          : "Menunggu pembayaran / approval desain"
        : "Menunggu pembayaran",
    statusNote: productionPaymentTerms
      ? `Quotation disetujui. Produksi dimulai setelah DP ${productionPaymentTerms.depositPercent}% diterima; pelunasan ditagihkan setelah produksi selesai sebelum pengiriman.`
      : "Quotation sudah disetujui dan dikonversi menjadi order Ofissio. Payment masih mock/foundation.",
    estimatedCompletionDate:
      quotation.productionPlan?.estimatedCompletionDate ??
      quotation.embroideryEstimate?.estimatedCompletionDate ??
      tracking.estimatedCompletionDate,
    plannedCourierHandoverDate:
      quotation.productionPlan?.estimatedHandoverDate ??
      quotation.embroideryEstimate?.estimatedHandoverDate ??
      tracking.plannedCourierHandoverDate,
    estimatedArrivalStartDate:
      quotation.productionPlan?.estimatedArrivalStart ??
      quotation.embroideryEstimate?.estimatedArrivalStart ??
      tracking.estimatedArrivalStartDate,
    estimatedArrivalEndDate:
      quotation.productionPlan?.estimatedArrivalEnd ??
      quotation.embroideryEstimate?.estimatedArrivalEnd ??
      tracking.estimatedArrivalEndDate,
    estimatedDeliveryDate:
      quotation.productionPlan?.estimatedArrivalEnd ??
      quotation.embroideryEstimate?.estimatedArrivalEnd ??
      tracking.estimatedDeliveryDate,
    documents: [
      {
        id: `${order.id}-quotation`,
        label: "Quotation",
        type: "quotation" as const,
        status: "available" as const,
        fileName: `${quotation.quotationNumber}.pdf`,
      },
      ...tracking.documents,
    ],
  };
  await repositoryRegistry.tracking.upsertTrackingOrder?.(preparedTracking);
  const wooSync = await createWooCommerceOrderFromQuotation({
    quotation,
    order,
    payment,
    actorId: input.actorId,
    actorType: "internal",
    request: input.request,
  });
  const updated = await quotationRepository.markConverted?.(quotation.id, orderId) ??
    await quotationRepository.update(quotation.id, {
      status: "converted_to_order",
      convertedOrderId: orderId,
      wooOrderId: wooSync.externalOrderId ?? null,
      wooOrderNumber: wooSync.externalOrderNumber ?? null,
      wooSyncStatus: wooSync.syncStatus ?? (wooSync.skipped ? "disabled" : "failed"),
      wooSyncError: wooSync.ok ? null : wooSync.message,
      wooSyncedAt:
        wooSync.ok && wooSync.externalOrderId ? new Date().toISOString() : null,
    });
  const updatedWithWoo =
    updated &&
    (updated.wooOrderId !== (wooSync.externalOrderId ?? null) ||
      updated.wooSyncStatus !==
        (wooSync.syncStatus ?? (wooSync.skipped ? "disabled" : "failed")))
      ? await quotationRepository.update(quotation.id, {
          wooOrderId: wooSync.externalOrderId ?? null,
          wooOrderNumber: wooSync.externalOrderNumber ?? null,
          wooSyncStatus: wooSync.syncStatus ?? (wooSync.skipped ? "disabled" : "failed"),
          wooSyncError: wooSync.ok ? null : wooSync.message,
          wooSyncedAt:
            wooSync.ok && wooSync.externalOrderId ? new Date().toISOString() : null,
        })
      : updated;
  if (!updated) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  await addQuotationEvent({
    quotation: updatedWithWoo ?? updated,
    actorId: input.actorId,
    actorType: "internal",
    eventType: "converted_to_order",
    oldStatus: quotation.status,
    newStatus: "converted_to_order",
    note: "Converted to Ofissio order foundation.",
    metadata: {
      orderId,
      paymentId,
      referenceId,
      wooOrderId: wooSync.externalOrderId ?? null,
      wooSyncStatus: wooSync.syncStatus ?? (wooSync.skipped ? "disabled" : "failed"),
      phase: "18_woocommerce_staging_order_sync",
    },
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: quotation.companyId,
    action: "quotation_converted_to_order",
    entityType: "quotation",
    entityId: quotation.id,
    metadata: { orderId, paymentId, referenceId },
  });
  await notifyConvertedOrderSafely({
    order,
    quotation,
    actorId: input.actorId,
    request: input.request,
  });
  return {
    quotation: normalizeQuotationRecord(updatedWithWoo ?? updated),
    order,
    tracking: preparedTracking,
    idempotent: false,
  };
}

async function notifyConvertedOrderSafely(input: {
  order: PaymentOrderRecord;
  quotation: QuotationRequestRecord;
  actorId: string | null;
  request?: Request;
}) {
  const productSummary = input.order.items
    .slice(0, 3)
    .map((item) => `${item.productName} — ${item.totalQty} pcs`)
    .join(", ");
  try {
    await createOrderCreatedNotification(
      {
        orderId: input.order.id,
        orderNumber: input.order.orderNumber ?? input.order.id,
        quotationId: input.quotation.id,
        customerName: input.quotation.picName,
        companyName: input.quotation.companyName,
        total: input.order.calculation.grandTotal,
        currency: "IDR",
        productSummary,
        source: "quotation_convert",
      },
      { actorId: input.actorId, request: input.request },
    );
  } catch (error) {
    logInternalError(error, {
      area: "quotation_order_notification",
      orderId: input.order.id,
      quotationId: input.quotation.id,
    });
  }
}

async function notifyQuotationRequestedSafely(input: {
  quotation: QuotationRequestRecord;
  actorId: string | null;
  request?: Request;
}) {
  const productSummary = input.quotation.items
    .slice(0, 3)
    .map((item) => `${item.productName} — ${item.totalQty} pcs`)
    .join(", ");
  try {
    await createQuotationRequestedNotification(
      {
        quotationId: input.quotation.id,
        quotationNumber: input.quotation.quotationNumber,
        customerName: input.quotation.picName,
        companyName: input.quotation.companyName,
        totalQty: input.quotation.totalQty,
        productSummary:
          productSummary ||
          (input.quotation.source === "custom_request"
            ? "Proyek seragam Full Custom"
            : "Permintaan quotation produk Ofissio"),
        source: input.quotation.source,
        requestedProcessRoute: input.quotation.requestedProcessRoute,
      },
      { actorId: input.actorId, request: input.request },
    );
  } catch (error) {
    logInternalError(error, {
      area: "quotation_requested_notification",
      quotationId: input.quotation.id,
      source: input.quotation.source,
    });
  }
}

async function notifyQuotationAcceptedSafely(input: {
  quotation: QuotationRequestRecord;
  actorId: string | null;
  request?: Request;
}) {
  const productSummary = input.quotation.items
    .slice(0, 3)
    .map((item) => `${item.productName} — ${item.totalQty} pcs`)
    .join(", ");
  try {
    await createQuotationAcceptedNotification(
      {
        quotationId: input.quotation.id,
        quotationNumber: input.quotation.quotationNumber,
        customerName: input.quotation.picName,
        companyName: input.quotation.companyName,
        total: input.quotation.grandTotal ?? 0,
        currency: input.quotation.currency,
        productSummary,
      },
      { actorId: input.actorId, request: input.request },
    );
  } catch (error) {
    logInternalError(error, {
      area: "quotation_accepted_notification",
      quotationId: input.quotation.id,
    });
  }
}

async function buildQuotationNumber(
  nowIso: string,
  processRoute: "fulfillment" | "customization" | "production",
) {
  const { nextMonthlyDocumentSequence, safeDocumentNumber } = await import(
    "@/features/documents/document.utils"
  );
  const existing = await quotationRepository.listAll();
  const date = new Date(nowIso);
  const sequence = nextMonthlyDocumentSequence({
    existingNumbers: existing.map((quotation) => quotation.quotationNumber),
    prefix: "QUO",
    processRoute,
    date,
  });
  return safeDocumentNumber({
    documentType: "quotation_pdf",
    processRoute,
    sequence,
    date,
  });
}

function aggregateEmailStatus(results: EmailSendResult[]): EmailStatus {
  if (results.some((result) => result.status === "failed")) return "failed";
  if (results.some((result) => result.status === "sent")) return "sent";
  if (results.some((result) => result.status === "mocked")) return "mocked";
  if (results.some((result) => result.status === "queued")) return "queued";
  return "skipped";
}

function buildPublicUrl(path: string) {
  const baseUrl = process.env.APP_URL?.trim() || "http://localhost:8000";
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

async function requireQuotation(id: string) {
  const quotation = await quotationRepository.getById(id);
  if (!quotation) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  return normalizeQuotationRecord(quotation);
}

async function requireCompanyQuotation(id: string, companyId: string) {
  const quotation = await requireQuotation(id);
  if (quotation.companyId !== companyId) {
    throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  }
  return quotation;
}

async function addQuotationEvent(input: {
  quotation: QuotationRequestRecord;
  actorId: string | null;
  actorType: AuditActorType;
  eventType: QuotationEventType;
  oldStatus: QuotationStatus | null;
  newStatus: QuotationStatus | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const event: QuotationEventRecord = {
    id: `qevt_${randomUUID()}`,
    quotationId: input.quotation.id,
    companyId: input.quotation.companyId,
    actorId: input.actorId,
    actorType:
      input.actorType === "internal" || input.actorType === "customer"
        ? input.actorType
        : "system",
    eventType: input.eventType,
    oldStatus: input.oldStatus,
    newStatus: input.newStatus,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  await quotationRepository.addEvent?.(event);
  return event;
}
