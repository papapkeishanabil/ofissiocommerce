import type {
  CustomerQuotationTracking,
  OrderItemProgress,
  OrderTimelineStage,
} from "@/features/tracking/tracking.types";
import type { QuotationRequestRecord, QuotationStatus } from "./quotation.types";

export function quotationStatusLabel(status: QuotationStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Terkirim";
    case "emailed":
      return "Notifikasi diproses";
    case "under_review":
      return "Sedang ditinjau";
    case "quoted":
      return "Sudah dikirim penawaran";
    case "revision_requested":
      return "Revisi diminta";
    case "accepted":
      return "Diterima";
    case "rejected":
      return "Ditolak";
    case "expired":
      return "Kedaluwarsa";
    case "converted_to_order":
      return "Menjadi order";
  }
}

export function mapQuotationToTracking(
  quotation: QuotationRequestRecord,
): CustomerQuotationTracking {
  const currentStageId = statusToStageId(quotation.status);
  const timeline = quotationTimeline(currentStageId);
  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    companyId: quotation.companyId,
    companyName: quotation.companyName,
    submittedAt: quotation.createdAt,
    status: statusToTrackingStatus(quotation.status),
    currentStageId,
    estimatedResponseDate: null,
    items: quotation.items.map((item, index): OrderItemProgress => ({
      id: `${quotation.id}-item-${index}`,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      sku: item.sku,
      selectedColor: item.selectedColor,
      sizeMatrix: item.sizeMatrix,
      totalQty: item.totalQty,
      unitPrice: item.priceFrom,
      estimatedPrice: item.priceFrom * item.totalQty,
      fulfillmentType: "QUOTATION_ONLY",
      currentStageId,
      stages: timeline,
      embroideryPlacements: item.embroideryPlacements,
      model3dId: item.model3dId,
      model3dUrl: item.model3dUrl,
      logoFilename:
        item.embroideryPlacements[0]?.logoFileName ??
        null,
      snapshotUrl: null,
      notes: item.customization,
      uniform3DConfig: null,
    })),
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
        description: "Diskusikan quotation ini dengan tim sales.",
        required: false,
      },
    ],
    notes: quotation.customerNotes,
  };
}

function statusToTrackingStatus(
  status: QuotationStatus,
): CustomerQuotationTracking["status"] {
  switch (status) {
    case "accepted":
      return "accepted";
    case "converted_to_order":
      return "paid";
    case "quoted":
      return "sent";
    case "under_review":
    case "revision_requested":
      return "reviewed";
    case "draft":
    case "submitted":
    case "emailed":
    case "rejected":
    case "expired":
      return "submitted";
  }
}

function statusToStageId(status: QuotationStatus) {
  switch (status) {
    case "quoted":
      return "quotation_sent";
    case "accepted":
    case "converted_to_order":
      return "completed";
    case "under_review":
    case "revision_requested":
      return "quotation_reviewed";
    default:
      return "quotation_submitted";
  }
}

function quotationTimeline(currentStageId: string): OrderTimelineStage[] {
  const stages = [
    {
      id: "quotation_submitted",
      label: "Quotation submitted",
      weight: 20,
      description: "Request quotation diterima sistem.",
    },
    {
      id: "quotation_reviewed",
      label: "Quotation reviewed",
      weight: 30,
      description: "Tim Ofissio meninjau kebutuhan dan artwork.",
    },
    {
      id: "quotation_sent",
      label: "Quotation sent",
      weight: 30,
      description: "Penawaran resmi disiapkan untuk customer.",
    },
    {
      id: "completed",
      label: "Quotation completed",
      weight: 20,
      description: "Quotation selesai atau dikonversi menjadi order.",
    },
  ];
  const currentIndex = stages.findIndex((stage) => stage.id === currentStageId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  return stages.map((stage, index) => ({
    ...stage,
    state:
      index < safeIndex
        ? "completed"
        : index === safeIndex
          ? "current"
          : "pending",
    updatedByRole: index <= safeIndex ? "sales_cs" : null,
    updatedAt: index <= safeIndex ? new Date().toISOString() : null,
    completedAt: index < safeIndex ? new Date().toISOString() : null,
  }));
}
