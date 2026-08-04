import type { CarrierShipmentStatus } from "./carrier-shipping.types";

export function mapBiteshipStatus(value: unknown): CarrierShipmentStatus {
  const status = String(value ?? "").trim().toLowerCase().replace(/[ -]+/g, "_");
  switch (status) {
    case "confirmed":
    case "created":
      return "shipment_created";
    case "scheduled":
    case "allocated":
    case "picking_up":
      return "pickup_scheduled";
    case "picked":
    case "picked_up":
      return "picked_up";
    case "in_transit":
      return "in_transit";
    case "dropping_off":
    case "out_for_delivery":
      return "out_for_delivery";
    case "delivered":
      return "delivered";
    case "return_in_transit":
    case "returned":
      return "returned";
    case "cancelled":
      return "cancelled";
    case "rejected":
    case "courier_not_found":
      return "delivery_failed";
    case "on_hold":
    case "disposed":
    default:
      return "manual_review";
  }
}

export const CARRIER_STATUS_LABELS: Record<CarrierShipmentStatus, string> = {
  waiting_shipment: "Menunggu pengiriman",
  shipment_created: "Shipment dibuat",
  pickup_scheduled: "Pickup dijadwalkan",
  picked_up: "Paket dijemput",
  in_transit: "Dalam perjalanan",
  out_for_delivery: "Menuju alamat penerima",
  delivered: "Terkirim",
  delivery_failed: "Pengiriman terkendala",
  returned: "Dikembalikan",
  cancelled: "Dibatalkan",
  manual_review: "Perlu pemeriksaan",
};

export function carrierStatusLabel(status: CarrierShipmentStatus) {
  return CARRIER_STATUS_LABELS[status];
}

