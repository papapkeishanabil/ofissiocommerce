import type { SizeMatrix } from "@/types/industry";
import type { LogoPlacement, Uniform3DConfig } from "@/types/uniform-3d";

import type {
  CustomerAction,
  CustomerQuotationTracking,
  CustomerTrackingOrder,
  OrderItemProgress,
  OrderTimelineStage,
  ShipmentTimelineEntry,
  TrackingDocument,
  TrackingFulfillmentType,
  TrackingRole,
} from "./tracking.types";
import { buildTimeline } from "./tracking-utils";

const PRODUCT_ID = "p-012";
const PRODUCT_SLUG = "kemeja-kantor-kk-006";
const PRODUCT_NAME = "Kemeja Kantor KK-006 (Color Block)";
const SKU = "KK-006";
const UNIT_PRICE = 135000;
const SNAPSHOT_URL = "/products/kk-006/KK-006-front-nobg.webp";

const size20: SizeMatrix = { S: 2, M: 6, L: 7, XL: 5, "2XL": 0, "3XL": 0 };
const size40: SizeMatrix = { S: 4, M: 10, L: 14, XL: 10, "2XL": 2, "3XL": 0 };
const size60: SizeMatrix = { S: 6, M: 16, L: 20, XL: 14, "2XL": 4, "3XL": 0 };
const size100: SizeMatrix = { S: 10, M: 25, L: 35, XL: 22, "2XL": 8, "3XL": 0 };

const chestLogo: LogoPlacement = {
  zone: "right_chest",
  logoFileId: "logo-harmas-placeholder",
  logoFileName: "logoharmas.png",
  widthCm: 8,
  heightCm: 3.2,
  rotation: 0,
  technique: "embroidery",
};

const backLogo: LogoPlacement = {
  zone: "upper_back",
  logoFileId: "logo-back-placeholder",
  logoFileName: "logo-punggung.png",
  widthCm: 18,
  heightCm: 7.2,
  rotation: 0,
  technique: "embroidery",
};

function create3DConfig(
  color: string,
  placements: LogoPlacement[],
): Uniform3DConfig {
  return {
    productId: PRODUCT_ID,
    model3dId: "kk-006-v1",
    color,
    placements,
    snapshots: { front: SNAPSHOT_URL },
    activeCamera: "front",
    updatedAt: "2026-07-28T08:20:00.000Z",
  };
}

function totalQty(sizeMatrix: SizeMatrix) {
  return Object.values(sizeMatrix).reduce((total, qty) => total + qty, 0);
}

function item(input: {
  id: string;
  color: string;
  sizeMatrix: SizeMatrix;
  fulfillmentType: TrackingFulfillmentType;
  currentStageId: string;
  stages: OrderTimelineStage[];
  placements?: LogoPlacement[];
  notes?: string;
}): OrderItemProgress {
  const qty = totalQty(input.sizeMatrix);
  const placements = input.placements ?? [];
  return {
    id: input.id,
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    productName: PRODUCT_NAME,
    sku: SKU,
    selectedColor: input.color,
    sizeMatrix: input.sizeMatrix,
    totalQty: qty,
    unitPrice: UNIT_PRICE,
    estimatedPrice: UNIT_PRICE * qty,
    fulfillmentType: input.fulfillmentType,
    currentStageId: input.currentStageId,
    stages: input.stages,
    embroideryPlacements: placements,
    logoFilename: placements[0]?.logoFileName ?? null,
    snapshotUrl: SNAPSHOT_URL,
    notes: input.notes ?? null,
    uniform3DConfig: placements.length ? create3DConfig(input.color, placements) : null,
  };
}

function stampRoles(
  stages: OrderTimelineStage[],
  roleByStage: Record<string, TrackingRole>,
): OrderTimelineStage[] {
  return stages.map((stage) => ({
    ...stage,
    updatedByRole: roleByStage[stage.id] ?? stage.updatedByRole ?? null,
  }));
}

