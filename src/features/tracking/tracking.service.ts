import type { Order, Quotation } from "@/types/order";
import { listOrders, listQuotations } from "@/lib/commerce/order-service";
import { readJSON, writeJSON } from "@/lib/mock/storage";
import { productService } from "@/features/products/product.service";
import type {
  PaymentOrderRecord,
  PaymentOrderStatus,
} from "@/features/payment/payment.types";
import type { ShippingRate } from "@/features/shipping/shipping.types";

import {
  createMockQuotationTracking,
  createMockTrackingOrders,
} from "./mock-tracking-data";
import type {
  CustomerQuotationTracking,
  CustomerTrackingOrder,
  DashboardTrackingSnapshot,
  OrderItemProgress,
  OrderTimelineStage,
  ShipmentTimelineEntry,
  TrackingFulfillmentType,
  TrackingPaymentStatus,
  TrackingRole,
} from "./tracking.types";
import {
  buildTimeline,
  calculateOrderProgress,
  fulfillmentLabel,
  mapInternalStatusToCustomerStatus,
} from "./tracking-utils";

const DEFAULT_COMPANY_ID = "mock-company";
const DEFAULT_COMPANY_NAME = "PT Harmas Ofissio Demo";
const CLIENT_TRACKING_CACHE_KEY = "tracking-orders";
const SNAPSHOT_URL = "/products/kk-006/KK-006-front-nobg.webp";

export interface TrackingScope {
  companyId?: string | null;
  companyName?: string | null;
}

function scopeOrDefault(scope?: TrackingScope) {
  return {
    companyId: scope?.companyId || DEFAULT_COMPANY_ID,
    companyName: scope?.companyName || DEFAULT_COMPANY_NAME,
  };
}

export function getDashboardTrackingSnapshot(
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): DashboardTrackingSnapshot {
  const resolved = scopeOrDefault(scope);
  const orders = getCustomerOrders(resolved, externalOrders);
  const quotations = getAllQuotationTracking(resolved);

  return {
    companyId: resolved.companyId,
    activeOrders: orders.filter((order) => !isHistoryOrder(order)),
    orderHistory: orders.filter(isHistoryOrder),
    quotations,
  };
}

export function getCustomerOrders(
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): CustomerTrackingOrder[] {
  const resolved = scopeOrDefault(scope);
  const mock = createMockTrackingOrders(
    resolved.companyId,
    resolved.companyName,
  );
  const legacy = readLegacyOrders(resolved.companyId, resolved.companyName);
  const cached = readClientTrackingOrders(resolved.companyId);
  return mergeTrackingOrders([
    externalOrders,
    cached,
    legacy,
    mock,
  ]);
}

export function getAllTrackingOrders(
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): CustomerTrackingOrder[] {
  return getCustomerOrders(scope, externalOrders);
}

export function getOrderTrackingById(
  idOrNumber: string,
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): CustomerTrackingOrder | null {
  const needle = idOrNumber.toLowerCase();
  return (
    getCustomerOrders(scope, externalOrders).find(
      (order) =>
        order.id.toLowerCase() === needle ||
        order.orderNumber.toLowerCase() === needle,
    ) ?? null
  );
}

export function getTrackingOrder(
  idOrNumber: string,
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): CustomerTrackingOrder | null {
  return getOrderTrackingById(idOrNumber, scope, externalOrders);
}

export function getLatestActiveOrder(
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): CustomerTrackingOrder | null {
  const snapshot = getDashboardTrackingSnapshot(scope, externalOrders);
  return (
    snapshot.activeOrders[0] ??
    snapshot.orderHistory[0] ??
    null
  );
}

export function getPrimaryActiveOrder(
  scope?: TrackingScope,
  externalOrders: CustomerTrackingOrder[] = [],
): CustomerTrackingOrder | null {
  return getLatestActiveOrder(scope, externalOrders);
}

