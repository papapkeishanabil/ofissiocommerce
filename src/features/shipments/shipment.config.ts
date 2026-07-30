import type {
  ShipmentEventType,
  ShipmentProvider,
  ShipmentStatus,
} from "./shipment.types";

export const SHIPMENT_PROVIDERS = [
  "manual",
  "jne",
  "jnt",
  "sicepat",
  "anteraja",
  "cargo",
  "pickup",
] as const satisfies readonly ShipmentProvider[];

export const SHIPMENT_STATUSES = [
  "draft",
  "ready_to_ship",
  "booked",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned",
  "cancelled",
] as const satisfies readonly ShipmentStatus[];

export const SHIPMENT_EVENT_TYPES = [
  "shipment_created",
  "shipment_ready_to_ship",
  "shipment_booked",
  "tracking_number_added",
  "shipment_picked_up",
  "shipment_in_transit",
  "shipment_delivered",
  "shipment_failed",
  "shipment_returned",
  "shipment_cancelled",
  "shipment_note_added",
] as const satisfies readonly ShipmentEventType[];

export const SHIPMENT_PROVIDER_LABELS: Record<ShipmentProvider, string> = {
  manual: "Manual",
  jne: "JNE",
  jnt: "J&T Express",
  sicepat: "SiCepat",
  anteraja: "AnterAja",
  cargo: "Cargo / Trucking",
  pickup: "Pickup Customer",
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: "Draft",
  ready_to_ship: "Siap dikirim",
  booked: "Booking kurir",
  picked_up: "Sudah dijemput",
  in_transit: "Dalam pengiriman",
  delivered: "Terkirim",
  failed: "Gagal kirim",
  returned: "Retur",
  cancelled: "Dibatalkan",
};

export const CUSTOMER_SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: "Pengiriman disiapkan",
  ready_to_ship: "Pesanan siap dikirim",
  booked: "Kurir sedang disiapkan",
  picked_up: "Pesanan sudah dijemput kurir",
  in_transit: "Pesanan dalam perjalanan",
  delivered: "Pesanan sudah diterima",
  failed: "Pengiriman perlu dibantu tim Ofissio",
  returned: "Pengiriman retur dan sedang ditangani",
  cancelled: "Pengiriman dibatalkan",
};

export const SHIPMENT_STATUS_PROGRESS: Record<ShipmentStatus, number> = {
  draft: 5,
  ready_to_ship: 20,
  booked: 35,
  picked_up: 55,
  in_transit: 75,
  delivered: 100,
  failed: 60,
  returned: 65,
  cancelled: 0,
};

export function shipmentProviderLabel(provider: ShipmentProvider) {
  return SHIPMENT_PROVIDER_LABELS[provider] ?? provider;
}

export function shipmentStatusLabel(status: ShipmentStatus) {
  return SHIPMENT_STATUS_LABELS[status] ?? status;
}

export function customerShipmentStatusLabel(status: ShipmentStatus) {
  return CUSTOMER_SHIPMENT_STATUS_LABELS[status] ?? status;
}
