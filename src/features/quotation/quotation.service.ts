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
  CreateCustomQuotationRequestInput,
  CreateQuotationRequestInput,
  CreateQuotationRequestResult,
  QuotationEventRecord,
  QuotationEventType,
  QuotationPricingInput,
  QuotationRequestRecord,
  QuotationStatus,
} from "./quotation.types";
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
      sizeMatrix: item.sizeMatrix as never,
      customization: item.customization,
      embroideryPlacements: item.embroideryPlacements as never,
    })),
  });
  const now = new Date().toISOString();
  const id = `quo_${randomUUID()}`;
  const quotationNumber = buildQuotationNumber(now);
  const requirement = resolveQuotationRequirement({
    requestedType: input.requirementType,
    items: cart.items,
  });
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
  const quotationNumber = buildQuotationNumber(now);
  const productionBrief = normalizeProductionBrief(input.productionBrief);
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
  const completeBrief = normalizeProductionBrief({
    ...productionBrief,
    referenceFiles,
    approvalStatus:
      actorType === "internal" ? "pending_customer_approval" : "approved",
    approvalRequestedAt: actorType === "internal" ? now : null,
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

export async function updateSalesAssistedBriefApproval(input: {
  id: string;
  companyId: string;
  userId: string;
  action: "approve" | "request_revision";
  note?: string | null;
  request?: Request;
}) {
  const current = await requireCompanyQuotation(input.id, input.companyId);
  const brief = current.productionBrief;
  if (
    current.source !== "custom_request" ||
    !brief ||
    brief.intakeChannel === "customer_portal"
  ) {
    throw createApiError(
      "BAD_REQUEST",
      "Dokumen ini bukan brief Full Custom yang dibuat oleh sales.",
      400,
    );
  }

  const currentApproval = getBriefApprovalStatus(brief);
  if (input.action === "approve" && currentApproval === "approved") {
    return normalizeQuotationRecord(current);
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
  const nextBrief = normalizeProductionBrief({
    ...brief,
    approvalStatus: approved ? "approved" : "revision_requested",
    approvedAt: approved ? now : null,
    approvalRevisionNote: approved ? null : input.note?.trim() ?? null,
  });
  if (!nextBrief) {
    throw createApiError("BAD_REQUEST", "Brief Full Custom belum valid.", 400);
  }

  const updated = await quotationRepository.update(current.id, {
    productionBrief: nextBrief,
    status: approved ? "submitted" : "draft",
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
      ? "Customer menyetujui brief Full Custom."
      : input.note?.trim() ?? null,
    metadata: {
      briefApprovalStatus: nextBrief.approvalStatus,
      action: input.action,
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
    },
  });

  return normalized;
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
    amount: order.calculation.grandTotal,
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
        ? "Menunggu pembayaran / approval desain"
        : "Menunggu pembayaran",
    statusNote:
      "Quotation sudah disetujui dan dikonversi menjadi order Ofissio. Payment masih mock/foundation.",
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