export function getAllQuotationTracking(
  scope?: TrackingScope,
): CustomerQuotationTracking[] {
  const resolved = scopeOrDefault(scope);
  return [
    ...readLegacyQuotations(resolved.companyId, resolved.companyName),
    ...createMockQuotationTracking(resolved.companyId, resolved.companyName),
  ].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}

export function getOfistantOrderStatusText(
  scope?: TrackingScope,
): { order: CustomerTrackingOrder | null; text: string } {
  const order = getLatestActiveOrder(scope);
  if (!order) {
    return {
      order: null,
      text:
        "Saya belum menemukan data order untuk akun ini. Jika order dibuat di channel lain, tim sales bisa bantu cek manual.",
    };
  }

  const progress = calculateOrderProgress(order.productionTimeline);
  const status = mapInternalStatusToCustomerStatus(
    order.fulfillmentType,
    order.currentStageId,
    order.paymentStatus,
  );
  const estimate = order.estimatedCompletionDate
    ? ` Estimasi selesai ${formatDate(order.estimatedCompletionDate)}.`
    : "";
  const nextStep = order.nextStep
    ? ` Tahap berikutnya adalah ${order.nextStep}.`
    : "";

  return {
    order,
    text: `Pesanan ${order.orderNumber} saat ini berstatus ${status} dengan progress sekitar ${progress}%.${nextStep}${estimate} Saya buka detail tracking di sebelah kanan.`,
  };
}

export function isHistoryOrder(order: CustomerTrackingOrder): boolean {
  return (
    order.currentStageId === "completed" ||
    order.currentStageId === "delivered" ||
    calculateOrderProgress(order.productionTimeline) >= 100
  );
}

export function formatTrackingDate(value?: string | null): string {
  if (!value) return "-";
  return formatDate(value);
}

export function cacheClientTrackingOrders(orders: CustomerTrackingOrder[]) {
  if (typeof window === "undefined" || orders.length === 0) return;
  const existing = readJSON<CustomerTrackingOrder[]>(
    CLIENT_TRACKING_CACHE_KEY,
    [],
  );
  writeJSON(
    CLIENT_TRACKING_CACHE_KEY,
    mergeTrackingOrders([orders, existing]),
  );
}

export function mapPaymentOrderToTracking(input: {
  order: PaymentOrderRecord;
  paymentStatus: TrackingPaymentStatus;
  paymentReferenceId?: string | null;
  selectedShippingRate?: ShippingRate | null;
  companyName?: string | null;
}): CustomerTrackingOrder {
  const fulfillmentType = derivePaymentFulfillmentType(input.order);
  const currentStageId = stageForPaymentOrder(
    fulfillmentType,
    input.order.status,
    input.paymentStatus,
  );
  const productionTimeline = getProductionTimeline(
    fulfillmentType,
    currentStageId,
  );
  const shipmentTimeline = getShipmentTimeline({
    fulfillmentType,
    currentStageId,
    selectedShippingRate: input.selectedShippingRate ?? null,
  });
  const now = new Date().toISOString();

  return {
    id: input.order.id,
    orderNumber:
      input.paymentReferenceId ??
      `OF-ORD-${input.order.id.slice(-8).toUpperCase()}`,
    companyId: input.order.companyId,
    companyName: input.companyName || DEFAULT_COMPANY_NAME,
    orderDate: input.order.createdAt,
    fulfillmentType,
    paymentStatus: input.paymentStatus,
    orderStatus: input.order.status,
    currentStageId,
    nextStep: nextStepForStage(fulfillmentType, currentStageId),
    estimatedCompletionDate: estimateCompletionDate(
      fulfillmentType,
      input.order.createdAt,
    ),
    estimatedDeliveryDate: null,
    selectedShippingRate: input.selectedShippingRate ?? null,
    subtotal: input.order.calculation.itemSubtotal,
    tax: input.order.calculation.tax,
    shippingCost: input.order.calculation.shippingFee,
    total: input.order.calculation.grandTotal,
    items: input.order.items.map((item, index) =>
      mapCheckoutOrderItemToTracking({
        item,
        orderId: input.order.id,
        index,
        fulfillmentType,
        currentStageId,
        productionTimeline,
      }),
    ),
    productionTimeline,
    shipmentTimeline,
    documents: [
      {
        id: `${input.order.id}-invoice`,
        label: "Invoice",
        type: "invoice",
        status: input.paymentStatus === "paid" ? "available" : "pending",
        fileName:
          input.paymentStatus === "paid"
            ? `${input.paymentReferenceId ?? input.order.id}-invoice.pdf`
            : null,
      },
      {
        id: `${input.order.id}-artwork`,
        label: "Artwork bordir",
        type: "artwork",
        status: hasEmbroidery(input.order) ? "pending" : "available",
      },
      {
        id: `${input.order.id}-delivery-note`,
        label: "Surat jalan",
        type: "delivery_note",
        status: "pending",
      },
    ],
    actionRequired: actionRequiredForPaymentOrder(input.order, fulfillmentType),
    statusNote: statusNoteForPaymentOrder(
      fulfillmentType,
      currentStageId,
      input.selectedShippingRate ?? null,
    ),
    shippingTrackingNumber: null,
    createdAt: input.order.createdAt,
    updatedAt: now,
  };
}