const orderDocs: TrackingDocument[] = [
  {
    id: "doc-invoice-placeholder",
    label: "Invoice",
    type: "invoice",
    status: "pending",
  },
  {
    id: "doc-artwork-placeholder",
    label: "Approval artwork",
    type: "artwork",
    status: "available",
    fileName: "artwork-preview.pdf",
  },
  {
    id: "doc-delivery-placeholder",
    label: "Surat jalan",
    type: "delivery_note",
    status: "pending",
  },
];

const shipmentInTransit: ShipmentTimelineEntry[] = [
  {
    id: "ship-ready",
    label: "Siap dikirim",
    state: "completed",
    timestamp: "2026-07-27T08:30:00.000Z",
    location: "Gudang Ofissio Bandung",
  },
  {
    id: "ship-pickup",
    label: "Pickup kurir",
    state: "completed",
    timestamp: "2026-07-27T14:10:00.000Z",
    location: "Bandung",
  },
  {
    id: "ship-transit",
    label: "Dalam pengiriman",
    state: "current",
    timestamp: "2026-07-28T06:40:00.000Z",
    location: "Hub Jakarta",
    description: "Paket sedang bergerak menuju alamat penerima.",
  },
  {
    id: "ship-delivered",
    label: "Terkirim",
    state: "pending",
    location: "Alamat customer",
  },
];

function actionRequired(type: "artwork" | "po" | "none" = "none"): CustomerAction[] {
  const base: CustomerAction[] = [
    {
      id: "contact-sales",
      type: "CONTACT_SALES",
      label: "Contact sales",
      description: "Hubungi tim Ofissio jika ada catatan khusus order.",
      required: false,
    },
    {
      id: "repeat-order",
      type: "REPEAT_ORDER",
      label: "Pesan ulang",
      description: "Copy konfigurasi order ini ke keranjang.",
      required: false,
    },
  ];

  if (type === "artwork") {
    return [
      {
        id: "approve-artwork",
        type: "APPROVE_ARTWORK",
        label: "Approve artwork",
        description: "Konfirmasi desain bordir sebelum produksi dilanjutkan.",
        required: true,
      },
      {
        id: "request-revision",
        type: "REQUEST_REVISION",
        label: "Request revision",
        description: "Minta revisi posisi atau ukuran logo.",
        required: false,
      },
      ...base,
    ];
  }

  if (type === "po") {
    return [
      {
        id: "upload-po",
        type: "UPLOAD_PO",
        label: "Upload PO document",
        description: "Upload PO internal perusahaan untuk arsip transaksi.",
        required: true,
      },
      ...base,
    ];
  }

  return base;
}

