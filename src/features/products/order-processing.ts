import type { ProductProcessRoute } from "./product.types";

export const EMBROIDERY_PROCESSING_TIME = "2–4 hari";

export type OrderProcessingInfo = {
  kind: "ready_stock" | "embroidery" | "production" | "made_to_order";
  label: string;
  value: string;
  detail: string;
};

interface ResolveOrderProcessingInput {
  processRoute?: ProductProcessRoute;
  fulfillmentType?: string;
  leadTimeDays?: number;
  hasEmbroidery?: boolean;
}

/** Separates stock availability, embroidery time, and full-production time. */
export function resolveOrderProcessingInfo({
  processRoute,
  fulfillmentType,
  leadTimeDays,
  hasEmbroidery = false,
}: ResolveOrderProcessingInput): OrderProcessingInfo {
  if (processRoute === "production") {
    return {
      kind: "production",
      label: "Estimasi produksi",
      value: `${positiveDayOrDefault(leadTimeDays, 14)} hari`,
      detail: "Untuk produksi full custom; belum termasuk waktu pengiriman.",
    };
  }

  if (hasEmbroidery || processRoute === "customization") {
    return {
      kind: "embroidery",
      label: "Pengerjaan bordir",
      value: EMBROIDERY_PROCESSING_TIME,
      detail: "Tergantung jumlah dan persetujuan preview; belum termasuk waktu pengiriman.",
    };
  }

  if (fulfillmentType === "READY_STOCK") {
    return {
      kind: "ready_stock",
      label: "Status",
      value: "Ready Stock",
      detail: "Siap diproses tanpa waktu produksi; estimasi pengiriman tersedia saat checkout.",
    };
  }

  return {
    kind: "made_to_order",
    label: "Status",
    value: "Made to Order",
    detail: "Jadwal pengerjaan dikonfirmasi sesuai kebutuhan pesanan.",
  };
}

function positiveDayOrDefault(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.round(Number(value)) : fallback;
}
