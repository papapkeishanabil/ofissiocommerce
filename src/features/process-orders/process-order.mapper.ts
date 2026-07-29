import type { SizeMatrix } from "@/types/industry";
import type {
  ProcessOrder,
  ProcessOrderEvent,
  ProcessOrderItem,
  ProcessOrderTask,
} from "./process-order.types";

type Row = Record<string, unknown>;

export function processOrderToRow(order: ProcessOrder): Row {
  return {
    id: order.id,
    process_order_number: order.processOrderNumber,
    ofissio_order_id: order.ofissioOrderId,
    woo_order_id: order.wooOrderId,
    quotation_id: order.quotationId,
    company_id: order.companyId,
    process_route: order.processRoute,
    process_status: order.processStatus,
    replenishment_status: order.replenishmentStatus,
    current_stage: order.currentStage,
    progress: order.progress,
    priority: order.priority,
    deadline: order.deadline,
    assigned_team: order.assignedTeam,
    created_by: order.createdBy,
    notes: order.notes,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    completed_at: order.completedAt,
  };
}

export function rowToProcessOrder(row: Row): ProcessOrder {
  return {
    id: String(row.id),
    processOrderNumber: String(row.process_order_number),
    ofissioOrderId: String(row.ofissio_order_id),
    wooOrderId: row.woo_order_id ? String(row.woo_order_id) : null,
    quotationId: row.quotation_id ? String(row.quotation_id) : null,
    companyId: String(row.company_id),
    processRoute: String(row.process_route) as ProcessOrder["processRoute"],
    processStatus: String(row.process_status) as ProcessOrder["processStatus"],
    replenishmentStatus: String(row.replenishment_status) as ProcessOrder["replenishmentStatus"],
    currentStage: String(row.current_stage),
    progress: Number(row.progress ?? 0),
    priority: String(row.priority ?? "normal") as ProcessOrder["priority"],
    deadline: row.deadline ? String(row.deadline) : null,
    assignedTeam: row.assigned_team ? String(row.assigned_team) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

export function processOrderItemToRow(item: ProcessOrderItem): Row {
  return {
    id: item.id,
    process_order_id: item.processOrderId,
    order_item_id: item.orderItemId,
    product_id: item.productId,
    source: item.source,
    source_id: item.sourceId,
    sku: item.sku,
    product_name: item.productName,
    selected_color: item.selectedColor,
    total_qty: item.totalQty,
    size_matrix_json: item.sizeMatrix,
    customization_json: item.customization,
    model_3d_id: item.model3dId,
    model_3d_url: item.model3dUrl,
    item_snapshot_json: item.itemSnapshot,
    created_at: item.createdAt,
  };
}

export function rowToProcessOrderItem(row: Row): ProcessOrderItem {
  return {
    id: String(row.id),
    processOrderId: String(row.process_order_id),
    orderItemId: row.order_item_id ? String(row.order_item_id) : null,
    productId: String(row.product_id),
    source: String(row.source),
    sourceId: row.source_id ? String(row.source_id) : null,
    sku: String(row.sku),
    productName: String(row.product_name),
    selectedColor: String(row.selected_color),
    totalQty: Number(row.total_qty ?? 0),
    sizeMatrix: objectOrEmpty(row.size_matrix_json) as SizeMatrix,
    customization: {
      text: stringOrNull((row.customization_json as Row | undefined)?.text),
      type: String((row.customization_json as Row | undefined)?.type ?? "none") as ProcessOrderItem["customization"]["type"],
      placements: Array.isArray((row.customization_json as Row | undefined)?.placements)
        ? ((row.customization_json as Row).placements as ProcessOrderItem["customization"]["placements"])
        : [],
    },
    model3dId: row.model_3d_id ? String(row.model_3d_id) : null,
    model3dUrl: row.model_3d_url ? String(row.model_3d_url) : null,
    itemSnapshot: objectOrEmpty(row.item_snapshot_json),
    createdAt: String(row.created_at),
  };
}

export function processOrderTaskToRow(task: ProcessOrderTask): Row {
  return {
    id: task.id,
    process_order_id: task.processOrderId,
    task_key: task.taskKey,
    task_name: task.taskName,
    stage: task.stage,
    status: task.status,
    sort_order: task.sortOrder,
    assigned_to: task.assignedTo,
    started_at: task.startedAt,
    completed_at: task.completedAt,
    notes: task.notes,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export function rowToProcessOrderTask(row: Row): ProcessOrderTask {
  return {
    id: String(row.id),
    processOrderId: String(row.process_order_id),
    taskKey: String(row.task_key),
    taskName: String(row.task_name),
    stage: String(row.stage),
    status: String(row.status) as ProcessOrderTask["status"],
    sortOrder: Number(row.sort_order ?? 0),
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function processOrderEventToRow(event: ProcessOrderEvent): Row {
  return {
    id: event.id,
    process_order_id: event.processOrderId,
    company_id: event.companyId,
    actor_id: event.actorId,
    actor_type: event.actorType,
    event_type: event.eventType,
    old_status: event.oldStatus,
    new_status: event.newStatus,
    old_stage: event.oldStage,
    new_stage: event.newStage,
    note: event.note,
    metadata_json: event.metadata,
    created_at: event.createdAt,
  };
}

export function rowToProcessOrderEvent(row: Row): ProcessOrderEvent {
  return {
    id: String(row.id),
    processOrderId: String(row.process_order_id),
    companyId: String(row.company_id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actorType: String(row.actor_type ?? "system") as ProcessOrderEvent["actorType"],
    eventType: String(row.event_type) as ProcessOrderEvent["eventType"],
    oldStatus: row.old_status ? (String(row.old_status) as ProcessOrderEvent["oldStatus"]) : null,
    newStatus: row.new_status ? (String(row.new_status) as ProcessOrderEvent["newStatus"]) : null,
    oldStage: row.old_stage ? String(row.old_stage) : null,
    newStage: row.new_stage ? String(row.new_stage) : null,
    note: row.note ? String(row.note) : null,
    metadata: objectOrEmpty(row.metadata_json),
    createdAt: String(row.created_at),
  };
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