export function createMockTrackingOrders(
  companyId: string,
  companyName: string,
): CustomerTrackingOrder[] {
  const readyStages = stampRoles(
    buildTimeline("READY_STOCK", "in_transit", {
      currentProgressRatio: 0.35,
    }),
    {
      payment_received: "finance",
      order_processing: "sales_cs",
      packing: "logistics",
      awaiting_pickup: "logistics",
      in_transit: "shipping_api",
    },
  );

  const customStages = stampRoles(
    buildTimeline("READY_STOCK_WITH_CUSTOMIZATION", "custom_process", {
      currentCompletedQty: 18,
      currentTotalQty: 40,
    }),
    {
      payment_received: "finance",
      stock_preparation: "logistics",
      custom_process: "section_head",
    },
  );

  const mtoStages = stampRoles(
    buildTimeline("MADE_TO_ORDER", "sewing", {
      currentCompletedQty: 40,
      currentTotalQty: 100,
    }),
    {
      payment_confirmed: "finance",
      artwork_approval: "sales_cs",
      production_preparation: "ppic",
      cutting: "section_head",
      sewing: "section_head",
    },
  );

  const completeStages = stampRoles(
    buildTimeline("READY_STOCK", "completed", {
      currentProgressRatio: 1,
    }),
    {
      payment_received: "finance",
      order_processing: "sales_cs",
      packing: "logistics",
      awaiting_pickup: "logistics",
      in_transit: "shipping_api",
      delivered: "shipping_api",
      completed: "sales_cs",
    },
  ).map((stage) =>
    stage.id === "completed"
      ? { ...stage, state: "completed" as const, completedAt: "2026-07-20T10:00:00.000Z" }
      : stage,
  );

  return [
    {
      id: "ord-ready-stock-001",
      orderNumber: "OF-ORD-RS-001",
      companyId,
      companyName,
      orderDate: "2026-07-24T08:15:00.000Z",
      fulfillmentType: "READY_STOCK",
      paymentStatus: "paid",
      currentStageId: "in_transit",
      estimatedCompletionDate: "2026-07-29T00:00:00.000Z",
      estimatedDeliveryDate: "2026-07-29T00:00:00.000Z",
      subtotal: UNIT_PRICE * 20,
      tax: Math.round(UNIT_PRICE * 20 * 0.11),
      shippingCost: 25000,
      total: UNIT_PRICE * 20 + Math.round(UNIT_PRICE * 20 * 0.11) + 25000,
      items: [
        item({
          id: "item-ready-stock-001",
          color: "Abu Color Block",
          sizeMatrix: size20,
          fulfillmentType: "READY_STOCK",
          currentStageId: "in_transit",
          stages: readyStages,
        }),
      ],
      productionTimeline: readyStages,
      shipmentTimeline: shipmentInTransit,
      documents: orderDocs,
      actionRequired: actionRequired(),
      statusNote: "Order ready stock sedang berada di perjalanan ke alamat customer.",
      shippingTrackingNumber: "MOCK2728064001",
      createdAt: "2026-07-24T08:15:00.000Z",
      updatedAt: "2026-07-28T06:40:00.000Z",
    },
    {
      id: "ord-mto-001",
      orderNumber: "OF-ORD-MTO-001",
      companyId,
      companyName,
      orderDate: "2026-07-18T09:20:00.000Z",
      fulfillmentType: "MADE_TO_ORDER",
      paymentStatus: "verified",
      currentStageId: "sewing",
      estimatedCompletionDate: "2026-08-12T00:00:00.000Z",
      estimatedDeliveryDate: "2026-08-15T00:00:00.000Z",
      subtotal: UNIT_PRICE * 100,
      tax: Math.round(UNIT_PRICE * 100 * 0.11),
      shippingCost: 85000,
      total: UNIT_PRICE * 100 + Math.round(UNIT_PRICE * 100 * 0.11) + 85000,
      items: [
        item({
          id: "item-mto-001",
          color: "Navy Color Block",
          sizeMatrix: size100,
          fulfillmentType: "MADE_TO_ORDER",
          currentStageId: "sewing",
          stages: mtoStages,
          placements: [chestLogo, backLogo],
          notes: "Logo Harmas dada kanan dan punggung atas.",
        }),
      ],
      productionTimeline: mtoStages,
      shipmentTimeline: [
        {
          id: "ship-mto-planned",
          label: "Pengiriman dijadwalkan",
          state: "pending",
          location: "Gudang Ofissio Bandung",
        },
      ],
      documents: orderDocs,
      actionRequired: actionRequired("po"),
      statusNote: "Produksi sedang di bagian sewing. Progress sewing 40 dari 100 pcs.",
      shippingTrackingNumber: null,
      createdAt: "2026-07-18T09:20:00.000Z",
      updatedAt: "2026-07-28T09:30:00.000Z",
    },
    {
      id: "ord-custom-001",
      orderNumber: "OF-ORD-CUS-001",
      companyId,
      companyName,
      orderDate: "2026-07-25T10:00:00.000Z",
      fulfillmentType: "READY_STOCK_WITH_CUSTOMIZATION",
      paymentStatus: "paid",
      currentStageId: "custom_process",
      estimatedCompletionDate: "2026-07-31T00:00:00.000Z",
      estimatedDeliveryDate: "2026-08-02T00:00:00.000Z",
      subtotal: UNIT_PRICE * 40,
      tax: Math.round(UNIT_PRICE * 40 * 0.11),
      shippingCost: 23000,
      total: UNIT_PRICE * 40 + Math.round(UNIT_PRICE * 40 * 0.11) + 23000,
      items: [
        item({
          id: "item-custom-001",
          color: "Black Color Block",
          sizeMatrix: size40,
          fulfillmentType: "READY_STOCK_WITH_CUSTOMIZATION",
          currentStageId: "custom_process",
          stages: customStages,
          placements: [chestLogo],
          notes: "Bordir logo dada kanan.",
        }),
      ],
      productionTimeline: customStages,
      shipmentTimeline: [
        {
          id: "ship-custom-planned",
          label: "Menunggu packing",
          state: "pending",
          location: "Gudang Ofissio Bandung",
        },
      ],
      documents: orderDocs,
      actionRequired: actionRequired("artwork"),
      statusNote: "Logo sedang masuk proses bordir/sablon pada stok yang sudah disiapkan.",
      shippingTrackingNumber: null,
      createdAt: "2026-07-25T10:00:00.000Z",
      updatedAt: "2026-07-28T08:20:00.000Z",
    },
    {
      id: "ord-history-001",
      orderNumber: "OF-ORD-HIS-001",
      companyId,
      companyName,
      orderDate: "2026-07-08T10:30:00.000Z",
      fulfillmentType: "READY_STOCK",
      paymentStatus: "verified",
      currentStageId: "completed",
      estimatedCompletionDate: "2026-07-20T00:00:00.000Z",
      estimatedDeliveryDate: "2026-07-19T00:00:00.000Z",
      subtotal: UNIT_PRICE * 60,
      tax: Math.round(UNIT_PRICE * 60 * 0.11),
      shippingCost: 25000,
      total: UNIT_PRICE * 60 + Math.round(UNIT_PRICE * 60 * 0.11) + 25000,
      items: [
        item({
          id: "item-history-001",
          color: "Abu Color Block",
          sizeMatrix: size60,
          fulfillmentType: "READY_STOCK",
          currentStageId: "completed",
          stages: completeStages,
        }),
      ],
      productionTimeline: completeStages,
      shipmentTimeline: shipmentInTransit.map((entry) => ({
        ...entry,
        state: "completed" as const,
      })),
      documents: orderDocs.map((doc) => ({ ...doc, status: "available" as const })),
      actionRequired: actionRequired(),
      statusNote: "Order sudah selesai dan dapat dipesan ulang.",
      shippingTrackingNumber: "MOCK2719079900",
      createdAt: "2026-07-08T10:30:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
    },
  ];
}

