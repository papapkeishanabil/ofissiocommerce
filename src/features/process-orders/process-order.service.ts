import "server-only";

import { randomUUID } from "node:crypto";

import {
  DEFAULT_PROCESS_TASK_TEMPLATES,
  INITIAL_PROCESS_PROGRESS,
  processOrderRouteLabel,
} from "@/features/process-orders/process-order.config";
import { getProcessOrderRepository } from "@/features/process-orders/process-order.repository";
import type {
  ProcessActorType,
  ProcessOrder,
  ProcessOrderCreateResult,
  ProcessOrderDetail,
  ProcessOrderEvent,
  ProcessOrderEventType,
  ProcessOrderItem,
  ProcessOrderListFilter,
  ProcessOrderPatch,
  ProcessOrderRoute,
  ProcessOrderStatus,
  ProcessOrderTask,
} from "@/features/process-orders/process-order.types";
import {
  calculateProcessProgress,
  getCurrentStageFromTasks,
  nextPendingTask,
  processOrderPrefix,
} from "@/features/process-orders/process-order.utils";
import { ensureOrderProcessRouting } from "@/features/orders/order-routing.service";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { mapPaymentOrderToTracking } from "@/features/tracking/tracking.service";
import { buildTimeline } from "@/features/tracking/tracking-utils";
import type {
  CustomerTrackingOrder,
  TrackingFulfillmentType,
} from "@/features/tracking/tracking.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

const repository = getProcessOrderRepository();

export function determineProcessRouteFromOrder(order: PaymentOrderRecord) {
  return ensureOrderProcessRouting(order);
}

export async function createProcessOrderFromOrder(input: {
  order: PaymentOrderRecord;
  routeOverride?: ProcessOrderRoute;
  actorId?: string | null;
  actorType?: ProcessActorType;
  request?: Request;
}): Promise<ProcessOrderCreateResult> {
  const routed = determineProcessRouteFromOrder(input.order);
  const processRoute = input.routeOverride ?? routed.processRoute ?? "fulfillment";
  const existing = await repository.getProcessOrderByOrderId({
    ofissioOrderId: input.order.id,
    companyId: input.order.companyId,
  });

  if (existing) {
    const detail = await getProcessOrderDetail(existing.id, existing.companyId);
    if (!detail) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
    await syncTrackingFromProcessOrder(detail.processOrder, detail.sourceOrder ?? input.order);
    return {
      ...detail,
      processOrderId: existing.id,
      processOrderNumber: existing.processOrderNumber,
      processRoute: existing.processRoute,
      idempotent: true,
      order: detail.sourceOrder ?? input.order,
    };
  }

  const now = new Date().toISOString();
  const processStatus: ProcessOrderStatus =
    routed.replenishmentStatus === "needed" ? "waiting_replenishment" : "in_progress";
  const firstStage = DEFAULT_PROCESS_TASK_TEMPLATES[processRoute][0]?.stage ?? "ready_to_process";
  const processOrder: ProcessOrder = {
    id: `pro_${randomUUID()}`,
    processOrderNumber: await generateProcessOrderNumber(processRoute),
    ofissioOrderId: input.order.id,
    wooOrderId: input.order.wooOrderId ?? input.order.woocommerceOrderId ?? null,
    quotationId: input.order.quotationId ?? null,
    companyId: input.order.companyId,
    processRoute,
    processStatus,
    replenishmentStatus: routed.replenishmentStatus ?? "not_required",
    currentStage: firstStage,
    progress: INITIAL_PROCESS_PROGRESS[processRoute],
    priority: "normal",
    deadline: null,
    assignedTeam: defaultAssignedTeam(processRoute),
    createdBy: input.actorId ?? null,
    notes: routed.processRouteReason ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  const tasks = buildDefaultTasks(processOrder, now, processStatus);
  const items = buildProcessOrderItems(input.order, processOrder, now);

  processOrder.progress = calculateProcessProgress({
    route: processOrder.processRoute,
    status: processOrder.processStatus,
    tasks,
  });

  try {
    await repository.createProcessOrder({ processOrder });
    await repository.createProcessOrderItems({ processOrderId: processOrder.id, items });
    await repository.createProcessOrderTasks({ processOrderId: processOrder.id, tasks });
    await repository.addProcessOrderEvent({
      event: createProcessEvent({
        processOrder,
        actorId: input.actorId ?? null,
        actorType: input.actorType ?? "internal",
        eventType: "created",
        newStatus: processOrder.processStatus,
        newStage: processOrder.currentStage,
        note: `${processOrderRouteLabel(processRoute)} dibuat dari order tanpa input ulang.`,
        metadata: {
          routeReason: routed.processRouteReason ?? null,
          phase: "19_process_order_foundation",
        },
      }),
    });
  } catch (error) {
    if (
      error instanceof SupabaseDatabaseError &&
      error.reason === "relation_does_not_exist"
    ) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "Migration 005 process_orders belum dijalankan di Supabase.",
        503,
      );
    }
    throw error;
  }

  const order =
    (await repositoryRegistry.orders.updateOrderProcess?.({
      companyId: input.order.companyId,
      orderId: input.order.id,
      patch: {
        processRoute,
        processStatus: processOrder.processStatus,
        replenishmentStatus: processOrder.replenishmentStatus,
        hasCustomization: routed.hasCustomization ?? false,
        customizationType: routed.customizationType ?? "none",
        processRouteReason: routed.processRouteReason ?? null,
      },
    })) ?? {
      ...input.order,
      processRoute,
      processStatus: processOrder.processStatus,
      replenishmentStatus: processOrder.replenishmentStatus,
    };

  await syncTrackingFromProcessOrder(processOrder, order);
  logAuditEvent({
    request: input.request,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    companyId: processOrder.companyId,
    action: "process_order_created",
    entityType: "process_order",
    entityId: processOrder.id,
    metadata: {
      processOrderNumber: processOrder.processOrderNumber,
      processRoute,
      ofissioOrderId: input.order.id,
      phase: "19_process_order_foundation",
    },
  });

  return {
    processOrder,
    sourceOrder: order,
    items,
    tasks,
    events: await repository.listProcessOrderEvents({
      processOrderId: processOrder.id,
      companyId: processOrder.companyId,
    }),
    processOrderId: processOrder.id,
    processOrderNumber: processOrder.processOrderNumber,
    processRoute,
    idempotent: false,
    order,
  };
}

