import "server-only";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { storageService } from "@/features/storage/storage.service";
import type { UploadedFileListFilter } from "@/features/storage/storage.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import {
  addQuotationInternalNote,
  convertQuotationToOrder,
  getQuotationEventsById,
  sendQuotationReadyToCustomer,
  updateQuotationPricing,
  updateQuotationStatus,
} from "@/features/quotation/quotation.service";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import {
  INTERNAL_ROLES,
  type AuditEvent,
  type InternalRole,
} from "@/lib/security/security.types";

import { ADMIN_ROLE_PERMISSIONS } from "./admin.config";
import type {
  AdminAuditRow,
  AdminCustomerDetail,
  AdminCustomerRow,
  AdminLogoPreview,
  AdminOrderDetail,
  AdminOrderRow,
  AdminPermission,
  AdminQuotationDetail,
  AdminQuotationRow,
  AdminSummary,
  AdminTrackingRow,
  AdminUploadRow,
  InternalAdminUser,
} from "./admin.types";
import type { AdminQuotationPatchPayload, AdminQuotationUpdateStatus } from "./admin.validation";
import { safeMetadataSummary } from "./admin.utils";

type MaybeRequest = Request | undefined;

export function getCurrentInternalUserMock(request?: MaybeRequest): InternalAdminUser | null {
  const headers = request instanceof Request ? request.headers : null;
  const requestedRole = headers?.get("x-ofissio-internal-role")?.trim();
  const role = requestedRole
    ? INTERNAL_ROLES.includes(requestedRole as InternalRole)
      ? (requestedRole as InternalRole)
      : null
    : headers || process.env.NODE_ENV === "production"
      ? null
      : "super_admin";
  if (!role) return null;
  return {
    id: headers?.get("x-ofissio-internal-user-id")?.trim() || "internal-dev",
    name: headers?.get("x-ofissio-internal-user-name")?.trim() || "Ofissio Internal Dev",
    role,
    isMock: true,
  };
}

export function canAccessAdmin(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:view");
}

export function canViewAdminQuotation(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:quotation:view");
}

export function canUpdateAdminQuotation(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:quotation:update");
}

export function canViewAdminOrder(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:order:view");
}

export function canUpdateTracking(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:tracking:update");
}

export function canViewAuditLog(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:audit:view");
}

export function requireInternalAdmin(
  request?: MaybeRequest,
  permission: AdminPermission = "admin:view",
) {
  const user = getCurrentInternalUserMock(request);
  if (!hasAdminPermission(user, permission)) {
    throw createApiError(
      "FORBIDDEN",
      "Akses admin internal belum tersedia untuk role ini.",
      403,
    );
  }
  return user!;
}

function hasAdminPermission(user: InternalAdminUser | null, permission: AdminPermission) {
  if (!user) return false;
  const permissions = ADMIN_ROLE_PERMISSIONS[user.role] ?? [];
  return permissions.includes("admin:view") && permissions.includes(permission);
}

export async function getAdminSummary(): Promise<AdminSummary> {
  requireInternalAdmin(undefined, "admin:view");
  const [quotations, orders, tracking, uploads, audit] = await Promise.all([
    listAdminQuotations(),
    listAdminOrders(),
    listAdminTracking(),
    listAdminUploads(),
    listAdminAuditEvents(),
  ]);
  return {
    totalQuotations: quotations.length,
    quotationsUnderReview: quotations.filter((item) => item.status === "under_review").length,
    quotationsQuoted: quotations.filter((item) => item.status === "quoted").length,
    quotationsAccepted: quotations.filter((item) => item.status === "accepted").length,
    quotationsEmailedOrMocked: quotations.filter((item) =>
      ["emailed", "mocked", "sent"].includes(String(item.emailStatus)),
    ).length,
    activeOrders: orders.filter((order) => order.orderStatus !== "payment_failed").length,
    ordersInProduction: tracking.filter((item) =>
      ["production_preparation", "cutting", "sewing", "embroidery_printing", "finishing"].includes(
        item.currentStatus,
      ),
    ).length,
    uploadedFiles: uploads.length,
    trackingNeedsAttention: tracking.filter((item) => item.progress < 100).length,
    recentActivity: (await repositoryRegistry.auditLogs.listAll?.())?.slice(0, 6) ?? auditToEvents(audit).slice(0, 6),
  };
}

