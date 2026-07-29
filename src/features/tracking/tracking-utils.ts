import type {
  OrderItemProgress,
  OrderTimelineStage,
  CustomerTrackingOrder,
  TrackingRole,
  TrackingFulfillmentType,
  TrackingPaymentStatus,
  TrackingStageState,
  WeightedTrackingStage,
} from "./tracking.types";

export const STAGE_TEMPLATES: Record<
  TrackingFulfillmentType,
  WeightedTrackingStage[]
> = {
  READY_STOCK: [
    { id: "waiting_payment", label: "Menunggu pembayaran", weight: 0 },
    { id: "payment_received", label: "Pembayaran diterima", weight: 10 },
    { id: "order_processing", label: "Pesanan diproses", weight: 22 },
    { id: "packing", label: "Packing", weight: 18 },
    { id: "awaiting_pickup", label: "Menunggu pickup", weight: 10 },
    { id: "in_transit", label: "Dalam pengiriman", weight: 25 },
    { id: "delivered", label: "Terkirim", weight: 15 },
    { id: "completed", label: "Selesai", weight: 0 },
  ],
  READY_STOCK_WITH_CUSTOMIZATION: [
    { id: "waiting_payment", label: "Menunggu pembayaran", weight: 0 },
    { id: "payment_received", label: "Pembayaran diterima", weight: 10 },
    { id: "stock_preparation", label: "Barang disiapkan dari stok", weight: 12 },
    { id: "custom_process", label: "Proses bordir/sablon", weight: 35 },
    { id: "custom_qc", label: "QC custom", weight: 13 },
    { id: "packing", label: "Packing", weight: 10 },
    { id: "in_transit", label: "Dalam pengiriman", weight: 15 },
    { id: "delivered", label: "Terkirim", weight: 5 },
    { id: "completed", label: "Selesai", weight: 0 },
  ],
  MADE_TO_ORDER: [
    { id: "order_received", label: "Pesanan diterima", weight: 0 },
    { id: "payment_confirmed", label: "Pembayaran dikonfirmasi", weight: 0 },
    { id: "artwork_approval", label: "Approval desain", weight: 10 },
    { id: "production_preparation", label: "Persiapan produksi", weight: 10 },
    { id: "cutting", label: "Cutting", weight: 15 },
    { id: "sewing", label: "Sewing", weight: 30 },
    { id: "embroidery_printing", label: "Bordir/Sablon", weight: 20 },
    { id: "finishing", label: "Finishing", weight: 7 },
    { id: "quality_control", label: "Quality Control", weight: 5 },
    { id: "packing", label: "Packing", weight: 3 },
    { id: "ready_to_ship", label: "Siap dikirim", weight: 0 },
    { id: "in_transit", label: "Dalam pengiriman", weight: 0 },
    { id: "delivered", label: "Terkirim", weight: 0 },
    { id: "completed", label: "Selesai", weight: 0 },
  ],
  QUOTATION_ONLY: [
    { id: "quotation_submitted", label: "Quotation submitted", weight: 20 },
    { id: "quotation_reviewed", label: "Quotation reviewed", weight: 25 },
    { id: "quotation_sent", label: "Quotation sent", weight: 25 },
    { id: "customer_accepted", label: "Customer accepted", weight: 15 },
    { id: "waiting_payment", label: "Waiting payment", weight: 10 },
    { id: "paid", label: "Paid", weight: 5 },
  ],
};

export function stageProgressRatio(stage: OrderTimelineStage): number {
  if (stage.state === "completed") return 1;
  if (stage.state !== "current") return 0;

  if (
    typeof stage.completedQty === "number" &&
    typeof stage.totalQty === "number" &&
    stage.totalQty > 0
  ) {
    return clamp01(stage.completedQty / stage.totalQty);
  }

  if (typeof stage.progressRatio === "number") {
    return clamp01(stage.progressRatio);
  }

  return 0;
}

export function calculateOrderProgress(stages: OrderTimelineStage[]): number {
  const weightedProgress = stages.reduce((total, stage) => {
    return total + stage.weight * stageProgressRatio(stage);
  }, 0);
  const weightedTotal = stages.reduce((total, stage) => total + stage.weight, 0);
  if (weightedTotal <= 0) return 0;
  return Math.round(clamp01(weightedProgress / weightedTotal) * 100);
}

export function calculateItemProgress(item: OrderItemProgress): number {
  return calculateOrderProgress(item.stages);
}