export function createFulfillmentOrder(input: Parameters<typeof createProcessOrderFromOrder>[0]) {
  return createProcessOrderFromOrder({ ...input, routeOverride: "fulfillment" });
}

export function createCustomizationOrder(input: Parameters<typeof createProcessOrderFromOrder>[0]) {
  return createProcessOrderFromOrder({ ...input, routeOverride: "customization" });
}

export function createProductionOrder(input: Parameters<typeof createProcessOrderFromOrder>[0]) {
  return createProcessOrderFromOrder({ ...input, routeOverride: "production" });
}

export async function getProcessOrders(filter: ProcessOrderListFilter = {}) {
  return repository.listProcessOrders(filter);
}

export async function getProcessOrderById(id: string, companyId?: string) {
  return repository.getProcessOrderById({ processOrderId: id, companyId });
}

export async function getProcessOrderByOrderId(orderId: string, companyId?: string) {
  return repository.getProcessOrderByOrderId({ ofissioOrderId: orderId, companyId });
}

export async function getProcessOrderDetail(
  processOrderId: string,
  companyId?: string,
): Promise<ProcessOrderDetail | null> {
  const processOrder = await repository.getProcessOrderById({ processOrderId, companyId });
  if (!processOrder) return null;
  const [items, tasks, events, sourceOrder] = await Promise.all([
    repository.listProcessOrderItems({ processOrderId, companyId: processOrder.companyId }),
    repository.listProcessOrderTasks({ processOrderId, companyId: processOrder.companyId }),
    repository.listProcessOrderEvents({ processOrderId, companyId: processOrder.companyId }),
    repositoryRegistry.orders.getOrderById({
      companyId: processOrder.companyId,
      orderId: processOrder.ofissioOrderId,
    }),
  ]);
  return { processOrder, sourceOrder, items, tasks, events };
}