export function mapCheckoutOrderToTracking(input: {
  order: PaymentOrderRecord;
  paymentStatus: TrackingPaymentStatus;
  paymentReferenceId?: string | null;
  selectedShippingRate?: ShippingRate | null;
  companyName?: string | null;
}): CustomerTrackingOrder {
  return mapPaymentOrderToTracking(input);
}

export function getProductionTimeline(
  fulfillmentType: TrackingFulfillmentType,
  currentStageId: string,
): OrderTimelineStage[] {
  const roleByStage: Record<string, TrackingRole> = {
    waiting_payment: "finance",
    payment_received: "finance",
    order_processing: "sales_cs",
    stock_preparation: "logistics",
    custom_process: "section_head",
    custom_qc: "qc",
    order_received: "sales_cs",
    payment_confirmed: "finance",
    artwork_approval: "sales_cs",
    production_preparation: "ppic",
    cutting: "section_head",
    sewing: "section_head",
    embroidery_printing: "section_head",
    finishing: "production_admin",
    quality_control: "qc",
    packing: "logistics",
    ready_to_ship: "logistics",
    in_transit: "shipping_api",
    delivered: "shipping_api",
    completed: "sales_cs",
  };

  return buildTimeline(fulfillmentType, currentStageId).map((stage) => ({
    ...stage,
    updatedByRole: roleByStage[stage.id] ?? null,
  }));
}

export function getShipmentTimeline(input: {
  fulfillmentType: TrackingFulfillmentType;
  currentStageId: string;
  selectedShippingRate?: ShippingRate | null;
}): ShipmentTimelineEntry[] {
  const service = input.selectedShippingRate
    ? `${input.selectedShippingRate.courierName} ${input.selectedShippingRate.serviceName}`
    : "Layanan pengiriman belum dipilih";

  if (
    input.fulfillmentType === "MADE_TO_ORDER" &&
    !["ready_to_ship", "in_transit", "delivered", "completed"].includes(
      input.currentStageId,
    )
  ) {
    return [
      {
        id: "shipment-wait-production",
        label: "Menunggu produksi selesai",
        state: "current",
        location: "Produksi Ofissio",
        description: `${service}. Pengiriman akan aktif setelah QC dan packing selesai.`,
      },
      {
        id: "shipment-ready",
        label: "Siap dikirim",
        state: "pending",
        location: "Gudang Ofissio",
      },
      {
        id: "shipment-in-transit",
        label: "Dalam pengiriman",
        state: "pending",
        location: "Dalam perjalanan",
      },
      {
        id: "shipment-delivered",
        label: "Terkirim",
        state: "pending",
        location: "Alamat customer",
      },
    ];
  }

  return [
    {
      id: "shipment-payment-confirmed",
      label: "Menunggu proses order",
      state: "current",
      location: "Gudang Ofissio",
      description: service,
    },
    {
      id: "shipment-ready",
      label: "Siap dikirim",
      state: "pending",
      location: "Gudang Ofissio",
    },
    {
      id: "shipment-in-transit",
      label: "Dalam pengiriman",
      state: "pending",
      location: "Dalam perjalanan",
    },
    {
      id: "shipment-delivered",
      label: "Terkirim",
      state: "pending",
      location: "Alamat customer",
    },
  ];
}

