import { randomUUID } from "crypto";

import type { ShippingRate } from "@/features/shipping/shipping.types";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";

import {
  customerShipmentStatusLabel,
  SHIPMENT_STATUS_PROGRESS,
  shipmentProviderLabel,
} from "./shipment.config";
import type {
  PublicShipment,
  ShipmentEventRecord,
  ShipmentEventType,
  ShipmentProvider,
  ShipmentRecord,
  ShipmentStatus,
} from "./shipment.types";

export function createShipmentId() {
  return `shp_${randomUUID()}`;
}

export function createShipmentEventId() {
  return `she_${randomUUID()}`;
}

export function createShipmentNumber(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `SHP-${day}-${suffix}`;
}

export function shipmentStatusToEventType(status: ShipmentStatus): ShipmentEventType {
  switch (status) {
    case "ready_to_ship":
      return "shipment_ready_to_ship";
    case "booked":
      return "shipment_booked";
    case "picked_up":
      return "shipment_picked_up";
    case "in_transit":
      return "shipment_in_transit";
    case "delivered":
      return "shipment_delivered";
    case "failed":
      return "shipment_failed";
    case "returned":
      return "shipment_returned";
    case "cancelled":
      return "shipment_cancelled";
    default:
      return "shipment_note_added";
  }
}

export function calculateShipmentProgress(status: ShipmentStatus) {
  return SHIPMENT_STATUS_PROGRESS[status] ?? 0;
}

export function isActiveShipment(shipment: ShipmentRecord) {
  return !shipment.deletedAt && shipment.status !== "cancelled";
}

export function isTerminalShipmentStatus(status: ShipmentStatus) {
  return ["delivered", "failed", "returned", "cancelled"].includes(status);
}

export function buildShipmentTimeline(
  shipment: ShipmentRecord,
  events: ShipmentEventRecord[] = [],
): CustomerTrackingOrder["shipmentTimeline"] {
  const eventByStatus = new Map<ShipmentStatus, ShipmentEventRecord>();
  for (const event of events) {
    if (event.newStatus) eventByStatus.set(event.newStatus, event);
  }

  const steps: Array<{
    id: string;
    status: ShipmentStatus;
    label: string;
    location: string;
    description: string;
  }> = [
    {
      id: "ready_to_ship",
      status: "ready_to_ship",
      label: "Siap dikirim",
      location: "Gudang Ofissio",
      description: "Pesanan selesai diproses dan menunggu jadwal kirim.",
    },
    {
      id: "picked_up",
      status: "picked_up",
      label: "Dijemput kurir",
      location: shipmentProviderLabel(shipment.provider),
      description: "Paket sudah keluar dari gudang Ofissio.",
    },
    {
      id: "in_transit",
      status: "in_transit",
      label: "Dalam perjalanan",
      location: shipmentProviderLabel(shipment.provider),
      description: "Paket sedang dikirim menuju alamat penerima.",
    },
    {
      id: "delivered",
      status: "delivered",
      label: "Terkirim",
      location: shipment.destinationAddressJson?.city ?? "Alamat customer",
      description: "Pengiriman selesai.",
    },
  ];

  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === normalizeTimelineStatus(shipment.status)),
  );

  return steps.map((step, index) => {
    const event = eventByStatus.get(step.status);
    return {
      id: `shipment-${step.id}`,
      label: step.label,
      state:
        shipment.status === "cancelled" || shipment.status === "failed"
          ? index === currentIndex
            ? "blocked"
            : index < currentIndex
              ? "completed"
              : "pending"
          : index < currentIndex || shipment.status === "delivered"
            ? "completed"
            : index === currentIndex
              ? "current"
              : "pending",
      timestamp:
        step.status === "delivered"
          ? shipment.deliveredAt ?? event?.createdAt ?? null
          : step.status === "picked_up" || step.status === "in_transit"
            ? shipment.shippedAt ?? event?.createdAt ?? null
            : event?.createdAt ?? null,
      location: step.location,
      // Customer timeline must stay friendly and must not expose internal
      // admin notes from shipment_events.
      description: step.description,
    };
  });
}

export function mapShipmentToShippingRate(shipment: ShipmentRecord): ShippingRate {
  return {
    id: shipment.id,
    provider: "manual",
    courierCode: shipment.provider,
    courierName: shipmentProviderLabel(shipment.provider),
    serviceCode: shipment.service || "manual",
    serviceName: shipment.service || "Manual",
    price: shipment.shippingCost,
    currency: "IDR",
    estimatedDays: "Sesuai jadwal pengiriman",
    isAvailable: true,
  };
}

export function mapShipmentToPublic(
  shipment: ShipmentRecord,
  events: ShipmentEventRecord[] = [],
): PublicShipment {
  return {
    id: shipment.id,
    shipmentNumber: shipment.shipmentNumber,
    orderId: shipment.orderId,
    provider: shipment.provider,
    providerLabel: shipmentProviderLabel(shipment.provider),
    service: shipment.service,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    status: shipment.status,
    customerStatus: customerShipmentStatusLabel(shipment.status),
    progress: calculateShipmentProgress(shipment.status),
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    timeline: buildShipmentTimeline(shipment, events).map((entry) => ({
      id: entry.id,
      label: entry.label,
      state: entry.state === "blocked" ? "current" : entry.state,
      timestamp: entry.timestamp,
      description: entry.description,
    })),
  };
}

export function customerNextStepForShipment(shipment: ShipmentRecord) {
  switch (shipment.status) {
    case "draft":
      return "Tim Ofissio sedang menyiapkan pengiriman.";
    case "ready_to_ship":
      return "Tim logistik menjadwalkan pickup atau pengiriman.";
    case "booked":
      return "Kurir sedang disiapkan; resi akan diperbarui jika sudah tersedia.";
    case "picked_up":
      return "Paket sudah diambil kurir dan mulai diproses.";
    case "in_transit":
      return "Pantau resi secara berkala sampai paket tiba.";
    case "delivered":
      return "Pengiriman selesai. Silakan hubungi Ofissio jika ada kendala.";
    case "failed":
      return "Tim Ofissio akan membantu follow up pengiriman.";
    case "returned":
      return "Tim Ofissio sedang menangani pengiriman retur.";
    case "cancelled":
      return "Pengiriman dibatalkan oleh tim Ofissio.";
  }
}

export function normalizeProvider(value: string | null | undefined): ShipmentProvider {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "jne" ||
    normalized === "jnt" ||
    normalized === "sicepat" ||
    normalized === "anteraja" ||
    normalized === "cargo" ||
    normalized === "pickup"
  ) {
    return normalized;
  }
  return "manual";
}

function normalizeTimelineStatus(status: ShipmentStatus): ShipmentStatus {
  if (status === "draft" || status === "booked") return "ready_to_ship";
  if (status === "failed" || status === "returned" || status === "cancelled") return "in_transit";
  return status;
}