export async function updateProcessOrderStatus(input: {
  processOrderId: string;
  status: ProcessOrderStatus;
  actorId?: string | null;
  actorType?: ProcessActorType;
  request?: Request;
}) {
  const detail = await getRequiredProcessOrderDetail(input.processOrderId);
  const current = detail.processOrder;
  const completedAt = input.status === "completed" ? new Date().toISOString() : current.completedAt;
  const patch: ProcessOrderPatch & { progress: number; completedAt: string | null } = {
    processStatus: input.status,
    progress: input.status === "completed" ? 100 : current.progress,
    completedAt,
  };
  const updated = await repository.updateProcessOrder({
    processOrderId: current.id,
    companyId: current.companyId,
    patch,
  });
  if (!updated) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  await afterProcessOrderUpdated({
    current,
    updated,
    eventType: "status_updated",
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    request: input.request,
    note: "Status process order diperbarui.",
  });
  return getRequiredProcessOrderDetail(updated.id);
}

export async function updateProcessOrderStage(input: {
  processOrderId: string;
  currentStage: string;
  actorId?: string | null;
  actorType?: ProcessActorType;
  request?: Request;
}) {
  const detail = await getRequiredProcessOrderDetail(input.processOrderId);
  const current = detail.processOrder;
  const updated = await repository.updateProcessOrder({
    processOrderId: current.id,
    companyId: current.companyId,
    patch: {
      currentStage: input.currentStage,
      processStatus: current.processStatus === "not_started" ? "in_progress" : current.processStatus,
    },
  });
  if (!updated) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  await afterProcessOrderUpdated({
    current,
    updated,
    eventType: "stage_updated",
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    request: input.request,
    note: "Stage process order diperbarui.",
  });
  return getRequiredProcessOrderDetail(updated.id);
}

export async function updateProcessOrder(input: {
  processOrderId: string;
  patch: ProcessOrderPatch;
  actorId?: string | null;
  actorType?: ProcessActorType;
  request?: Request;
}) {
  const detail = await getRequiredProcessOrderDetail(input.processOrderId);
  const current = detail.processOrder;
  const progress =
    input.patch.processStatus === "completed"
      ? 100
      : calculateProcessProgress({
          route: current.processRoute,
          status: input.patch.processStatus ?? current.processStatus,
          tasks: detail.tasks,
        });
  const completedAt =
    input.patch.processStatus === "completed"
      ? new Date().toISOString()
      : input.patch.processStatus === "cancelled"
        ? current.completedAt
        : current.completedAt;
  const updated = await repository.updateProcessOrder({
    processOrderId: current.id,
    companyId: current.companyId,
    patch: { ...input.patch, progress, completedAt },
  });
  if (!updated) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);

  const eventType: ProcessOrderEventType =
    input.patch.replenishmentStatus && input.patch.replenishmentStatus !== current.replenishmentStatus
      ? "replenishment_updated"
      : input.patch.notes && input.patch.notes !== current.notes
        ? "note_added"
        : input.patch.currentStage && input.patch.currentStage !== current.currentStage
          ? "stage_updated"
          : "status_updated";
  await afterProcessOrderUpdated({
    current,
    updated,
    eventType,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    request: input.request,
    note: eventType === "replenishment_updated"
      ? "Replenishment internal diperbarui."
      : "Process order diperbarui.",
  });
  return getRequiredProcessOrderDetail(updated.id);
}

