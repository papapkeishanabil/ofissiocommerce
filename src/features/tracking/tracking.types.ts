import type { SizeMatrix } from "@/types/industry";
import type { ShippingRate } from "@/features/shipping/shipping.types";
import type { LogoPlacement, Uniform3DConfig } from "@/types/uniform-3d";

export type TrackingFulfillmentType =
  | "READY_STOCK"
  | "READY_STOCK_WITH_CUSTOMIZATION"
  | "MADE_TO_ORDER"
  | "QUOTATION_ONLY";

export type TrackingPaymentStatus =
  | "waiting_payment"
  | "paid"
  | "verified"
  | "failed"
  | "not_required";

export type TrackingStageState =
  | "completed"
  | "current"
  | "pending"
  | "blocked";

export type TrackingRole =
  | "finance"
  | "sales_cs"
  | "ppic"
  | "production_admin"
  | "section_head"
  | "qc"
  | "logistics"
  | "shipping_api"
  | "customer"
  | "ofistant";

export interface WeightedTrackingStage {
  id: string;
  label: string;
  weight: number;
}

export interface OrderTimelineStage extends WeightedTrackingStage {
  state: TrackingStageState;
  description?: string;
  completedAt?: string | null;
  updatedAt?: string | null;
  updatedByRole?: TrackingRole | null;
  completedQty?: number | null;
  totalQty?: number | null;
  progressRatio?: number | null;
}

export interface OrderItemProgress {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  sku: string;
  selectedColor: string;
  sizeMatrix: SizeMatrix;
  totalQty: number;
  unitPrice: number;
  estimatedPrice: number;
  fulfillmentType: TrackingFulfillmentType;
  currentStageId: string;
  stages: OrderTimelineStage[];
  embroideryPlacements: LogoPlacement[];
  model3dId?: string | null;
  model3dUrl?: string | null;
  logoFilename?: string | null;
  snapshotUrl?: string | null;
  notes?: string | null;
  uniform3DConfig?: Uniform3DConfig | null;
}

export interface ShipmentTimelineEntry {
  id: string;
  label: string;
  state: TrackingStageState;
  timestamp?: string | null;
  location?: string | null;
  description?: string | null;
}

export interface TrackingDocument {
  id: string;
  label: string;
  type:
    | "invoice"
    | "quotation"
    | "artwork"
    | "purchase_order"
    | "delivery_note"
    | "receipt";
  status: "available" | "pending" | "required";
  fileName?: string | null;
}

export type CustomerActionType =
  | "APPROVE_ARTWORK"
  | "REQUEST_REVISION"
  | "UPLOAD_PO"
  | "CONTACT_SALES"
  | "REPEAT_ORDER";

export interface CustomerAction {
  id: string;
  type: CustomerActionType;
  label: string;
  description: string;
  required: boolean;
}

export interface CustomerTrackingOrder {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
  orderDate: string;
  fulfillmentType: TrackingFulfillmentType;
  paymentStatus: TrackingPaymentStatus;
  orderStatus?: string | null;
  currentStageId: string;
  nextStep?: string | null;
  estimatedCompletionDate?: string | null;
  estimatedDeliveryDate?: string | null;
  selectedShippingRate?: ShippingRate | null;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  items: OrderItemProgress[];
  productionTimeline: OrderTimelineStage[];
  shipmentTimeline: ShipmentTimelineEntry[];
  documents: TrackingDocument[];
  actionRequired: CustomerAction[];
  statusNote?: string | null;
  shippingTrackingNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerQuotationTracking {
  id: string;
  quotationNumber: string;
  companyId: string;
  companyName: string;
  submittedAt: string;
  status: "submitted" | "reviewed" | "sent" | "accepted" | "waiting_payment" | "paid";
  currentStageId: string;
  estimatedResponseDate?: string | null;
  items: OrderItemProgress[];
  timeline: OrderTimelineStage[];
  documents: TrackingDocument[];
  actionRequired: CustomerAction[];
  notes?: string | null;
  grandTotal?: number | null;
  convertedOrderId?: string | null;
}

export interface DashboardTrackingSnapshot {
  companyId: string;
  activeOrders: CustomerTrackingOrder[];
  orderHistory: CustomerTrackingOrder[];
  quotations: CustomerQuotationTracking[];
}