export function createMockQuotationTracking(
  companyId: string,
  companyName: string,
): CustomerQuotationTracking[] {
  const timeline = stampRoles(
    buildTimeline("QUOTATION_ONLY", "quotation_submitted", {
      currentProgressRatio: 1,
    }),
    {
      quotation_submitted: "customer",
      quotation_reviewed: "sales_cs",
      quotation_sent: "sales_cs",
      customer_accepted: "customer",
      waiting_payment: "finance",
      paid: "finance",
    },
  );

  return [
    {
      id: "quo-submitted-001",
      quotationNumber: "OF-QUO-001",
      companyId,
      companyName,
      submittedAt: "2026-07-28T07:45:00.000Z",
      status: "submitted",
      currentStageId: "quotation_submitted",
      estimatedResponseDate: "2026-07-29T00:00:00.000Z",
      items: [
        item({
          id: "item-quotation-001",
          color: "Abu Color Block",
          sizeMatrix: size60,
          fulfillmentType: "QUOTATION_ONLY",
          currentStageId: "quotation_submitted",
          stages: timeline,
          placements: [chestLogo],
          notes: "Menunggu review harga custom dan jadwal produksi.",
        }),
      ],
      timeline,
      documents: [
        {
          id: "doc-quote-placeholder",
          label: "Quotation PDF",
          type: "quotation",
          status: "pending",
        },
        {
          id: "doc-po-placeholder",
          label: "PO document",
          type: "purchase_order",
          status: "required",
        },
      ],
      actionRequired: actionRequired("po"),
      notes: "Quotation baru diterima dan menunggu review Sales/CS.",
    },
  ];
}
