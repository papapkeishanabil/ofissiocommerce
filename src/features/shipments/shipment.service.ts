import "server-only";

import { resolveProcessReadyToShipNotification } from "@/features/admin-notifications/admin-notification.service";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import {
  mapPaymentOrderToTracking,
} from "@/features/tracking/tracking.service";
import { buildTimeline } from "@/features/tracking/tracking-utils";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

import { resolveTrackingUrl } from "./shipment-provider.config";
import {
  customerShipmentStatusLabel,
  shipmentProviderLabel,
  shipmentStatusLabel,
} from "./shipment.config";
import type {
  CreateShipmentInput,
  PublicShipment,
  ShipmentDetail,
  ShipmentEventRecord,
  ShipmentEventType,
  ShipmentListFilter,
  ShipmentRecord,
  ShipmentStatus,
  UpdateShipmentInput,
} from "./shipment.types";
import {
  buildShipmentTimeline,
  calculateShipmentProgress,
  createShipmentEventId,
  createShipmentId,
  createShipmentNumber,
  customerNextStepForShipment,
  mapShipmentToPublic,
  mapShipmentToShippingRate,
  shipmentStatusToEventType,
} from "./shipment.utils";

export async function listShipments(input: ShipmentListFilter = {}) {
  return repositoryRegistry.shipments.listShipments(input);
}

export async function listShipmentDetails(input: ShipmentListFilter = {}) {
  const shipments = await listShipments(input);
  return Promise.all(shipments.map((shipment) => hydrateShipmentDetail(shipment)));
}

export async function getShipmentDetail(input: {
  shipmentId: string;
  companyId?: string;
}): Promise<ShipmentDetail | null> {
  const shipment = await repositoryRegistry.shipments.getShipmentById(input);
  if (!shipment) return null;
  return hydrateShipmentDetail(shipment);
}

export async function getShipmentsByOrder(input: {
  orderId: string;
  companyId?: string;
}) {
  return repositoryRegistry.shipments.listShipments({
    orderId: input.orderId,
    companyId: input.companyId,
  });
}

export async function getPublicShipmentForOrder(input: {
  orderId: string;
  companyId: string;
}): Promise<PublicShipment | null> {
  const shipment = await repositoryRegistry.shipments.getActiveShipmentByOrder(input);
  if (!shipment) return null;
  const events = await repositoryRegistry.shipments.listShipmentEvents({
    shipmentId: shipment.id,
    companyId: input.companyId,
  });
  return mapShipmentToPublic(shipment, events);
}

export async function createShipmentForOrder(input: CreateShipmentInput & { request?: Request }) {
  const order = await repositoryRegistry.orders.getOrderById({
    companyId: input.companyId,
    orderId: input.orderId,
  });
  if (!order) {
    throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
  }

  const existing = await repositoryRegistry.shipments.getActiveShipmentByOrder({
    orderId: input.orderId,
    companyId: input.companyId,
  });
  if (existing) {
    return {
      idempotent: true,
      ...(await hydrateShipmentDetail(existing)),
    };
  }

  const now = new Date().toISOString();
  const shipment: ShipmentRecord = {
    id: createShipmentId(),
    shipmentNumber: createShipmentNumber(new Date(now)),
    orderId: order.id,
    processOrderId: input.processOrderId ?? null,
    companyId: order.companyId,
    provider: input.provider ?? "manual",
    service: input.service?.trim() || "Manual delivery",
    trackingNumber: null,
    trackingUrl: null,
    status: "ready_to_ship",
    shippingCost: order.calculation.shippingFee,
    shippingRateJson: null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    destinationAddressJson: input.destinationAddressJson ?? null,
    shippedAt: null,
    deliveredAt: null,
    failedAt: null,
    createdBy: input.actorId,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const created = await repositoryRegistry.shipments.createShipment({ shipment });
  const event = await addShipmentEventRecord({
    shipment: created,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: "shipment_created",
    oldStatus: null,
    newStatus: created.status,
    note: input.notes ?? "Shipment manual dibuat oleh admin.",
    metadataJson: {
      source: input.processOrderId ? "process_order" : "order",
      phase: "24_shipment_flow",
    },
  });

  await syncShipmentTracking(created, [event]);
  try {
    await resolveProcessReadyToShipNotification(order.id, {
      actorId: input.actorId,
      request: input.request,
    });
  } catch (error) {
    logInternalError(error, {
      area: "shipment",
      operation: "resolve_ready_to_ship_notification",
      orderId: order.id,
    });
  }
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
    companyId: created.companyId,
    action: "shipment_created",
    entityType: "shipment",
    entityId: created.id,
    metadata: {
      orderId: created.orderId,
      processOrderId: created.processOrderId,
      provider: created.provider,
      status: created.status,
      phase: "24_shipment_flow",
    },
  });

  return {
    idempotent: false,
    ...(await hydrateShipmentDetail(created)),
  };
}