export function mapInternalStatusToCustomerStatus(
  fulfillmentType: TrackingFulfillmentType,
  currentStageId: string,
  paymentStatus?: TrackingPaymentStatus,
): string {
  if (paymentStatus === "failed") return "Pembayaran bermasalah";

  const stage = STAGE_TEMPLATES[fulfillmentType].find(
    (candidate) => candidate.id === currentStageId,
  );
  if (stage) return stage.label;

  switch (currentStageId) {
    case "payment_received":
    case "payment_confirmed":
      return "Pembayaran diterima";
    case "ready_to_ship":
      return "Siap dikirim";
    case "in_transit":
      return "Dalam pengiriman";
    case "delivered":
      return "Terkirim";
    case "completed":
      return "Selesai";
    default:
      return "Status sedang diperbarui";
  }
}

export function trackingOrderStatusLabel(
  order: Pick<
    CustomerTrackingOrder,
    | "currentStageId"
    | "documents"
    | "fulfillmentType"
    | "orderStatus"
    | "paymentStatus"
    | "statusNote"
  >,
): string {
  const isConvertedQuotation =
    order.paymentStatus === "waiting_payment" &&
    order.orderStatus === "waiting_payment" &&
    ["order_received", "waiting_payment"].includes(order.currentStageId) &&
    order.documents.some((document) => document.type === "quotation") &&
    order.statusNote?.toLowerCase().includes("quotation");

  if (isConvertedQuotation) return "Quotation disetujui";

  return mapInternalStatusToCustomerStatus(
    order.fulfillmentType,
    order.currentStageId,
    order.paymentStatus,
  );
}

export function fulfillmentLabel(type: TrackingFulfillmentType): string {
  switch (type) {
    case "READY_STOCK":
      return "Ready Stock";
    case "READY_STOCK_WITH_CUSTOMIZATION":
      return "Ready Stock + Custom";
    case "MADE_TO_ORDER":
      return "Made to Order";
    case "QUOTATION_ONLY":
      return "Quotation Only";
  }
}

export function paymentStatusLabel(status: TrackingPaymentStatus): string {
  switch (status) {
    case "waiting_payment":
      return "Menunggu pembayaran";
    case "paid":
      return "Lunas";
    case "verified":
      return "Terverifikasi";
    case "failed":
      return "Gagal";
    case "not_required":
      return "Belum diperlukan";
  }
}

export function stageStateLabel(state: TrackingStageState): string {
  switch (state) {
    case "completed":
      return "Selesai";
    case "current":
      return "Berjalan";
    case "pending":
      return "Menunggu";
    case "blocked":
      return "Butuh aksi";
  }
}

export function trackingRoleLabel(role?: TrackingRole | null): string {
  switch (role) {
    case "finance":
      return "Finance";
    case "sales_cs":
      return "Sales/CS";
    case "ppic":
      return "PPIC/Kepala Produksi";
    case "production_admin":
      return "Admin Produksi";
    case "section_head":
      return "Kepala Bagian";
    case "qc":
      return "QC";
    case "logistics":
      return "Logistik";
    case "shipping_api":
      return "Shipping API";
    case "customer":
      return "Customer";
    case "ofistant":
      return "Ofistant";
    default:
      return "-";
  }
}

export function buildTimeline(
  fulfillmentType: TrackingFulfillmentType,
  currentStageId: string,
  options?: {
    currentCompletedQty?: number;
    currentTotalQty?: number;
    currentProgressRatio?: number;
    completedAtPrefix?: string;
  },
): OrderTimelineStage[] {
  const template = STAGE_TEMPLATES[fulfillmentType];
  const currentIndex = Math.max(
    0,
    template.findIndex((stage) => stage.id === currentStageId),
  );
  return template.map((stage, index) => {
    const state: TrackingStageState =
      index < currentIndex
        ? "completed"
        : index === currentIndex
          ? "current"
          : "pending";
    return {
      ...stage,
      state,
      completedAt:
        state === "completed"
          ? `${options?.completedAtPrefix ?? "2026-07"}-${String(10 + index).padStart(2, "0")}T09:00:00.000Z`
          : null,
      updatedAt: state === "current" ? "2026-07-28T09:30:00.000Z" : null,
      completedQty:
        state === "current" ? options?.currentCompletedQty ?? null : null,
      totalQty: state === "current" ? options?.currentTotalQty ?? null : null,
      progressRatio:
        state === "current" ? options?.currentProgressRatio ?? null : null,
    };
  });
}

export function summarizeSizeMatrix(sizeMatrix: Record<string, number>): string {
  return Object.entries(sizeMatrix)
    .filter(([, qty]) => qty > 0)
    .map(([size, qty]) => `${size}: ${qty}`)
    .join(", ");
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
