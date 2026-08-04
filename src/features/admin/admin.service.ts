import "server-only";

import { headers } from "next/headers";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { getDocumentsByEntity } from "@/features/documents/document.service";
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
import type { OrderProcessRoute } from "@/features/orders/order.types";
import {
  ensureOrderProcessRouting,
} from "@/features/orders/order-routing.service";
import {
  addProcessOrderEvent,
  completeProcessTask,
  createProcessOrderFromOrder,
  getProcessOrderByOrderId,
  getProcessOrderDetail,
  getProcessOrders,
  updateProcessOrder,
} from "@/features/process-orders/process-order.service";
import type {
  ProcessOrderEventPayload,
  ProcessOrderPatchPayload,
} from "@/features/process-orders/process-order.validation";
import {
  addShipmentEvent,
  createShipmentForOrder,
  createShipmentForProcessOrder,
  getShipmentDetail,
  listShipments,
  updateShipment,
} from "@/features/shipments/shipment.service";
import {
  calculateShipmentProgress,
} from "@/features/shipments/shipment.utils";
import type {
  CreateShipmentPayload,
  ShipmentEventPayload,
  UpdateShipmentPayload,
} from "@/features/shipments/shipment.validation";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { resolveOrderCreatedNotifications, resolveQuotationNotifications } from "@/features/admin-notifications/admin-notification.service";
import type { AdminNotification } from "@/features/admin-notifications/admin-notification.types";
import {
  INTERNAL_ROLES,
  type AuditEvent,
  type InternalRole,
} from "@/lib/security/security.types";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import {
  TRUSTED_AUTH_HEADER,
  TRUSTED_AUTH_KIND_HEADER,
} from "@/features/auth/auth.constants";

import { ADMIN_ROLE_PERMISSIONS } from "./admin.config";
import type {
  AdminAuditRow,
  AdminCustomerDetail,
  AdminCustomerRow,
  AdminLogoPreview,
  AdminOrderDetail,
  AdminOrderRow,
  AdminPermission,
  AdminProcessOrderDetail,
  AdminProcessOrderRow,
  AdminQuotationDetail,
  AdminQuotationRow,
  AdminShipmentDetail,
  AdminShipmentRow,
  AdminSummary,
  AdminTrackingRow,
  AdminUploadRow,
  InternalAdminUser,
} from "./admin.types";
import type { AdminQuotationPatchPayload, AdminQuotationUpdateStatus } from "./admin.validation";
import { safeMetadataSummary } from "./admin.utils";

type MaybeRequest = Request | undefined;