function readClientTrackingOrders(companyId: string): CustomerTrackingOrder[] {
  const cached = readJSON<CustomerTrackingOrder[]>(
    CLIENT_TRACKING_CACHE_KEY,
    [],
  );
  return cached.filter((order) => order.companyId === companyId);
}

function mergeTrackingOrders(
  sources: CustomerTrackingOrder[][],
): CustomerTrackingOrder[] {
  const byId = new Map<string, CustomerTrackingOrder>();
  sources.flat().forEach((order) => {
    if (!byId.has(order.id)) byId.set(order.id, order);
  });
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate),
  );
}

function derivePaymentFulfillmentType(
  order: PaymentOrderRecord,
): TrackingFulfillmentType {
  const normalized = order.items.map((item) =>
    normalizeFulfillmentType(item.fulfillmentType, item.embroideryPlacements.length),
  );
  if (normalized.includes("MADE_TO_ORDER")) return "MADE_TO_ORDER";
  if (normalized.includes("READY_STOCK_WITH_CUSTOMIZATION")) {
    return "READY_STOCK_WITH_CUSTOMIZATION";
  }
  return "READY_STOCK";
}

function normalizeFulfillmentType(
  fulfillmentType: string,
  embroideryCount: number,
): TrackingFulfillmentType {
  if (fulfillmentType === "MADE_TO_ORDER") return "MADE_TO_ORDER";
  if (fulfillmentType === "QUOTATION_ONLY") return "QUOTATION_ONLY";
  if (embroideryCount > 0) return "READY_STOCK_WITH_CUSTOMIZATION";
  return "READY_STOCK";
}

function stageForPaymentOrder(
  fulfillmentType: TrackingFulfillmentType,
  orderStatus: PaymentOrderStatus,
  paymentStatus: TrackingPaymentStatus,
): string {
  if (paymentStatus === "failed" || orderStatus === "payment_failed") {
    return fulfillmentType === "MADE_TO_ORDER" ? "order_received" : "waiting_payment";
  }

  if (paymentStatus !== "paid" && paymentStatus !== "verified") {
    return fulfillmentType === "MADE_TO_ORDER" ? "order_received" : "waiting_payment";
  }

  switch (fulfillmentType) {
    case "READY_STOCK":
      return "payment_received";
    case "READY_STOCK_WITH_CUSTOMIZATION":
      return "stock_preparation";
    case "MADE_TO_ORDER":
      return "payment_confirmed";
    case "QUOTATION_ONLY":
      return "paid";
  }
}

function nextStepForStage(
  fulfillmentType: TrackingFulfillmentType,
  currentStageId: string,
): string | null {
  if (fulfillmentType === "READY_STOCK" && currentStageId === "payment_received") {
    return "Pesanan diproses";
  }
  if (
    fulfillmentType === "READY_STOCK_WITH_CUSTOMIZATION" &&
    currentStageId === "stock_preparation"
  ) {
    return "Proses bordir/sablon";
  }
  if (fulfillmentType === "MADE_TO_ORDER" && currentStageId === "payment_confirmed") {
    return "Approval desain / Persiapan produksi";
  }

  const stages = buildTimeline(fulfillmentType, currentStageId);
  const currentIndex = stages.findIndex((stage) => stage.id === currentStageId);
  return stages[currentIndex + 1]?.label ?? null;
}

