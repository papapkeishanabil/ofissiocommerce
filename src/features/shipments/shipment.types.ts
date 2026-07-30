import type { PaymentOrderRecord } from "@/features/payment/payment.types";

export type ShipmentProvider =
  | "manual"
  | "jne"
  | "jnt"
  | "sicepat"
  | "anteraja"
  | "cargo"
  | "pickup";

export type ShipmentStatus =
  | "draft"
  | "ready_to_ship"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export type ShipmentActorType = "internal" | "customer" | "system";

export type ShipmentEventType =
  | "shipment_created"
  | "shipment_ready_to_ship"
  | "shipment_booked"
  | "tracking_number_added"
  | "shipment_picked_up"
  | "shipment_in_transit"
  | "shipment_delivered"
  | "shipment_failed"
  | "shipment_returned"
  | "shipment_cancelled"
  | "shipment_note_added";

export interface ShipmentDestinationAddress {
  label?: string | null;
  recipientName?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface ShipmentRecord {
  id: string;
  shipmentNumber: string;
  orderId: string;
  processOrderId: string | null;
  companyId: string;
  provider: ShipmentProvider;
  service: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippingCost: number;
  shippingRateJson: Record<string, unknown> | null;
  recipientName: string | null;
  recipientPhone: string | null;
  destinationAddressJson: ShipmentDestinationAddress | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ShipmentEventRecord {
  id: string;
  shipmentId: string;
  orderId: string;
  companyId: string;
  actorId: string | null;
  actorType: ShipmentActorType;
  eventType: ShipmentEventType;
  oldStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus | null;
  note: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
}

export interface ShipmentDetail {
  shipment: ShipmentRecord;
  order: PaymentOrderRecord | null;
  events: ShipmentEventRecord[];
}

export interface ShipmentListFilter {
  companyId?: string;
  orderId?: string;
  processOrderId?: string;
  status?: ShipmentStatus;
  includeDeleted?: boolean;
}

export interface CreateShipmentInput {
  orderId: string;
  companyId: string;
  actorId: string | null;
  actorType: ShipmentActorType;
  processOrderId?: string | null;
  provider?: ShipmentProvider;
  service?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  destinationAddressJson?: ShipmentDestinationAddress | null;
  notes?: string | null;
}

export interface UpdateShipmentInput {
  shipmentId: string;
  companyId?: string;
  actorId: string | null;
  actorType: ShipmentActorType;
  provider?: ShipmentProvider;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  status?: ShipmentStatus;
  note?: string | null;
}

export interface PublicShipment {
  id: string;
  shipmentNumber: string;
  orderId: string;
  provider: ShipmentProvider;
  providerLabel: string;
  service: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  customerStatus: string;
  progress: number;
  shippedAt: string | null;
  deliveredAt: string | null;
  timeline: Array<{
    id: string;
    label: string;
    state: "completed" | "current" | "pending";
    timestamp?: string | null;
    description?: string | null;
  }>;
}