export async function completeProcessTask(input: {
  processOrderId: string;
  taskId: string;
  notes?: string | null;
  actorId?: string | null;
  actorType?: ProcessActorType;
  request?: Request;
}) {
  const detail = await getRequiredProcessOrderDetail(input.processOrderId);
  const current = detail.processOrder;
  const task = detail.tasks.find((candidate) => candidate.id === input.taskId);
  if (!task) throw createApiError("NOT_FOUND", "Task process order tidak ditemukan.", 404);
  if (task.status !== "completed") {
    await repository.updateTaskStatus({
      processOrderId: current.id,
      taskId: task.id,
      companyId: current.companyId,
      status: "completed",
      notes: input.notes ?? task.notes,
    });
  }

  const afterComplete = await repository.listProcessOrderTasks({
    processOrderId: current.id,
    companyId: current.companyId,
  });
  const nextTask = nextPendingTask(afterComplete);
  if (nextTask && nextTask.status === "pending") {
    await repository.updateTaskStatus({
      processOrderId: current.id,
      taskId: nextTask.id,
      companyId: current.companyId,
      status: "in_progress",
    });
  }
  const tasks = await repository.listProcessOrderTasks({
    processOrderId: current.id,
    companyId: current.companyId,
  });
  const remaining = tasks.some((candidate) => candidate.status !== "completed");
  const nextStatus: ProcessOrderStatus = remaining ? "in_progress" : "completed";
  const nextStage = remaining ? getCurrentStageFromTasks(tasks) : "completed";
  const progress = calculateProcessProgress({
    route: current.processRoute,
    status: nextStatus,
    tasks,
  });
  const updated = await repository.updateProcessOrder({
    processOrderId: current.id,
    companyId: current.companyId,
    patch: {
      processStatus: nextStatus,
      currentStage: nextStage,
      progress,
      completedAt: nextStatus === "completed" ? new Date().toISOString() : current.completedAt,
    },
  });
  if (!updated) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);

  await repository.addProcessOrderEvent({
    event: createProcessEvent({
      processOrder: updated,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? "internal",
      eventType: "task_completed",
      oldStatus: current.processStatus,
      newStatus: updated.processStatus,
      oldStage: current.currentStage,
      newStage: updated.currentStage,
      note: `${task.taskName} selesai.`,
      metadata: {
        taskId: task.id,
        taskKey: task.taskKey,
        notes: input.notes ?? null,
      },
    }),
  });
  await afterProcessOrderUpdated({
    current,
    updated,
    eventType: "task_completed",
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    request: input.request,
    note: `${task.taskName} selesai.`,
    skipProcessEvent: true,
  });
  return getRequiredProcessOrderDetail(updated.id);
}

export async function addProcessOrderEvent(input: {
  processOrderId: string;
  eventType: ProcessOrderEventType;
  note: string;
  metadata?: Record<string, unknown>;
  actorId?: string | null;
  actorType?: ProcessActorType;
  request?: Request;
}) {
  const detail = await getRequiredProcessOrderDetail(input.processOrderId);
  const event = createProcessEvent({
    processOrder: detail.processOrder,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    eventType: input.eventType,
    oldStatus: detail.processOrder.processStatus,
    newStatus: detail.processOrder.processStatus,
    oldStage: detail.processOrder.currentStage,
    newStage: detail.processOrder.currentStage,
    note: input.note,
    metadata: input.metadata ?? {},
  });
  await repository.addProcessOrderEvent({ event });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "internal",
    companyId: detail.processOrder.companyId,
    action: "process_order_event_added",
    entityType: "process_order",
    entityId: detail.processOrder.id,
    metadata: { eventType: input.eventType },
  });
  return event;
}

export function getDefaultTasksByRoute(route: ProcessOrderRoute) {
  return [...DEFAULT_PROCESS_TASK_TEMPLATES[route]];
}

export function getCustomerTrackingStatusFromProcessOrder(processOrder: ProcessOrder) {
  const fulfillmentType = routeToTrackingFulfillmentType(processOrder.processRoute);
  const currentStageId = mapProcessStageToCustomerStage(processOrder);
  const template = DEFAULT_PROCESS_TASK_TEMPLATES[processOrder.processRoute];
  const currentTemplate =
    template.find((task) => task.stage === processOrder.currentStage) ??
    template.find((task) => task.taskKey === processOrder.currentStage);
  return {
    fulfillmentType,
    currentStageId,
    customerLabel:
      processOrder.processStatus === "completed"
        ? "Pesanan selesai"
        : currentTemplate?.customerLabel ?? initialCustomerLabel(processOrder.processRoute),
    nextStep: nextCustomerStep(processOrder),
    progress: processOrder.progress,
  };
}

async function getRequiredProcessOrderDetail(processOrderId: string) {
  const detail = await getProcessOrderDetail(processOrderId);
  if (!detail) throw createApiError("NOT_FOUND", "Process order tidak ditemukan.", 404);
  return detail;
}