export function getCurrentInternalUserMock(request?: MaybeRequest): InternalAdminUser | null {
  const config = getAuthRuntimeConfig();
  const headers = request instanceof Request ? request.headers : null;
  const trustedSession =
    headers?.get(TRUSTED_AUTH_HEADER) === "1" &&
    headers?.get(TRUSTED_AUTH_KIND_HEADER) === "internal";
  const allowedDevelopmentHeader =
    config.mode === "development" && config.internalDevHeadersEnabled;
  const allowedDevelopmentBypass =
    !headers && config.mode === "development" && config.adminDevBypass;
  if (!trustedSession && !allowedDevelopmentHeader && !allowedDevelopmentBypass) {
    return null;
  }
  const requestedRole = headers?.get("x-ofissio-internal-role")?.trim();
  const role = requestedRole
    ? INTERNAL_ROLES.includes(requestedRole as InternalRole)
      ? (requestedRole as InternalRole)
      : null
    : allowedDevelopmentBypass
      ? "super_admin"
      : null;
  if (!role) return null;
  return {
    id: headers?.get("x-ofissio-internal-user-id")?.trim() || "internal-dev",
    name: headers?.get("x-ofissio-internal-user-name")?.trim() || "Ofissio Internal Dev",
    role,
    isMock: !trustedSession,
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

export function canViewProcessOrder(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:process-order:view");
}

export function canUpdateProcessOrder(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:process-order:update");
}

export function canViewShipment(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:shipment:view");
}

export function canUpdateShipment(user: InternalAdminUser | null) {
  return hasAdminPermission(user, "admin:shipment:update");
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

export async function requireInternalAdminServer(
  permission: AdminPermission = "admin:view",
) {
  const requestHeaders = await headers();
  const request = new Request("http://ofissio.internal/admin", {
    headers: requestHeaders,
  });
  return requireInternalAdmin(request, permission);
}

function hasAdminPermission(user: InternalAdminUser | null, permission: AdminPermission) {
  if (!user) return false;
  const permissions = ADMIN_ROLE_PERMISSIONS[user.role] ?? [];
  return permissions.includes("admin:view") && permissions.includes(permission);
}

export async function getAdminSummary(): Promise<AdminSummary> {
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
  const [rows, notifications] = await Promise.all([
    repositoryRegistry.quotations.listAll(),
    repositoryRegistry.adminNotifications.listAll(),
  ]);
  const search = input.search?.toLowerCase();
  const requestedByQuotation = new Map(
    notifications
      .filter(
        (notification) =>
          notification.type === "quotation_requested" && notification.entityType === "quotation",
      )
      .map((notification) => [notification.entityId, notification] as const),
  );
  const acceptedByQuotation = new Map(
    notifications
      .filter(
        (notification) =>
          notification.type === "quotation_accepted" && notification.entityType === "quotation",
      )
      .map((notification) => [notification.entityId, notification] as const),
  );
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
    .map((quotation) =>
      mapQuotationRow(quotation, {
        requested: requestedByQuotation.get(quotation.id),
        accepted: acceptedByQuotation.get(quotation.id),
      }),
    )
    .sort((a, b) => {
      // Unread acceptance first, then unread new request, then newest status change.
      const acceptedNewPriority = Number(b.isAcceptedNew) - Number(a.isAcceptedNew);
      if (acceptedNewPriority !== 0) return acceptedNewPriority;
      const requestedNewPriority = Number(b.isRequestedNew) - Number(a.isRequestedNew);
      if (requestedNewPriority !== 0) return requestedNewPriority;
      const acceptedStatusPriority = Number(b.status === "accepted") - Number(a.status === "accepted");
      if (acceptedStatusPriority !== 0) return acceptedStatusPriority;
      return Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt);
    });
}

export async function getAdminQuotationDetail(id: string): Promise<AdminQuotationDetail | null> {
  const quotation = await repositoryRegistry.quotations.getById(id);
  if (!quotation) return null;
  const [logoPreviews, referencePreviews, events, emailLogs, documents, acceptedNotification] =
    await Promise.all([
      getLogoPreviews(quotation),
      getReferencePreviews(quotation),
      getQuotationEventsById(quotation.id, quotation.companyId),
      getQuotationEmailLogs(quotation),
      getDocumentsByEntity({
        companyId: quotation.companyId,
        entityType: "quotation",
        entityId: quotation.id,
      }),
      repositoryRegistry.adminNotifications.getByEntity({
        type: "quotation_accepted",
        entityType: "quotation",
        entityId: quotation.id,
      }),
    ]);
  return {
    quotation,
    logoPreviews,
    referencePreviews,
    events,
    emailLogs,
    documents,
    acceptedNotification: acceptedNotification
      ? { id: acceptedNotification.id, status: acceptedNotification.status }
      : null,
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
  // Status-changing admin actions clear the "new submission / new acceptance"
  // highlight so the quotation drops from the top of the queue.
  if (
    "action" in payload &&
    ["update_status", "send_quote_to_customer", "convert_to_order"].includes(payload.action)
  ) {
    await resolveQuotationNotifications(input.id, {
      request: input.request,
      actorId: input.actor.id,
    });
  }
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
  const [orders, tracking, notifications] = await Promise.all([
    repositoryRegistry.orders.listAll?.() ?? Promise.resolve([]),
    listTrackingRaw(),
    repositoryRegistry.adminNotifications.listAll(),
  ]);
  const newOrderNotificationByOrderId = new Map(
    notifications
      .filter(
        (notification) =>
          notification.type === "order_created" && notification.entityType === "order",
      )
      .map((notification) => [notification.entityId, notification] as const),
  );
  const paymentNotificationByOrderId = new Map(
    notifications
      .filter(
        (notification) =>
          notification.type === "payment_paid" && notification.entityType === "order",
      )
      .map((notification) => [notification.entityId, notification] as const),
  );

  return orders
    .map((order) =>
      mapOrderRow(
        order,
        tracking.find((item) => item.id === order.id),
        {
          orderCreated: newOrderNotificationByOrderId.get(order.id) ?? null,
          paymentPaid: paymentNotificationByOrderId.get(order.id) ?? null,
        },
      ),
    )
    .sort((a, b) => {
      const paymentChangePriority = Number(b.isPaymentNew) - Number(a.isPaymentNew);
      if (paymentChangePriority !== 0) return paymentChangePriority;
      const processingPriority = Number(b.needsProcessing) - Number(a.needsProcessing);
      if (processingPriority !== 0) return processingPriority;
      const newOrderPriority = Number(b.isNew) - Number(a.isNew);
      if (newOrderPriority !== 0) return newOrderPriority;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const orders = (await repositoryRegistry.orders.listAll?.()) ?? [];
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  const tracking = (await listTrackingRaw()).find((item) => item.id === id) ?? null;
  const routed = ensureOrderProcessRouting(order);
  const processOrder = await getProcessOrderByOrderId(routed.id, routed.companyId);
  const documents = await getDocumentsByEntity({
    companyId: routed.companyId,
    entityType: "order",
    entityId: routed.id,
  });
  const payment =
    (await repositoryRegistry.payments.getPaymentByOrderId?.({
      companyId: routed.companyId,
      orderId: routed.id,
    })) ?? null;
  const paymentEvents = payment
    ? (await repositoryRegistry.payments
        .listPaymentEvents?.({
          companyId: routed.companyId,
          paymentId: payment.id,
          orderId: routed.id,
        })
        .catch(() => [])) ?? []
    : [];
  const shipments = await listShipments({
    companyId: routed.companyId,
    orderId: routed.id,
  }).catch(() => []);
  const shipmentEvents = (
    await Promise.all(
      shipments.map((shipment) =>
        repositoryRegistry.shipments.listShipmentEvents({
          companyId: routed.companyId,
          shipmentId: shipment.id,
        }),
      ),
    )
  ).flat();
  const [newOrderNotification, paymentPaidNotification] = await Promise.all([
    repositoryRegistry.adminNotifications.getByEntity({
      type: "order_created",
      entityType: "order",
      entityId: routed.id,
    }),
    repositoryRegistry.adminNotifications.getByEntity({
      type: "payment_paid",
      entityType: "order",
      entityId: routed.id,
    }),
  ]);
  return {
    order: routed,
    tracking,
    processOrder,
    documents,
    payment,
    paymentEvents,
    shipments,
    shipmentEvents,
    newOrderNotification: newOrderNotification
      ? { id: newOrderNotification.id, status: newOrderNotification.status }
      : null,
    attentionNotifications: [paymentPaidNotification, newOrderNotification]
      .filter((notification) => notification?.status === "unread")
      .map((notification) => ({
        id: notification!.id,
        status: notification!.status,
      })),
  };
}

export async function startAdminOrderProcess(input: {
  id: string;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!hasAdminPermission(input.actor, "admin:order:update")) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh memproses order.", 403);
  }
  const detail = await getAdminOrderDetail(input.id);
  if (!detail) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
  const result = await createProcessOrderFromOrder({
    order: detail.order,
    actorId: input.actor.id,
    actorType: "internal",
    request: input.request,
  });
  await resolveOrderCreatedNotifications(detail.order.id, {
    actorId: input.actor.id,
    request: input.request,
  }).catch(() => null);
  return result;
}

export async function listAdminProcessOrders(): Promise<AdminProcessOrderRow[]> {
  const [processOrders, orders, tracking] = await Promise.all([
    getProcessOrders(),
    repositoryRegistry.orders.listAll?.() ?? Promise.resolve([]),
    listTrackingRaw(),
  ]);
  return processOrders.map((processOrder) => {
    const order = orders.find((candidate) => candidate.id === processOrder.ofissioOrderId);
    const trackingOrder = tracking.find((candidate) => candidate.id === processOrder.ofissioOrderId);
    return mapProcessOrderRow(processOrder, order, trackingOrder);
  });
}

export async function getAdminProcessOrderDetail(id: string): Promise<AdminProcessOrderDetail | null> {
  const detail = await getProcessOrderDetail(id);
  if (!detail) return null;
  const tracking = detail.sourceOrder
    ? (await listTrackingRaw()).find((item) => item.id === detail.sourceOrder?.id)
    : null;
  const shipment = await repositoryRegistry.shipments
    .getShipmentByProcessOrder({
      processOrderId: detail.processOrder.id,
      companyId: detail.processOrder.companyId,
    })
    .catch(() => null);
  const shipmentEvents = shipment
    ? await repositoryRegistry.shipments
        .listShipmentEvents({
          shipmentId: shipment.id,
          companyId: shipment.companyId,
        })
        .catch(() => [])
    : [];
  return {
    ...detail,
    relatedOrderNumber:
      tracking?.orderNumber ??
      detail.sourceOrder?.orderNumber ??
      detail.processOrder.ofissioOrderId,
    companyName: tracking?.companyName ?? detail.sourceOrder?.companyId ?? detail.processOrder.companyId,
    shipment,
    shipmentEvents,
  };
}

export async function patchAdminProcessOrder(input: {
  id: string;
  payload: ProcessOrderPatchPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateProcessOrder(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh mengubah process order.", 403);
  }
  return updateProcessOrder({
    processOrderId: input.id,
    patch: input.payload,
    actorId: input.actor.id,
    actorType: "internal",
    request: input.request,
  });
}

export async function completeAdminProcessOrderTask(input: {
  id: string;
  taskId: string;
  notes?: string | null;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateProcessOrder(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh menyelesaikan task.", 403);
  }
  return completeProcessTask({
    processOrderId: input.id,
    taskId: input.taskId,
    notes: input.notes,
    actorId: input.actor.id,
    actorType: "internal",
    request: input.request,
  });
}

export async function addAdminProcessOrderEvent(input: {
  id: string;
  payload: ProcessOrderEventPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateProcessOrder(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh menambah event process order.", 403);
  }
  return addProcessOrderEvent({
    processOrderId: input.id,
    eventType: input.payload.eventType,
    note: input.payload.note,
    metadata: input.payload.metadata,
    actorId: input.actor.id,
    actorType: "internal",
    request: input.request,
  });
}

export async function listAdminShipments(input: {
  companyId?: string;
  status?: string;
  orderId?: string;
} = {}): Promise<AdminShipmentRow[]> {
  const [shipments, orders, tracking] = await Promise.all([
    listShipments({
      companyId: input.companyId,
      orderId: input.orderId,
      status: input.status as never,
    }),
    repositoryRegistry.orders.listAll?.() ?? Promise.resolve([]),
    listTrackingRaw(),
  ]);
  return shipments.map((shipment) => {
    const order = orders.find((candidate) => candidate.id === shipment.orderId);
    const trackingOrder = tracking.find((candidate) => candidate.id === shipment.orderId);
    return {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      orderId: shipment.orderId,
      orderNumber: trackingOrder?.orderNumber ?? order?.orderNumber ?? shipment.orderId,
      processOrderId: shipment.processOrderId,
      companyId: shipment.companyId,
      companyName: trackingOrder?.companyName ?? order?.companyId ?? shipment.companyId,
      provider: shipment.provider,
      service: shipment.service,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      progress: calculateShipmentProgress(shipment.status),
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  });
}

export async function getAdminShipmentDetail(id: string): Promise<AdminShipmentDetail | null> {
  return getShipmentDetail({ shipmentId: id });
}

export async function createAdminOrderShipment(input: {
  orderId: string;
  payload: CreateShipmentPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateShipment(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh membuat shipment.", 403);
  }
  const detail = await getAdminOrderDetail(input.orderId);
  if (!detail) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
  return createShipmentForOrder({
    orderId: detail.order.id,
    processOrderId: detail.processOrder?.id ?? null,
    companyId: detail.order.companyId,
    actorId: input.actor.id,
    actorType: "internal",
    provider: input.payload.provider,
    service: input.payload.service,
    recipientName: input.payload.recipientName,
    recipientPhone: input.payload.recipientPhone,
    notes: input.payload.notes,
    request: input.request,
  });
}

export async function createAdminProcessShipment(input: {
  processOrderId: string;
  payload: CreateShipmentPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateShipment(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh membuat shipment.", 403);
  }
  return createShipmentForProcessOrder({
    processOrderId: input.processOrderId,
    actorId: input.actor.id,
    actorType: "internal",
    provider: input.payload.provider,
    service: input.payload.service,
    notes: input.payload.notes,
    request: input.request,
  });
}

export async function patchAdminShipment(input: {
  shipmentId: string;
  payload: UpdateShipmentPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateShipment(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh mengubah shipment.", 403);
  }
  return updateShipment({
    shipmentId: input.shipmentId,
    actorId: input.actor.id,
    actorType: "internal",
    provider: input.payload.provider,
    service: input.payload.service,
    trackingNumber: input.payload.trackingNumber,
    trackingUrl: input.payload.trackingUrl,
    status: input.payload.status,
    note: input.payload.note,
    request: input.request,
  });
}

export async function addAdminShipmentEvent(input: {
  shipmentId: string;
  payload: ShipmentEventPayload;
  actor: InternalAdminUser;
  request?: Request;
}) {
  if (!canUpdateShipment(input.actor)) {
    throw createApiError("FORBIDDEN", "Role internal belum boleh menambah event shipment.", 403);
  }
  return addShipmentEvent({
    shipmentId: input.shipmentId,
    actorId: input.actor.id,
    actorType: "internal",
    eventType: input.payload.eventType,
    note: input.payload.note,
    metadata: input.payload.metadata,
    request: input.request,
  });
}

export async function listAdminUploads(
  filter: UploadedFileListFilter = {},
  options: { includeSignedUrls?: boolean } = {},
): Promise<AdminUploadRow[]> {
  const files = (await repositoryRegistry.uploadedFiles.listAll?.(filter)) ?? [];
  return Promise.all(
    files.map(async (file) => {
      const signed =
        options.includeSignedUrls &&
        file.status !== "deleted" &&
        file.status !== "rejected"
          ? await storageService
              .getSignedFileUrl({
                companyId: file.companyId,
                fileId: file.id,
              })
              .catch(() => null)
          : null;
      return {
        id: file.id,
        companyId: file.companyId,
        fileType: file.fileType,
        originalFilename: file.originalFilename,
        safeFilename: file.safeFilename,
        storageProvider: file.storageProvider,
        storageBucket: file.storageBucket,
        mimeType: file.mimeType,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        status: file.status,
        scanStatus: file.scanStatus,
        sanitizedStatus: file.sanitizedStatus,
        createdAt: file.createdAt,
        signedUrlAvailable: Boolean(signed),
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );
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

async function getReferencePreviews(quotation: QuotationRequestRecord): Promise<AdminLogoPreview[]> {
  const files = quotation.productionBrief?.referenceFiles ?? [];
  const uniqueIds = Array.from(new Set(files.map((file) => file.fileId).filter(Boolean)));
  return Promise.all(
    uniqueIds.map(async (fileId) => {
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

async function getQuotationEmailLogs(quotation: QuotationRequestRecord) {
  const ids = new Set(quotation.emailLogIds);
  const logs = await repositoryRegistry.emailLogs
    .listByCompany(quotation.companyId)
    .catch(() => []);
  return logs.filter((log) => {
    if (ids.has(log.id)) return true;
    return log.safeMetadata.quotationNumber === quotation.quotationNumber;
  });
}

function mapQuotationRow(
  quotation: QuotationRequestRecord,
  notifications: { requested?: AdminNotification | null; accepted?: AdminNotification | null } = {},
): AdminQuotationRow {
  const isRequestedNew = notifications.requested?.status === "unread";
  const isAcceptedNew = notifications.accepted?.status === "unread";
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
    processRoute: deriveQuotationRoute(quotation),
    createdAt: quotation.createdAt,
    updatedAt: quotation.updatedAt,
    acceptedAt: quotation.acceptedAt,
    isRequestedNew,
    isAcceptedNew,
    attentionType: isAcceptedNew
      ? "quotation_accepted"
      : isRequestedNew
        ? "quotation_requested"
        : null,
  };
}

function deriveQuotationRoute(quotation: QuotationRequestRecord): OrderProcessRoute {
  if (
    quotation.source === "custom_request" ||
    quotation.requirementType === "custom_production"
  ) {
    return "production";
  }
  if (quotation.requirementType === "standard_customization") {
    return "customization";
  }
  return "fulfillment";
}

function mapOrderRow(
  order: PaymentOrderRecord,
  tracking?: CustomerTrackingOrder | null,
  notifications: {
    orderCreated?: { id: string; status: string } | null;
    paymentPaid?: { id: string; status: string } | null;
  } = {},
): AdminOrderRow {
  const routed = ensureOrderProcessRouting(order);
  const paymentStatus =
    routed.status === "payment_received"
      ? "paid"
      : tracking?.paymentStatus ?? "waiting_payment";
  const isPaid = paymentStatus === "paid" || routed.status === "payment_received";
  const needsProcessing =
    isPaid && ["not_started", "ready_to_process"].includes(routed.processStatus ?? "not_started");
  const isPaymentNew = notifications.paymentPaid?.status === "unread";
  const isNew = notifications.orderCreated?.status === "unread";
  return {
    id: routed.id,
    orderNumber: tracking?.orderNumber ?? routed.orderNumber ?? routed.id,
    companyId: routed.companyId,
    companyName: tracking?.companyName ?? routed.companyId,
    paymentStatus,
    orderStatus: routed.status,
    fulfillmentType: routed.items[0]?.fulfillmentType ?? "STANDARD_PRODUCT",
    processRoute: routed.processRoute ?? "fulfillment",
    processStatus: routed.processStatus ?? "not_started",
    replenishmentStatus: routed.replenishmentStatus ?? "not_required",
    hasCustomization: routed.hasCustomization ?? false,
    customizationType: routed.customizationType ?? "none",
    processRouteReason: routed.processRouteReason ?? "",
    trackingStatus: tracking?.currentStageId ?? "-",
    progress: tracking ? calculateTrackingProgress(tracking) : 0,
    total: routed.calculation.grandTotal,
    createdAt: routed.createdAt,
    updatedAt: routed.updatedAt,
    wooOrderId: routed.wooOrderId ?? routed.woocommerceOrderId ?? null,
    wooOrderNumber: routed.wooOrderNumber ?? null,
    wooSyncStatus:
      routed.wooSyncStatus ??
      (routed.orderSyncStatus === "synced"
        ? "synced"
        : routed.orderSyncStatus === "failed"
          ? "failed"
          : "disabled"),
    wooSyncError: routed.wooSyncError ?? null,
    wooSyncedAt: routed.wooSyncedAt ?? null,
    isNew,
    isPaymentNew,
    needsProcessing,
    attentionType: isPaymentNew || needsProcessing
      ? "payment_received"
      : isNew
        ? "new_order"
        : null,
    notificationId:
      notifications.paymentPaid?.id ?? notifications.orderCreated?.id ?? null,
  };
}

function mapProcessOrderRow(
  processOrder: Awaited<ReturnType<typeof getProcessOrders>>[number],
  order?: PaymentOrderRecord | null,
  tracking?: CustomerTrackingOrder | null,
): AdminProcessOrderRow {
  return {
    id: processOrder.id,
    processOrderNumber: processOrder.processOrderNumber,
    orderNumber: tracking?.orderNumber ?? order?.orderNumber ?? processOrder.ofissioOrderId,
    ofissioOrderId: processOrder.ofissioOrderId,
    wooOrderId: processOrder.wooOrderId,
    quotationId: processOrder.quotationId,
    companyId: processOrder.companyId,
    companyName: tracking?.companyName ?? order?.companyId ?? processOrder.companyId,
    processRoute: processOrder.processRoute,
    processStatus: processOrder.processStatus,
    replenishmentStatus: processOrder.replenishmentStatus,
    currentStage: processOrder.currentStage,
    progress: processOrder.progress,
    priority: processOrder.priority,
    deadline: processOrder.deadline,
    assignedTeam: processOrder.assignedTeam,
    createdAt: processOrder.createdAt,
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