export async function createShipmentForProcessOrder(input: {
  processOrderId: string;
  actorId: string | null;
  actorType: "internal" | "system";
  provider?: CreateShipmentInput["provider"];
  service?: string | null;
  notes?: string | null;
  request?: Request;
}) {
  const processOrder = await repositoryRegistry.processOrders.getProcessOrderById({
    processOrderId: input.processOrderId,
  });
  if (!processOrder) {
    throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  }

  const existing = await repositoryRegistry.shipments.getShipmentByProcessOrder({
    processOrderId: processOrder.id,
    companyId: processOrder.companyId,
  });
  if (existing) {
    return {
      idempotent: true,
      ...(await hydrateShipmentDetail(existing)),
    };
  }

  return createShipmentForOrder({
    orderId: processOrder.ofissioOrderId,
    processOrderId: processOrder.id,
    companyId: processOrder.companyId,
    actorId: input.actorId,
    actorType: input.actorType,
    provider: input.provider,
    service: input.service,
    notes:
      input.notes ??
      `Shipment dibuat dari ${processOrder.processOrderNumber}.`,
    request: input.request,
  });
}

export async function updateShipment(input: UpdateShipmentInput & { request?: Request }) {
  const current = await repositoryRegistry.shipments.getShipmentById({
    shipmentId: input.shipmentId,
    companyId: input.companyId,
  });
  if (!current) {
    throw createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
  }

  const now = new Date().toISOString();
  const nextStatus = input.status ?? current.status;
  const trackingUrl = resolveTrackingUrl({
    provider: input.provider ?? current.provider,
    trackingNumber: input.trackingNumber ?? current.trackingNumber,
    trackingUrl: input.trackingUrl ?? current.trackingUrl,
  });
  const patch: Partial<ShipmentRecord> = {
    provider: input.provider ?? current.provider,
    service: input.service ?? current.service,
    trackingNumber:
      input.trackingNumber !== undefined
        ? input.trackingNumber ?? null
        : current.trackingNumber,
    trackingUrl,
    status: nextStatus,
    shippedAt:
      current.shippedAt ??
      (["picked_up", "in_transit", "delivered"].includes(nextStatus) ? now : null),
    deliveredAt: nextStatus === "delivered" ? current.deliveredAt ?? now : current.deliveredAt,
    failedAt: nextStatus === "failed" ? current.failedAt ?? now : current.failedAt,
    notes: input.note ? appendNote(current.notes, input.note) : current.notes,
  };

  const updated = await repositoryRegistry.shipments.updateShipment({
    shipmentId: current.id,
    companyId: input.companyId,
    patch,
  });
  if (!updated) {
    throw createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
  }

  const eventType =
    input.trackingNumber && input.trackingNumber !== current.trackingNumber
      ? "tracking_number_added"
      : current.status !== updated.status
        ? shipmentStatusToEventType(updated.status)
        : "shipment_note_added";
  const event = await addShipmentEventRecord({
    shipment: updated,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType,
    oldStatus: current.status,
    newStatus: updated.status,
    note:
      input.note ??
      (eventType === "tracking_number_added"
        ? "Nomor resi ditambahkan."
        : `Status shipment menjadi ${shipmentStatusLabel(updated.status)}.`),
    metadataJson: {
      provider: updated.provider,
      trackingNumberAvailable: Boolean(updated.trackingNumber),
      phase: "24_shipment_flow",
    },
  });

  const events = await repositoryRegistry.shipments.listShipmentEvents({
    shipmentId: updated.id,
    companyId: updated.companyId,
  });
  await syncShipmentTracking(updated, [event, ...events]);
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
    companyId: updated.companyId,
    action: "shipment_updated",
    entityType: "shipment",
    entityId: updated.id,
    metadata: {
      orderId: updated.orderId,
      oldStatus: current.status,
      newStatus: updated.status,
      eventType,
      phase: "24_shipment_flow",
    },
  });

  return hydrateShipmentDetail(updated);
}