function buildDefaultTasks(
  processOrder: ProcessOrder,
  now: string,
  processStatus: ProcessOrderStatus,
): ProcessOrderTask[] {
  return DEFAULT_PROCESS_TASK_TEMPLATES[processOrder.processRoute].map((task, index) => ({
    id: `ptask_${randomUUID()}`,
    processOrderId: processOrder.id,
    taskKey: task.taskKey,
    taskName: task.taskName,
    stage: task.stage,
    status:
      processStatus === "waiting_replenishment"
        ? "pending"
        : index === 0
          ? "in_progress"
          : "pending",
    sortOrder: index + 1,
    assignedTo: null,
    startedAt: processStatus !== "waiting_replenishment" && index === 0 ? now : null,
    completedAt: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildProcessOrderItems(
  order: PaymentOrderRecord,
  processOrder: ProcessOrder,
  now: string,
): ProcessOrderItem[] {
  return order.items.map((item, index) => ({
    id: `pitem_${randomUUID()}`,
    processOrderId: processOrder.id,
    orderItemId: `${order.id}_item_${index + 1}`,
    productId: item.productId,
    source: item.source,
    sourceId: item.sourceId,
    sku: item.sku,
    productName: item.productName,
    selectedColor: item.selectedColor,
    totalQty: item.totalQty,
    sizeMatrix: item.sizeMatrix,
    customization: {
      text: item.customization,
      type: processOrder.processRoute === "fulfillment"
        ? "none"
        : ensureOrderProcessRouting(order).customizationType ?? "none",
      placements: item.embroideryPlacements,
    },
    model3dId: item.model3dId,
    model3dUrl: item.model3dUrl,
    itemSnapshot: item,
    createdAt: now,
  }));
}

async function generateProcessOrderNumber(route: ProcessOrderRoute) {
  const year = String(new Date().getFullYear());
  const prefix = processOrderPrefix(route);
  const existing = await repository.listProcessOrders({ processRoute: route });
  const countForYear = existing.filter((order) =>
    order.processOrderNumber.startsWith(`${prefix}-${year}-`),
  ).length;
  return `${prefix}-${year}-${String(countForYear + 1).padStart(4, "0")}`;
}

function defaultAssignedTeam(route: ProcessOrderRoute) {
  switch (route) {
    case "fulfillment":
      return "logistics";
    case "customization":
      return "custom team";
    case "production":
      return "production";
  }
}

function createProcessEvent(input: {
  processOrder: ProcessOrder;
  actorId: string | null;
  actorType: ProcessActorType;
  eventType: ProcessOrderEventType;
  oldStatus?: ProcessOrderStatus | null;
  newStatus?: ProcessOrderStatus | null;
  oldStage?: string | null;
  newStage?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
}): ProcessOrderEvent {
  return {
    id: `pevt_${randomUUID()}`,
    processOrderId: input.processOrder.id,
    companyId: input.processOrder.companyId,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: input.eventType,
    oldStatus: input.oldStatus ?? null,
    newStatus: input.newStatus ?? null,
    oldStage: input.oldStage ?? null,
    newStage: input.newStage ?? null,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}

async function afterProcessOrderUpdated(input: {
  current: ProcessOrder;
  updated: ProcessOrder;
  eventType: ProcessOrderEventType;
  actorId: string | null;
  actorType: ProcessActorType;
  request?: Request;
  note: string;
  skipProcessEvent?: boolean;
}) {
  if (!input.skipProcessEvent) {
    await repository.addProcessOrderEvent({
      event: createProcessEvent({
        processOrder: input.updated,
        actorId: input.actorId,
        actorType: input.actorType,
        eventType: input.eventType,
        oldStatus: input.current.processStatus,
        newStatus: input.updated.processStatus,
        oldStage: input.current.currentStage,
        newStage: input.updated.currentStage,
        note: input.note,
      }),
    });
  }
  const sourceOrder = await repositoryRegistry.orders.getOrderById({
    companyId: input.updated.companyId,
    orderId: input.updated.ofissioOrderId,
  });
  if (sourceOrder) {
    await repositoryRegistry.orders.updateOrderProcess?.({
      companyId: sourceOrder.companyId,
      orderId: sourceOrder.id,
      patch: {
        processRoute: input.updated.processRoute,
        processStatus: input.updated.processStatus,
        replenishmentStatus: input.updated.replenishmentStatus,
        hasCustomization: sourceOrder.hasCustomization ?? input.updated.processRoute !== "fulfillment",
        customizationType: sourceOrder.customizationType ?? (input.updated.processRoute === "production" ? "custom_design" : "none"),
        processRouteReason: sourceOrder.processRouteReason ?? input.updated.notes,
      },
    });
    await syncTrackingFromProcessOrder(input.updated, sourceOrder);
  }
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
    companyId: input.updated.companyId,
    action:
      input.eventType === "task_completed"
        ? "process_order_task_completed"
        : input.eventType === "replenishment_updated"
          ? "process_order_replenishment_updated"
          : "process_order_updated",
    entityType: "process_order",
    entityId: input.updated.id,
    metadata: {
      processRoute: input.updated.processRoute,
      processStatus: input.updated.processStatus,
      currentStage: input.updated.currentStage,
    },
  });
}

async function syncTrackingFromProcessOrder(
  processOrder: ProcessOrder,
  order: PaymentOrderRecord,
) {
  const existing = await repositoryRegistry.tracking.getTrackingByOrderId({
    companyId: order.companyId,
    orderId: order.id,
  });
  const status = getCustomerTrackingStatusFromProcessOrder(processOrder);
  const base = existing ?? mapPaymentOrderToTracking({
    order,
    paymentStatus: order.status === "payment_received" ? "paid" : "waiting_payment",
    paymentReferenceId: order.orderNumber ?? null,
    companyName: null,
  });
  const timeline = buildTimeline(status.fulfillmentType, status.currentStageId, {
    currentProgressRatio: Math.min(0.95, Math.max(0.15, status.progress / 100)),
  });
  const next: CustomerTrackingOrder = {
    ...base,
    fulfillmentType: status.fulfillmentType,
    currentStageId: status.currentStageId,
    nextStep: status.nextStep,
    productionTimeline: timeline,
    items: base.items.map((item) => ({
      ...item,
      fulfillmentType: status.fulfillmentType,
      currentStageId: status.currentStageId,
      stages: timeline.map((stage) => ({ ...stage })),
    })),
    statusNote: status.customerLabel,
    updatedAt: new Date().toISOString(),
  };
  await repositoryRegistry.tracking.upsertTrackingOrder?.(next);
}

function routeToTrackingFulfillmentType(route: ProcessOrderRoute): TrackingFulfillmentType {
  switch (route) {
    case "fulfillment":
      return "READY_STOCK";
    case "customization":
      return "READY_STOCK_WITH_CUSTOMIZATION";
    case "production":
      return "MADE_TO_ORDER";
  }
}

function mapProcessStageToCustomerStage(processOrder: ProcessOrder) {
  if (processOrder.processStatus === "completed") return "completed";
  if (processOrder.processStatus === "waiting_customer_approval") return "artwork_approval";

  if (processOrder.processRoute === "fulfillment") {
    switch (processOrder.currentStage) {
      case "packing":
        return "packing";
      case "ready_to_ship":
        return "awaiting_pickup";
      case "shipped":
        return "in_transit";
      case "completed":
        return "completed";
      default:
        return "order_processing";
    }
  }

  if (processOrder.processRoute === "customization") {
    switch (processOrder.currentStage) {
      case "pull_stock":
        return "stock_preparation";
      case "qc_custom":
        return "custom_qc";
      case "packing":
      case "ready_to_ship":
        return "packing";
      default:
        return "custom_process";
    }
  }

  switch (processOrder.currentStage) {
    case "design_approval":
      return "artwork_approval";
    case "material_prep":
      return "production_preparation";
    case "cutting":
      return "cutting";
    case "sewing":
      return "sewing";
    case "customization":
      return "embroidery_printing";
    case "finishing":
      return "finishing";
    case "qc":
      return "quality_control";
    case "packing":
      return "packing";
    case "ready_to_ship":
      return "ready_to_ship";
    default:
      return "production_preparation";
  }
}

function initialCustomerLabel(route: ProcessOrderRoute) {
  switch (route) {
    case "fulfillment":
      return "Order siap diproses";
    case "customization":
      return "Menunggu proses custom logo/bordir";
    case "production":
      return "Menunggu persiapan produksi";
  }
}

function nextCustomerStep(processOrder: ProcessOrder) {
  if (processOrder.processStatus === "completed") return null;
  const templates = DEFAULT_PROCESS_TASK_TEMPLATES[processOrder.processRoute];
  const currentIndex = templates.findIndex(
    (task) => task.stage === processOrder.currentStage || task.taskKey === processOrder.currentStage,
  );
  return templates[currentIndex + 1]?.customerLabel ?? "Tim Ofissio akan memperbarui tahap berikutnya.";
}