function estimateCompletionDate(
  fulfillmentType: TrackingFulfillmentType,
  orderDate: string,
): string | null {
  const createdAt = Date.parse(orderDate);
  if (!Number.isFinite(createdAt)) return null;
  const days =
    fulfillmentType === "READY_STOCK"
      ? 3
      : fulfillmentType === "READY_STOCK_WITH_CUSTOMIZATION"
        ? 7
        : fulfillmentType === "MADE_TO_ORDER"
          ? 14
          : 2;
  return new Date(createdAt + days * 24 * 60 * 60 * 1000).toISOString();
}

function mapCheckoutOrderItemToTracking(input: {
  item: PaymentOrderRecord["items"][number];
  orderId: string;
  index: number;
  fulfillmentType: TrackingFulfillmentType;
  currentStageId: string;
  productionTimeline: OrderTimelineStage[];
}): OrderItemProgress {
  const product = productService.getProductById(input.item.productId);
  const itemStages = input.productionTimeline.map((stage) => ({ ...stage }));
  const uniform3DConfig =
    input.item.embroideryPlacements.length > 0
      ? {
          productId: input.item.productId,
          model3dId: input.item.model3dId,
          color: input.item.selectedColor,
          placements: input.item.embroideryPlacements,
          snapshots: { front: SNAPSHOT_URL },
          activeCamera: "front" as const,
          updatedAt: new Date().toISOString(),
        }
      : null;

  return {
    id: `${input.orderId}-item-${input.index}`,
    productId: input.item.productId,
    productSlug: product?.slug ?? input.item.productId,
    productName: input.item.productName,
    sku: input.item.sku,
    selectedColor: input.item.selectedColor,
    sizeMatrix: input.item.sizeMatrix,
    totalQty: input.item.totalQty,
    unitPrice: input.item.priceFrom,
    estimatedPrice: input.item.priceFrom * input.item.totalQty,
    fulfillmentType: input.fulfillmentType,
    currentStageId: input.currentStageId,
    stages: itemStages,
    embroideryPlacements: input.item.embroideryPlacements,
    model3dId: input.item.model3dId,
    model3dUrl: input.item.model3dUrl,
    logoFilename: input.item.embroideryPlacements[0]?.logoFileName ?? null,
    snapshotUrl: SNAPSHOT_URL,
    notes: input.item.customization,
    uniform3DConfig,
  };
}

function hasEmbroidery(order: PaymentOrderRecord): boolean {
  return order.items.some((item) => item.embroideryPlacements.length > 0);
}

function actionRequiredForPaymentOrder(
  order: PaymentOrderRecord,
  fulfillmentType: TrackingFulfillmentType,
): CustomerTrackingOrder["actionRequired"] {
  const actions: CustomerTrackingOrder["actionRequired"] = [
    {
      id: `${order.id}-contact-sales`,
      type: "CONTACT_SALES",
      label: "Contact sales",
      description: "Hubungi tim Ofissio jika ada catatan khusus order.",
      required: false,
    },
    {
      id: `${order.id}-repeat-order`,
      type: "REPEAT_ORDER",
      label: "Pesan ulang",
      description: "Copy konfigurasi order ini ke keranjang.",
      required: false,
    },
  ];

  if (fulfillmentType === "MADE_TO_ORDER" || hasEmbroidery(order)) {
    return [
      {
        id: `${order.id}-approve-artwork`,
        type: "APPROVE_ARTWORK",
        label: "Approve artwork",
        description: "Konfirmasi artwork sebelum produksi/custom dilanjutkan.",
        required: fulfillmentType === "MADE_TO_ORDER",
      },
      ...actions,
    ];
  }

  return actions;
}

