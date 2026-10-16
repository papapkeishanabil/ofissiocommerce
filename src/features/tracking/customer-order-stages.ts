import type { CustomerTrackingOrder, OrderTimelineStage, TrackingPaymentStatus } from "./tracking.types";

export const CUSTOMER_ORDER_STAGES = [
  { id: "waiting_payment", label: "Menunggu pembayaran" },
  { id: "processing", label: "Pesanan diproses" },
  { id: "ready_to_ship", label: "Siap dikirim" },
  { id: "in_transit", label: "Dalam pengiriman" },
  { id: "delivered", label: "Terkirim" },
] as const;

type CustomerStageId = typeof CUSTOMER_ORDER_STAGES[number]["id"];
const PROCESS_STAGES = new Set(["payment_received", "payment_confirmed", "payment_received_full", "payment_received_deposit", "payment_confirmed_deposit", "paid", "order_processing", "stock_preparation", "custom_process", "custom_qc", "artwork_approval", "production_preparation", "cutting", "sewing", "embroidery_printing", "finishing", "quality_control", "packing", "processing"]);

/** Presentation only: internal stage IDs and fulfillment workflows stay intact. */
export function customerStageId(id: string, paymentStatus?: TrackingPaymentStatus): CustomerStageId | null {
  if (["waiting_payment", "order_received"].includes(id)) {
    return paymentStatus && ["paid", "verified", "deposit_paid", "not_required"].includes(paymentStatus) ? "processing" : "waiting_payment";
  }
  if (PROCESS_STAGES.has(id)) return "processing";
  if (["ready_to_ship", "awaiting_pickup", "awaiting_courier_pickup", "pickup_scheduled"].includes(id)) return "ready_to_ship";
  if (["in_transit", "picked_up"].includes(id)) return "in_transit";
  if (["delivered", "completed"].includes(id)) return "delivered";
  return null;
}

export function customerStageLabel(id: string, paymentStatus?: TrackingPaymentStatus) {
  const mapped = customerStageId(id, paymentStatus);
  return CUSTOMER_ORDER_STAGES.find(stage => stage.id === mapped)?.label;
}

type StageOrder = Pick<CustomerTrackingOrder, "productionTimeline" | "currentStageId" | "paymentStatus" | "fulfillmentType" | "actualDeliveredAt">;

export function customerOrderDelivered(order: Pick<CustomerTrackingOrder, "currentStageId" | "actualDeliveredAt">) {
  return Boolean(order.actualDeliveredAt) || ["delivered", "completed"].includes(order.currentStageId);
}

export function getCustomerOrderStages(order: StageOrder): OrderTimelineStage[] {
  if (!order.productionTimeline.length || order.fulfillmentType === "QUOTATION_ONLY") return order.productionTimeline;
  const delivered = customerOrderDelivered(order);
  const currentId = customerStageId(order.currentStageId, order.paymentStatus)
    ?? customerStageId(order.productionTimeline.find(stage => stage.state === "current" || stage.state === "blocked")?.id ?? "")
    ?? "waiting_payment";
  const currentIndex = CUSTOMER_ORDER_STAGES.findIndex(stage => stage.id === currentId);

  return CUSTOMER_ORDER_STAGES.map((stage, index) => {
    const members = order.productionTimeline.filter(internal => customerStageId(internal.id) === stage.id);
    const activeMember = members.find(internal => internal.id === order.currentStageId) ?? members.find(internal => internal.state === "blocked" || internal.state === "current");
    const state = delivered || index < currentIndex ? "completed" : index > currentIndex ? "pending" : members.some(internal => internal.state === "blocked") ? "blocked" : "current";
    const completedDates = members.flatMap(internal => internal.completedAt ? [internal.completedAt] : []).sort();
    const deliveryStage = members.find(internal => internal.id === "delivered");
    return {
      ...stage,
      state,
      weight: members.reduce((sum, internal) => sum + internal.weight, 0),
      completedAt: state === "completed" ? stage.id === "delivered" ? order.actualDeliveredAt || deliveryStage?.completedAt || deliveryStage?.updatedAt || completedDates.at(-1) || null : completedDates.at(-1) || null : null,
      completedQty: state === "current" ? activeMember?.completedQty : null,
      totalQty: state === "current" ? activeMember?.totalQty : null,
      progressRatio: state === "current" ? activeMember?.progressRatio : null,
    };
  });
}
