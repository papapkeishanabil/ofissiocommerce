import type {
  ProcessOrderPriority,
  ProcessOrderRoute,
  ProcessOrderStatus,
  ProcessReplenishmentStatus,
  ProcessTaskTemplate,
} from "./process-order.types";

export const PROCESS_ORDER_ROUTES = [
  "fulfillment",
  "customization",
  "production",
] as const satisfies readonly ProcessOrderRoute[];

export const PROCESS_ORDER_STATUSES = [
  "not_started",
  "ready_to_process",
  "in_progress",
  "waiting_replenishment",
  "waiting_customer_approval",
  "on_hold",
  "completed",
  "cancelled",
] as const satisfies readonly ProcessOrderStatus[];

export const PROCESS_REPLENISHMENT_STATUSES = [
  "not_required",
  "needed",
  "in_progress",
  "completed",
] as const satisfies readonly ProcessReplenishmentStatus[];

export const PROCESS_ORDER_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const satisfies readonly ProcessOrderPriority[];

export const PROCESS_ROUTE_PREFIX = {
  fulfillment: "FUL",
  customization: "CUS",
  production: "PROD",
} as const satisfies Record<ProcessOrderRoute, string>;

export const PROCESS_ROUTE_LABEL = {
  fulfillment: "Fulfillment Order",
  customization: "Customization Order",
  production: "Production Order / SPK",
} as const satisfies Record<ProcessOrderRoute, string>;

export const PROCESS_ROUTE_DESCRIPTION = {
  fulfillment:
    "Produk standar tanpa custom: picking → packing → ready to ship.",
  customization:
    "Produk standar dengan logo/bordir/sablon/nama: pull stock → custom → QC → packing.",
  production:
    "Desain/model/bahan khusus: approval desain → material → cutting → sewing → QC.",
} as const satisfies Record<ProcessOrderRoute, string>;

export const INITIAL_PROCESS_PROGRESS = {
  fulfillment: 10,
  customization: 10,
  production: 5,
} as const satisfies Record<ProcessOrderRoute, number>;

export const DEFAULT_PROCESS_TASK_TEMPLATES = {
  fulfillment: [
    {
      taskKey: "picking",
      taskName: "Picking produk standar",
      stage: "picking",
      customerLabel: "Order sedang diproses",
    },
    {
      taskKey: "packing",
      taskName: "Packing order",
      stage: "packing",
      customerLabel: "Pesanan sedang dikemas",
    },
    {
      taskKey: "ready_to_ship",
      taskName: "Ready to ship",
      stage: "ready_to_ship",
      customerLabel: "Pesanan siap dikirim",
    },
  ],
  customization: [
    {
      taskKey: "pull_stock",
      taskName: "Ambil produk standar dari stok",
      stage: "pull_stock",
      customerLabel: "Order sedang diproses",
    },
    {
      taskKey: "artwork_check",
      taskName: "Cek artwork/logo",
      stage: "artwork_check",
      customerLabel: "Pesanan masuk proses custom",
    },
    {
      taskKey: "embroidery_or_print",
      taskName: "Bordir / sablon / nama",
      stage: "customization",
      customerLabel: "Pesanan masuk proses custom",
    },
    {
      taskKey: "qc_custom",
      taskName: "QC hasil custom",
      stage: "qc_custom",
      customerLabel: "Hasil custom sedang dicek",
    },
    {
      taskKey: "packing",
      taskName: "Packing order",
      stage: "packing",
      customerLabel: "Pesanan sedang dikemas",
    },
    {
      taskKey: "ready_to_ship",
      taskName: "Ready to ship",
      stage: "ready_to_ship",
      customerLabel: "Pesanan siap dikirim",
    },
  ],
  production: [
    {
      taskKey: "design_approval",
      taskName: "Approval desain",
      stage: "design_approval",
      customerLabel: "Pesanan masuk persiapan produksi",
    },
    {
      taskKey: "material_prep",
      taskName: "Persiapan bahan",
      stage: "material_prep",
      customerLabel: "Pesanan masuk persiapan produksi",
    },
    {
      taskKey: "cutting",
      taskName: "Cutting",
      stage: "cutting",
      customerLabel: "Produksi sedang berjalan",
    },
    {
      taskKey: "sewing",
      taskName: "Sewing",
      stage: "sewing",
      customerLabel: "Produksi sedang berjalan",
    },
    {
      taskKey: "embroidery_or_print",
      taskName: "Bordir / sablon",
      stage: "customization",
      customerLabel: "Proses custom sedang berjalan",
    },
    {
      taskKey: "finishing",
      taskName: "Finishing",
      stage: "finishing",
      customerLabel: "Finishing",
    },
    {
      taskKey: "qc",
      taskName: "Quality Control",
      stage: "qc",
      customerLabel: "Quality control",
    },
    {
      taskKey: "packing",
      taskName: "Packing order",
      stage: "packing",
      customerLabel: "Pesanan sedang dikemas",
    },
    {
      taskKey: "ready_to_ship",
      taskName: "Ready to ship",
      stage: "ready_to_ship",
      customerLabel: "Pesanan siap dikirim",
    },
  ],
} as const satisfies Record<ProcessOrderRoute, readonly ProcessTaskTemplate[]>;

export function processOrderRouteLabel(route: ProcessOrderRoute) {
  return PROCESS_ROUTE_LABEL[route];
}

export function processOrderStatusLabel(status: ProcessOrderStatus) {
  switch (status) {
    case "not_started":
      return "Belum dimulai";
    case "ready_to_process":
      return "Siap diproses";
    case "in_progress":
      return "Berjalan";
    case "waiting_replenishment":
      return "Menunggu replenishment";
    case "waiting_customer_approval":
      return "Menunggu approval customer";
    case "on_hold":
      return "Ditahan";
    case "completed":
      return "Pengerjaan selesai";
    case "cancelled":
      return "Dibatalkan";
  }
}