function statusNoteForPaymentOrder(
  fulfillmentType: TrackingFulfillmentType,
  currentStageId: string,
  selectedShippingRate: ShippingRate | null,
): string {
  const service = selectedShippingRate
    ? `${selectedShippingRate.courierName} ${selectedShippingRate.serviceName}`
    : "pengiriman belum dipilih";

  if (fulfillmentType === "MADE_TO_ORDER" && currentStageId === "payment_confirmed") {
    return `Pembayaran sudah dikonfirmasi. Produksi akan masuk approval desain; ${service} aktif setelah produksi selesai.`;
  }
  if (
    fulfillmentType === "READY_STOCK_WITH_CUSTOMIZATION" &&
    currentStageId === "stock_preparation"
  ) {
    return `Pembayaran sudah lunas. Barang sedang disiapkan dari stok sebelum proses bordir/sablon; layanan ${service}.`;
  }
  if (fulfillmentType === "READY_STOCK" && currentStageId === "payment_received") {
    return `Pembayaran sudah lunas. Order akan diproses dan dikirim memakai ${service}.`;
  }
  return "Tracking order sedang disiapkan.";
}

function readLegacyOrders(
  companyId: string,
  companyName: string,
): CustomerTrackingOrder[] {
  try {
    return listOrders(companyId).map((order) =>
      legacyOrderToTracking(order, companyName),
    );
  } catch {
    return [];
  }
}

function readLegacyQuotations(
  companyId: string,
  companyName: string,
): CustomerQuotationTracking[] {
  try {
    return listQuotations(companyId).map((quotation) =>
      legacyQuotationToTracking(quotation, companyName),
    );
  } catch {
    return [];
  }
}