export async function addShipmentEvent(input: {
  shipmentId: string;
  companyId?: string;
  actorId: string | null;
  actorType: "internal" | "system";
  eventType: ShipmentEventType;
  note: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}) {
  const shipment = await repositoryRegistry.shipments.getShipmentById({
    shipmentId: input.shipmentId,
    companyId: input.companyId,
  });
  if (!shipment) {
    throw createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
  }
  const event = await addShipmentEventRecord({
    shipment,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: input.eventType,
    oldStatus: shipment.status,
    newStatus: shipment.status,
    note: input.note,
    metadataJson: input.metadata ?? {},
  });
  const events = await repositoryRegistry.shipments.listShipmentEvents({
    shipmentId: shipment.id,
    companyId: shipment.companyId,
  });
  await syncShipmentTracking(shipment, [event, ...events]);
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
    companyId: shipment.companyId,
    action: "shipment_event_added",
    entityType: "shipment",
    entityId: shipment.id,
    metadata: { eventType: input.eventType, phase: "24_shipment_flow" },
  });
  return event;
}

async function hydrateShipmentDetail(shipment: ShipmentRecord): Promise<ShipmentDetail> {
  const [order, events] = await Promise.all([
    repositoryRegistry.orders.getOrderById({
      companyId: shipment.companyId,
      orderId: shipment.orderId,
    }),
    repositoryRegistry.shipments.listShipmentEvents({
      shipmentId: shipment.id,
      companyId: shipment.companyId,
    }),
  ]);
  return { shipment, order, events };
}

async function addShipmentEventRecord(input: {
  shipment: ShipmentRecord;
  actorId: string | null;
  actorType: "internal" | "customer" | "system";
  eventType: ShipmentEventType;
  oldStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus | null;
  note: string | null;
  metadataJson: Record<string, unknown>;
}) {
  const event: ShipmentEventRecord = {
    id: createShipmentEventId(),
    shipmentId: input.shipment.id,
    orderId: input.shipment.orderId,
    companyId: input.shipment.companyId,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: input.eventType,
    oldStatus: input.oldStatus,
    newStatus: input.newStatus,
    note: input.note,
    metadataJson: input.metadataJson,
    createdAt: new Date().toISOString(),
  };
  return repositoryRegistry.shipments.addShipmentEvent({ event });
}

async function syncShipmentTracking(
  shipment: ShipmentRecord,
  events: ShipmentEventRecord[],
) {
  const order = await repositoryRegistry.orders.getOrderById({
    companyId: shipment.companyId,
    orderId: shipment.orderId,
  });
  if (!order) return null;
  const existing = await repositoryRegistry.tracking.getTrackingByOrderId({
    companyId: shipment.companyId,
    orderId: shipment.orderId,
  });
  const tracking =
    existing ??
    mapPaymentOrderToTracking({
      order,
      paymentStatus: order.status === "payment_received" ? "paid" : "waiting_payment",
      companyName: shipment.companyId,
    });
  const currentStageId = shipmentStatusToTrackingStage(
    shipment.status,
    tracking.currentStageId,
  );
  const productionTimeline = buildTimeline(tracking.fulfillmentType, currentStageId);
  const next: CustomerTrackingOrder = {
    ...tracking,
    currentStageId,
    productionTimeline,
    items: tracking.items.map((item) => ({
      ...item,
      currentStageId,
      stages: productionTimeline.map((stage) => ({ ...stage })),
    })),
    nextStep: customerNextStepForShipment(shipment),
    estimatedDeliveryDate: shipment.deliveredAt,
    selectedShippingRate: mapShipmentToShippingRate(shipment),
    shipmentTimeline: buildShipmentTimeline(shipment, events),
    statusNote: customerShipmentStatusLabel(shipment.status),
    shippingTrackingNumber: shipment.trackingNumber,
    shippingTrackingUrl: shipment.trackingUrl,
    shippingProviderLabel: shipmentProviderLabel(shipment.provider),
    shippingServiceName: shipment.service,
    shipmentStatus: shipment.status,
    shipmentUpdatedAt: shipment.updatedAt,
    updatedAt: new Date().toISOString(),
  };
  return repositoryRegistry.tracking.upsertTrackingOrder?.(next);
}

function shipmentStatusToTrackingStage(
  status: ShipmentStatus,
  currentStageId: string,
) {
  switch (status) {
    case "ready_to_ship":
    case "booked":
      return "ready_to_ship";
    case "picked_up":
    case "in_transit":
      return "in_transit";
    case "delivered":
      return "delivered";
    default:
      return currentStageId;
  }
}

function appendNote(current: string | null, note: string) {
  if (!current?.trim()) return note;
  return `${current}\n${note}`;
}