export async function listAdminQuotations(input: { search?: string; status?: string } = {}) {
  const rows = await repositoryRegistry.quotations.listAll();
  const search = input.search?.toLowerCase();
  return rows
    .filter((quotation) => (input.status ? quotation.status === input.status : true))
    .filter((quotation) => {
      if (!search) return true;
      return [
        quotation.quotationNumber,
        quotation.companyName,
        quotation.companyId,
        quotation.picName,
        quotation.picEmail,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    })
    .map(mapQuotationRow);
}

export async function getAdminQuotationDetail(id: string): Promise<AdminQuotationDetail | null> {
  const quotation = await repositoryRegistry.quotations.getById(id);
  if (!quotation) return null;
  return {
    quotation,
    logoPreviews: await getLogoPreviews(quotation),
    events: await getQuotationEventsById(quotation.id, quotation.companyId),
  };
}

export async function updateAdminQuotationStatus(input: {
  id: string;
  status: AdminQuotationUpdateStatus;
  internalNote?: string;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateAdminQuotation(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh mengubah quotation.", 403);
  }
  const current = await repositoryRegistry.quotations.getById(input.id);
  if (!current) {
    throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
  }
  const updated = await repositoryRegistry.quotations.update(input.id, {
    status: input.status,
    updatedAt: new Date().toISOString(),
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actor.id,
    actorType: "internal",
    companyId: current.companyId,
    action: "admin_quotation_status_updated",
    entityType: "quotation",
    entityId: current.id,
    metadata: {
      previousStatus: current.status,
      nextStatus: input.status,
      internalNote: input.internalNote || null,
      phase: "16_admin_foundation",
    },
  });
  return updated;
}

export async function executeAdminQuotationAction(input: {
  id: string;
  payload: AdminQuotationPatchPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateAdminQuotation(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh mengubah quotation.", 403);
  }
  const payload = input.payload;
  if ("action" in payload) {
    switch (payload.action) {
      case "update_status":
        return {
          quotation: await updateQuotationStatus({
            id: input.id,
            status: payload.status,
            note: payload.internalNote,
            actorId: input.actor.id,
            actorType: "internal",
            request: input.request,
          }),
        };
      case "update_pricing":
        return {
          quotation: await updateQuotationPricing({
            id: input.id,
            pricing: payload,
            actorId: input.actor.id,
            request: input.request,
          }),
        };
      case "add_internal_note":
        return {
          quotation: await addQuotationInternalNote({
            id: input.id,
            note: payload.note,
            actorId: input.actor.id,
            request: input.request,
          }),
        };
      case "send_quote_to_customer":
        return sendQuotationReadyToCustomer({
          id: input.id,
          actorId: input.actor.id,
          request: input.request,
        });
      case "convert_to_order":
        return convertQuotationToOrder({
          id: input.id,
          actorId: input.actor.id,
          request: input.request,
        });
    }
  }
  return {
    quotation: await updateQuotationStatus({
      id: input.id,
      status: payload.status,
      note: payload.internalNote,
      actorId: input.actor.id,
      actorType: "internal",
      request: input.request,
    }),
  };
}

export async function listAdminOrders(): Promise<AdminOrderRow[]> {
  const orders = (await repositoryRegistry.orders.listAll?.()) ?? [];
  const tracking = await listTrackingRaw();
  return orders.map((order) => mapOrderRow(order, tracking.find((item) => item.id === order.id)));
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const orders = (await repositoryRegistry.orders.listAll?.()) ?? [];
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  const tracking = (await listTrackingRaw()).find((item) => item.id === id) ?? null;
  return { order, tracking };
}

export async function listAdminUploads(filter: UploadedFileListFilter = {}): Promise<AdminUploadRow[]> {
  const files = (await repositoryRegistry.uploadedFiles.listAll?.(filter)) ?? [];
  return files.map((file) => ({
    id: file.id,
    companyId: file.companyId,
    fileType: file.fileType,
    originalFilename: file.originalFilename,
    safeFilename: file.safeFilename,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    status: file.status,
    createdAt: file.createdAt,
    signedUrlAvailable: file.status !== "deleted" && file.status !== "rejected",
  }));
}

export async function listAdminTracking(): Promise<AdminTrackingRow[]> {
  const tracking = await listTrackingRaw();
  return tracking.map((item) => ({
    id: item.id,
    orderNumber: item.orderNumber,
    companyId: item.companyId,
    companyName: item.companyName,
    currentStatus: item.currentStageId,
    nextStep: item.nextStep ?? null,
    progress: calculateTrackingProgress(item),
    updatedAt: item.updatedAt,
  }));
}

export async function listAdminCustomers(): Promise<AdminCustomerRow[]> {
  const [companyRows, userRows, quotations, orders, uploads] = await Promise.all([
    repositoryRegistry.company.listAll?.() ?? Promise.resolve([]),
    repositoryRegistry.companyUsers.listAll?.() ?? Promise.resolve([]),
    repositoryRegistry.quotations.listAll(),
    repositoryRegistry.orders.listAll?.() ?? Promise.resolve([]),
    repositoryRegistry.uploadedFiles.listAll?.() ?? Promise.resolve([]),
  ]);
  const map = new Map<string, AdminCustomerRow>();

  for (const row of companyRows) {
    const companyId = stringField(row, "id");
    if (!companyId) continue;
    map.set(companyId, {
      companyId,
      companyName: stringField(row, "name") || stringField(row, "company_name") || companyId,
      industry: stringField(row, "industry"),
      employeeCount: numberField(row, "employee_count"),
      status: stringField(row, "status") || "active",
      userCount: 0,
      quotationCount: 0,
      orderCount: 0,
      createdAt: stringField(row, "created_at"),
    });
  }

  for (const quotation of quotations) ensureCustomer(map, quotation.companyId, quotation.companyName);
  for (const order of orders) ensureCustomer(map, order.companyId, order.companyId);
  for (const upload of uploads) ensureCustomer(map, upload.companyId, upload.companyId);

  for (const user of userRows) {
    const companyId = stringField(user, "company_id");
    if (!companyId) continue;
    const current = ensureCustomer(map, companyId, companyId);
    current.userCount += 1;
  }
  for (const quotation of quotations) {
    const current = ensureCustomer(map, quotation.companyId, quotation.companyName);
    current.quotationCount += 1;
  }
  for (const order of orders) {
    const current = ensureCustomer(map, order.companyId, order.companyId);
    current.orderCount += 1;
  }

  return [...map.values()].sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export async function getAdminCustomerDetail(companyId: string): Promise<AdminCustomerDetail | null> {
  const customers = await listAdminCustomers();
  const customer = customers.find((item) => item.companyId === companyId);
  if (!customer) return null;
  const [quotations, orders, uploads] = await Promise.all([
    listAdminQuotations(),
    listAdminOrders(),
    listAdminUploads(),
  ]);
  return {
    customer,
    quotations: quotations.filter((item) => item.companyId === companyId),
    orders: orders.filter((item) => item.companyId === companyId),
    uploads: uploads.filter((item) => item.companyId === companyId),
  };
}

export async function listAdminAuditEvents(): Promise<AdminAuditRow[]> {
  const events = (await repositoryRegistry.auditLogs.listAll?.()) ?? [];
  return events.map((event) => ({
    id: event.id,
    createdAt: event.createdAt,
    actorType: event.actorType,
    actorId: event.actorId,
    companyId: event.companyId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    metadataSummary: safeMetadataSummary(event.metadata),
  }));
}

async function getLogoPreviews(quotation: QuotationRequestRecord): Promise<AdminLogoPreview[]> {
  const uniqueIds = new Set<string>();
  for (const item of quotation.items) {
    for (const placement of item.embroideryPlacements) {
      uniqueIds.add(placement.logoFileId);
    }
  }
  return Promise.all(
    [...uniqueIds].map(async (fileId) => {
      const signed = await storageService
        .getSignedFileUrl({ companyId: quotation.companyId, fileId })
        .catch(() => null);
      return {
        fileId,
        signedUrl: signed?.signedUrl ?? null,
        unavailable: !signed?.signedUrl,
      };
    }),
  );
}

function mapQuotationRow(quotation: QuotationRequestRecord): AdminQuotationRow {
  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    companyId: quotation.companyId,
    companyName: quotation.companyName || quotation.companyId,
    picName: quotation.picName,
    picEmail: quotation.picEmail,
    status: quotation.status,
    emailStatus: quotation.emailStatus,
    itemCount: quotation.items.length,
    totalQty: quotation.totalQty,
    createdAt: quotation.createdAt,
  };
}

function mapOrderRow(order: PaymentOrderRecord, tracking?: CustomerTrackingOrder | null): AdminOrderRow {
  return {
    id: order.id,
    orderNumber: tracking?.orderNumber ?? order.id,
    companyId: order.companyId,
    companyName: tracking?.companyName ?? order.companyId,
    paymentStatus: tracking?.paymentStatus ?? "waiting_payment",
    orderStatus: order.status,
    fulfillmentType: order.items[0]?.fulfillmentType ?? "MADE_TO_ORDER",
    trackingStatus: tracking?.currentStageId ?? "-",
    progress: tracking ? calculateTrackingProgress(tracking) : 0,
    createdAt: order.createdAt,
    wooOrderId: order.woocommerceOrderId ?? null,
  };
}

async function listTrackingRaw() {
  return (await repositoryRegistry.tracking.listAll?.()) ?? [];
}

function calculateTrackingProgress(order: CustomerTrackingOrder) {
  const weighted = order.productionTimeline.filter((stage) => stage.weight > 0);
  const totalWeight = weighted.reduce((total, stage) => total + stage.weight, 0);
  if (totalWeight <= 0) return order.paymentStatus === "paid" ? 10 : 0;
  const done = weighted.reduce((total, stage) => {
    if (stage.state === "completed") return total + stage.weight;
    if (stage.state === "current") return total + stage.weight * 0.35;
    return total;
  }, 0);
  return Math.round((done / totalWeight) * 100);
}

function ensureCustomer(map: Map<string, AdminCustomerRow>, companyId: string, companyName: string) {
  const existing = map.get(companyId);
  if (existing) {
    if (existing.companyName === companyId && companyName !== companyId) {
      existing.companyName = companyName;
    }
    return existing;
  }
  const row: AdminCustomerRow = {
    companyId,
    companyName: companyName || companyId,
    industry: null,
    employeeCount: null,
    status: "active",
    userCount: 0,
    quotationCount: 0,
    orderCount: 0,
    createdAt: null,
  };
  map.set(companyId, row);
  return row;
}

function stringField(row: unknown, key: string) {
  if (!row || typeof row !== "object" || !(key in row)) return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function numberField(row: unknown, key: string) {
  if (!row || typeof row !== "object" || !(key in row)) return null;
  const value = (row as Record<string, unknown>)[key];
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function auditToEvents(rows: AdminAuditRow[]): AuditEvent[] {
  return rows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    actorType: row.actorType,
    companyId: row.companyId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: { summary: row.metadataSummary },
    ipAddress: null,
    userAgent: null,
    createdAt: row.createdAt,
  }));
}