function legacyOrderToTracking(
  order: Order,
  companyName: string,
): CustomerTrackingOrder {
  const fulfillmentType: TrackingFulfillmentType =
    order.type === "MADE_TO_ORDER" ? "MADE_TO_ORDER" : "READY_STOCK";
  const currentStageId = legacyOrderStage(order.status, fulfillmentType);
  const stages = buildTimeline(fulfillmentType, currentStageId, {
    currentProgressRatio:
      order.status === "processing" || order.status === "paid" ? 0.25 : 0,
  });
  const completedStages =
    currentStageId === "completed"
      ? stages.map((stage) => ({ ...stage, state: "completed" as const }))
      : stages;

  return {
    id: order.id,
    orderNumber: order.code,
    companyId: order.companyId,
    companyName,
    orderDate: order.createdAt,
    fulfillmentType,
    paymentStatus:
      order.status === "waiting_payment_dummy" || order.status === "pending"
        ? "waiting_payment"
        : order.status === "cancelled" || order.status === "refunded"
          ? "failed"
          : "paid",
    currentStageId,
    estimatedCompletionDate: null,
    estimatedDeliveryDate: null,
    subtotal: order.subtotal,
    tax: order.tax,
    shippingCost: order.shippingCost,
    total: order.total,
    items: order.items.map((line, index) => ({
      id: `${order.id}-item-${index}`,
      productId: line.productId,
      productSlug: line.productSlug,
      productName: line.productName,
      sku: line.sku,
      selectedColor: line.color,
      sizeMatrix: line.sizes,
      totalQty: line.totalQty,
      unitPrice: line.unitPrice,
      estimatedPrice: line.estimatedPrice,
      fulfillmentType,
      currentStageId,
      stages: completedStages,
      embroideryPlacements: [],
      logoFilename: null,
      snapshotUrl: SNAPSHOT_URL,
      notes: line.customization,
      uniform3DConfig: null,
    })),
    productionTimeline: completedStages,
    shipmentTimeline: legacyShipmentTimeline(order.status),
    documents: [
      {
        id: `${order.id}-invoice`,
        label: "Invoice",
        type: "invoice",
        status: "pending",
      },
      {
        id: `${order.id}-delivery-note`,
        label: "Surat jalan",
        type: "delivery_note",
        status: "pending",
      },
    ],
    actionRequired: [
      {
        id: `${order.id}-contact-sales`,
        type: "CONTACT_SALES",
        label: "Contact sales",
        description: "Hubungi tim Ofissio untuk catatan order ini.",
        required: false,
      },
      {
        id: `${order.id}-repeat-order`,
        type: "REPEAT_ORDER",
        label: "Pesan ulang",
        description: "Copy order ini ke keranjang.",
        required: false,
      },
    ],
    statusNote: `Order lokal lama dipetakan ke tracking ${fulfillmentLabel(fulfillmentType)}.`,
    shippingTrackingNumber: null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function legacyQuotationToTracking(
  quotation: Quotation,
  companyName: string,
): CustomerQuotationTracking {
  const currentStageId = legacyQuotationStage(quotation.status);
  const timeline = buildTimeline("QUOTATION_ONLY", currentStageId);
  return {
    id: quotation.id,
    quotationNumber: quotation.code,
    companyId: quotation.companyId,
    companyName,
    submittedAt: quotation.createdAt,
    status:
      quotation.status === "submitted" || quotation.status === "draft"
        ? "submitted"
        : quotation.status === "accepted"
          ? "accepted"
          : quotation.status === "quoted"
            ? "sent"
            : "reviewed",
    currentStageId,
    estimatedResponseDate: null,
    items: quotation.items.map((line, index): OrderItemProgress => {
      const subtotal = line.unitPrice * line.totalQty;
      return {
        id: `${quotation.id}-item-${index}`,
        productId: line.productId,
        productSlug: line.productSlug,
        productName: line.productName,
        sku: line.sku,
        selectedColor: line.color,
        sizeMatrix: line.sizes,
        totalQty: line.totalQty,
        unitPrice: line.unitPrice,
        estimatedPrice: subtotal,
        fulfillmentType: "QUOTATION_ONLY",
        currentStageId,
        stages: timeline,
        embroideryPlacements: [],
        logoFilename: null,
        snapshotUrl: SNAPSHOT_URL,
        notes: line.customization,
        uniform3DConfig: null,
      };
    }),
    timeline,
    documents: [
      {
        id: `${quotation.id}-quotation`,
        label: "Quotation PDF",
        type: "quotation",
        status: "pending",
      },
    ],
    actionRequired: [
      {
        id: `${quotation.id}-contact-sales`,
        type: "CONTACT_SALES",
        label: "Contact sales",
        description: "Diskusikan quotation dengan tim sales.",
        required: false,
      },
    ],
    notes: quotation.notes,
  };
}

function legacyOrderStage(
  status: Order["status"],
  fulfillmentType: TrackingFulfillmentType,
): string {
  if (fulfillmentType === "MADE_TO_ORDER") {
    switch (status) {
      case "waiting_payment_dummy":
      case "pending":
        return "order_received";
      case "paid":
        return "payment_confirmed";
      case "processing":
        return "sewing";
      case "shipped":
        return "in_transit";
      case "delivered":
        return "completed";
      default:
        return "order_received";
    }
  }

  switch (status) {
    case "waiting_payment_dummy":
    case "pending":
      return "waiting_payment";
    case "paid":
      return "payment_received";
    case "processing":
      return "order_processing";
    case "shipped":
      return "in_transit";
    case "delivered":
      return "completed";
    default:
      return "waiting_payment";
  }
}

function legacyQuotationStage(status: Quotation["status"]): string {
  switch (status) {
    case "submitted":
    case "draft":
      return "quotation_submitted";
    case "in_review":
      return "quotation_reviewed";
    case "quoted":
      return "quotation_sent";
    case "accepted":
      return "customer_accepted";
    default:
      return "quotation_reviewed";
  }
}

function legacyShipmentTimeline(status: Order["status"]) {
  const inTransit = status === "shipped" || status === "delivered";
  const delivered = status === "delivered";
  return [
    {
      id: "legacy-ready",
      label: "Siap dikirim",
      state: inTransit || delivered ? "completed" : "pending",
      location: "Gudang Ofissio",
    },
    {
      id: "legacy-in-transit",
      label: "Dalam pengiriman",
      state: delivered ? "completed" : inTransit ? "current" : "pending",
      location: "Dalam perjalanan",
    },
    {
      id: "legacy-delivered",
      label: "Terkirim",
      state: delivered ? "completed" : "pending",
      location: "Alamat customer",
    },
  ] satisfies CustomerTrackingOrder["shipmentTimeline"];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
