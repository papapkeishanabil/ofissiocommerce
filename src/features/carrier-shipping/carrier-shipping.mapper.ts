import type {
  CarrierShipmentRecord,
  CarrierShippingEventRecord,
  ShippingAddressSnapshot,
  ShippingPackageItemSnapshot,
  ShippingQuoteRecord,
} from "./carrier-shipping.types";

type Row = Record<string, unknown>;

export function quoteToRow(quote: ShippingQuoteRecord): Row {
  return {
    id: quote.id,
    order_id: quote.orderId,
    company_id: quote.companyId,
    provider: quote.provider,
    provider_quote_id: quote.providerQuoteId,
    courier_company: quote.courierCompany,
    courier_type: quote.courierType,
    courier_service: quote.courierService,
    shipping_price: quote.shippingPrice,
    currency: quote.currency,
    duration: quote.duration,
    shipping_price_snapshot: quote.shippingPriceSnapshot,
    origin_snapshot: quote.originSnapshot,
    destination_snapshot: quote.destinationSnapshot,
    package_snapshot: quote.packageSnapshot,
    expires_at: quote.expiresAt,
    created_at: quote.createdAt,
    updated_at: quote.updatedAt,
  };
}

export function rowToQuote(row: Row): ShippingQuoteRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    companyId: String(row.company_id),
    provider: row.provider === "biteship" ? "biteship" : "mock",
    providerQuoteId: String(row.provider_quote_id ?? row.id),
    courierCompany: String(row.courier_company ?? ""),
    courierType: String(row.courier_type ?? ""),
    courierService: String(row.courier_service ?? ""),
    shippingPrice: Number(row.shipping_price ?? 0),
    currency: "IDR",
    duration: nullableString(row.duration),
    shippingPriceSnapshot: objectValue(row.shipping_price_snapshot),
    originSnapshot: addressValue(row.origin_snapshot),
    destinationSnapshot: addressValue(row.destination_snapshot),
    packageSnapshot: packageValue(row.package_snapshot),
    expiresAt: nullableString(row.expires_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function shipmentToRow(shipment: CarrierShipmentRecord): Row {
  return {
    id: shipment.id,
    order_id: shipment.orderId,
    company_id: shipment.companyId,
    quote_id: shipment.quoteId,
    provider: shipment.provider,
    provider_shipment_id: shipment.providerShipmentId,
    biteship_order_id: shipment.biteshipOrderId,
    biteship_waybill_id: shipment.biteshipWaybillId,
    courier_company: shipment.courierCompany,
    courier_type: shipment.courierType,
    courier_service: shipment.courierService,
    shipment_status: shipment.shipmentStatus,
    shipping_price: shipment.shippingPrice,
    shipping_price_snapshot: shipment.shippingPriceSnapshot,
    origin_snapshot: shipment.originSnapshot,
    destination_snapshot: shipment.destinationSnapshot,
    package_snapshot: shipment.packageSnapshot,
    tracking_url: shipment.trackingUrl,
    provider_status: shipment.providerStatus,
    created_by: shipment.createdBy,
    created_at: shipment.createdAt,
    updated_at: shipment.updatedAt,
  };
}

export function rowToCarrierShipment(row: Row): CarrierShipmentRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    companyId: String(row.company_id),
    quoteId: String(row.quote_id),
    provider: row.provider === "biteship" ? "biteship" : "mock",
    providerShipmentId: nullableString(row.provider_shipment_id),
    biteshipOrderId: nullableString(row.biteship_order_id),
    biteshipWaybillId: nullableString(row.biteship_waybill_id),
    courierCompany: String(row.courier_company ?? ""),
    courierType: String(row.courier_type ?? ""),
    courierService: String(row.courier_service ?? ""),
    shipmentStatus: String(row.shipment_status) as CarrierShipmentRecord["shipmentStatus"],
    shippingPrice: Number(row.shipping_price ?? 0),
    shippingPriceSnapshot: objectValue(row.shipping_price_snapshot),
    originSnapshot: addressValue(row.origin_snapshot),
    destinationSnapshot: addressValue(row.destination_snapshot),
    packageSnapshot: packageValue(row.package_snapshot),
    trackingUrl: nullableString(row.tracking_url),
    providerStatus: nullableString(row.provider_status),
    createdBy: nullableString(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function eventToRow(event: CarrierShippingEventRecord): Row {
  return {
    id: event.id,
    shipment_id: event.shipmentId,
    order_id: event.orderId,
    company_id: event.companyId,
    event_type: event.eventType,
    old_status: event.oldStatus,
    new_status: event.newStatus,
    provider_status: event.providerStatus,
    webhook_event_id: event.webhookEventId,
    safe_metadata: event.safeMetadata,
    created_at: event.createdAt,
  };
}

export function rowToEvent(row: Row): CarrierShippingEventRecord {
  return {
    id: String(row.id),
    shipmentId: String(row.shipment_id),
    orderId: String(row.order_id),
    companyId: String(row.company_id),
    eventType: String(row.event_type),
    oldStatus: row.old_status
      ? (String(row.old_status) as CarrierShippingEventRecord["oldStatus"])
      : null,
    newStatus: row.new_status
      ? (String(row.new_status) as CarrierShippingEventRecord["newStatus"])
      : null,
    providerStatus: nullableString(row.provider_status),
    webhookEventId: nullableString(row.webhook_event_id),
    safeMetadata: objectValue(row.safe_metadata),
    createdAt: String(row.created_at),
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function addressValue(value: unknown): ShippingAddressSnapshot {
  const row = objectValue(value);
  return {
    contactName: String(row.contactName ?? ""),
    contactPhone: String(row.contactPhone ?? ""),
    address: String(row.address ?? ""),
    city: nullableString(row.city),
    province: nullableString(row.province),
    postalCode: String(row.postalCode ?? ""),
    areaId: nullableString(row.areaId),
  };
}

function packageValue(value: unknown): ShippingPackageItemSnapshot[] {
  return Array.isArray(value) ? (value as ShippingPackageItemSnapshot[]) : [];
}

