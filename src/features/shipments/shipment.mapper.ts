import type {
  ShipmentDestinationAddress,
  ShipmentEventRecord,
  ShipmentRecord,
} from "./shipment.types";
import { createShipmentNumber, normalizeProvider } from "./shipment.utils";

type Row = Record<string, unknown>;

export function shipmentToRow(shipment: ShipmentRecord): Row {
  return {
    id: shipment.id,
    shipment_number: shipment.shipmentNumber,
    order_id: shipment.orderId,
    process_order_id: shipment.processOrderId,
    company_id: shipment.companyId,
    provider: shipment.provider,
    service: shipment.service,
    tracking_number: shipment.trackingNumber,
    tracking_url: shipment.trackingUrl,
    status: shipment.status,
    shipping_cost: shipment.shippingCost,
    shipping_rate_json: shipment.shippingRateJson,
    recipient_name: shipment.recipientName,
    recipient_phone: shipment.recipientPhone,
    destination_address_json: shipment.destinationAddressJson,
    shipped_at: shipment.shippedAt,
    delivered_at: shipment.deliveredAt,
    failed_at: shipment.failedAt,
    created_by: shipment.createdBy,
    notes: shipment.notes,
    created_at: shipment.createdAt,
    updated_at: shipment.updatedAt,
    deleted_at: shipment.deletedAt,
  };
}

export function rowToShipment(row: Row): ShipmentRecord {
  return {
    id: String(row.id),
    shipmentNumber: stringOrNull(row.shipment_number) ?? createShipmentNumber(),
    orderId: String(row.order_id),
    processOrderId: stringOrNull(row.process_order_id),
    companyId: String(row.company_id),
    provider: normalizeProvider(stringOrNull(row.provider)),
    service: stringOrNull(row.service) ?? "Manual",
    trackingNumber: stringOrNull(row.tracking_number),
    trackingUrl: stringOrNull(row.tracking_url),
    status: String(row.status ?? "draft") as ShipmentRecord["status"],
    shippingCost: numberOrZero(row.shipping_cost),
    shippingRateJson: objectOrNull(row.shipping_rate_json),
    recipientName: stringOrNull(row.recipient_name),
    recipientPhone: stringOrNull(row.recipient_phone),
    destinationAddressJson: objectOrNull(
      row.destination_address_json,
    ) as ShipmentDestinationAddress | null,
    shippedAt: stringOrNull(row.shipped_at),
    deliveredAt: stringOrNull(row.delivered_at),
    failedAt: stringOrNull(row.failed_at),
    createdBy: stringOrNull(row.created_by),
    notes: stringOrNull(row.notes),
    createdAt: stringOrNull(row.created_at) ?? new Date().toISOString(),
    updatedAt: stringOrNull(row.updated_at) ?? new Date().toISOString(),
    deletedAt: stringOrNull(row.deleted_at),
  };
}

export function shipmentPatchToRow(patch: Partial<ShipmentRecord>): Row {
  const row: Row = {};
  if (patch.provider) row.provider = patch.provider;
  if ("service" in patch) row.service = patch.service ?? "Manual";
  if ("trackingNumber" in patch) row.tracking_number = patch.trackingNumber ?? null;
  if ("trackingUrl" in patch) row.tracking_url = patch.trackingUrl ?? null;
  if (patch.status) row.status = patch.status;
  if ("shippingCost" in patch) row.shipping_cost = patch.shippingCost ?? 0;
  if ("shippingRateJson" in patch) row.shipping_rate_json = patch.shippingRateJson ?? null;
  if ("recipientName" in patch) row.recipient_name = patch.recipientName ?? null;
  if ("recipientPhone" in patch) row.recipient_phone = patch.recipientPhone ?? null;
  if ("destinationAddressJson" in patch) {
    row.destination_address_json = patch.destinationAddressJson ?? null;
  }
  if ("shippedAt" in patch) row.shipped_at = patch.shippedAt ?? null;
  if ("deliveredAt" in patch) row.delivered_at = patch.deliveredAt ?? null;
  if ("failedAt" in patch) row.failed_at = patch.failedAt ?? null;
  if ("notes" in patch) row.notes = patch.notes ?? null;
  if ("deletedAt" in patch) row.deleted_at = patch.deletedAt ?? null;
  row.updated_at = new Date().toISOString();
  return row;
}

export function shipmentEventToRow(event: ShipmentEventRecord): Row {
  return {
    id: event.id,
    shipment_id: event.shipmentId,
    order_id: event.orderId,
    company_id: event.companyId,
    actor_id: event.actorId,
    actor_type: event.actorType,
    event_type: event.eventType,
    old_status: event.oldStatus,
    new_status: event.newStatus,
    note: event.note,
    metadata_json: event.metadataJson,
    created_at: event.createdAt,
  };
}

export function rowToShipmentEvent(row: Row): ShipmentEventRecord {
  return {
    id: String(row.id),
    shipmentId: String(row.shipment_id),
    orderId: String(row.order_id),
    companyId: String(row.company_id),
    actorId: stringOrNull(row.actor_id),
    actorType: String(row.actor_type ?? "system") as ShipmentEventRecord["actorType"],
    eventType: String(row.event_type) as ShipmentEventRecord["eventType"],
    oldStatus: row.old_status ? (String(row.old_status) as ShipmentEventRecord["oldStatus"]) : null,
    newStatus: row.new_status ? (String(row.new_status) as ShipmentEventRecord["newStatus"]) : null,
    note: stringOrNull(row.note),
    metadataJson: objectOrNull(row.metadata_json) ?? {},
    createdAt: stringOrNull(row.created_at) ?? new Date().toISOString(),
  };
}

function stringOrNull(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value;
  if (value == null) return null;
  return String(value);
}

function numberOrZero(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
