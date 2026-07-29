import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type {
  OrderCustomizationType,
  OrderProcessRoute,
  OrderProcessStatus,
  OrderReplenishmentStatus,
} from "@/features/orders/order.types";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type { SizeMatrix } from "@/types/industry";

export type ProcessOrderRoute = OrderProcessRoute;
export type ProcessOrderStatus = OrderProcessStatus;
export type ProcessReplenishmentStatus = OrderReplenishmentStatus;
export type ProcessCustomizationType = OrderCustomizationType;

export type ProcessOrderPriority = "low" | "normal" | "high" | "urgent";
export type ProcessTaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type ProcessActorType = "internal" | "customer" | "system";
export type ProcessOrderEventType =
  | "created"
  | "status_updated"
  | "stage_updated"
  | "task_completed"
  | "replenishment_updated"
  | "note_added"
  | "event_added";

export interface ProcessTaskTemplate {
  taskKey: string;
  taskName: string;
  stage: string;
  customerLabel: string;
}

export interface ProcessOrder {
  id: string;
  processOrderNumber: string;
  ofissioOrderId: string;
  wooOrderId: string | null;
  quotationId: string | null;
  companyId: string;
  processRoute: ProcessOrderRoute;
  processStatus: ProcessOrderStatus;
  replenishmentStatus: ProcessReplenishmentStatus;
  currentStage: string;
  progress: number;
  priority: ProcessOrderPriority;
  deadline: string | null;
  assignedTeam: string | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ProcessOrderItem {
  id: string;
  processOrderId: string;
  orderItemId: string | null;
  productId: string;
  source: ValidatedCheckoutCartItem["source"] | string;
  sourceId: string | null;
  sku: string;
  productName: string;
  selectedColor: string;
  totalQty: number;
  sizeMatrix: SizeMatrix;
  customization: {
    text: string | null;
    type: ProcessCustomizationType;
    placements: ValidatedCheckoutCartItem["embroideryPlacements"];
  };
  model3dId: string | null;
  model3dUrl: string | null;
  itemSnapshot: ValidatedCheckoutCartItem | Record<string, unknown>;
  createdAt: string;
}

export interface ProcessOrderTask {
  id: string;
  processOrderId: string;
  taskKey: string;
  taskName: string;
  stage: string;
  status: ProcessTaskStatus;
  sortOrder: number;
  assignedTo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessOrderEvent {
  id: string;
  processOrderId: string;
  companyId: string;
  actorId: string | null;
  actorType: ProcessActorType;
  eventType: ProcessOrderEventType;
  oldStatus: ProcessOrderStatus | null;
  newStatus: ProcessOrderStatus | null;
  oldStage: string | null;
  newStage: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProcessOrderDetail {
  processOrder: ProcessOrder;
  sourceOrder: PaymentOrderRecord | null;
  items: ProcessOrderItem[];
  tasks: ProcessOrderTask[];
  events: ProcessOrderEvent[];
}

export interface ProcessOrderCreateResult extends ProcessOrderDetail {
  processOrderId: string;
  processOrderNumber: string;
  processRoute: ProcessOrderRoute;
  idempotent: boolean;
  order: PaymentOrderRecord | null;
}

export interface ProcessOrderListFilter {
  companyId?: string;
  processRoute?: ProcessOrderRoute;
  processStatus?: ProcessOrderStatus;
}

export interface ProcessOrderPatch {
  processStatus?: ProcessOrderStatus;
  replenishmentStatus?: ProcessReplenishmentStatus;
  currentStage?: string;
  priority?: ProcessOrderPriority;
  deadline?: string | null;
  assignedTeam?: string | null;
  notes?: string | null;
}
