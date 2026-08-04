import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { shouldSyncWooCommerceOrder } from "@/features/orders/woocommerce-order-sync.service";
import { woocommerceOrderRepository } from "@/features/orders/repositories/woocommerce-order.repository";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type { WooCommerceMetaData } from "@/features/products/woocommerce/woocommerce.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { createShipmentForOrder, getShipmentsByOrder, updateShipment } from "@/features/shipments/shipment.service";
import { normalizeProvider } from "@/features/shipments/shipment.utils";
import type { ShipmentStatus } from "@/features/shipments/shipment.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

import { getCarrierShippingConfig } from "./carrier-shipping.config";
import {
  getCarrierShipmentByOrder,
  getCarrierShipmentByProviderId,
  getShippingQuote,
  hasWebhookEvent,
  listCarrierShippingEvents,
  listShippingQuotes,
  saveCarrierShipment,
  saveCarrierShippingEvent,
  saveShippingQuotes,
  updateCarrierShipment,
} from "./carrier-shipping.repository";
import { mapBiteshipStatus } from "./carrier-shipping.status";
import type {
  CarrierShipmentRecord,
  CarrierShippingEventRecord,
  CarrierShippingState,
  ProviderCreateShipmentResult,
  ShippingAddressSnapshot,
  ShippingPackageItemSnapshot,
  ShippingQuoteRecord,
} from "./carrier-shipping.types";
import { biteshipCarrierShippingProvider } from "./providers/biteship.provider";
import type { CarrierShippingProviderAdapter } from "./providers/carrier-shipping.provider";
import { mockCarrierShippingProvider } from "./providers/mock-carrier-shipping.provider";

type JsonObject = Record<string, unknown>;

export async function getCarrierShippingState(input: {
  orderId: string;
  companyId: string;
}): Promise<CarrierShippingState> {
  const [quotes, shipment] = await Promise.all([
    listShippingQuotes(input),
    getCarrierShipmentByOrder(input),
  ]);
  const events = shipment
    ? await listCarrierShippingEvents({ shipmentId: shipment.id, companyId: input.companyId })
    : [];
  return { quotes, shipment, events };
}

export async function checkCarrierShippingRates(input: {
  orderId: string;
  actorId: string;
  courierFilter?: string[];
  request?: Request;
}) {
  const order = await findOrder(input.orderId);
  const snapshots = await buildServerShippingSnapshots(order);
  const config = getCarrierShippingConfig();
  assertShippingRuntimeAllowed(config);
  const provider = providerAdapter(config.provider);
  const rates = await provider.getRates({
    orderId: order.id,
    origin: snapshots.origin,
    destination: snapshots.destination,
    items: snapshots.items,
    courierFilter: sanitizeCourierFilter(input.courierFilter),
  });
  if (rates.length === 0) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Layanan pengiriman belum tersedia untuk alamat ini.", 503);
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const records = rates.map((rate): ShippingQuoteRecord => ({
    id: `shq_${randomUUID()}`,
    orderId: order.id,
    companyId: order.companyId,
    provider: config.provider,
    providerQuoteId: rate.providerQuoteId,
    courierCompany: rate.courierCompany,
    courierType: rate.courierType,
    courierService: rate.courierService,
    shippingPrice: rate.price,
    currency: "IDR",
    duration: rate.duration,
    shippingPriceSnapshot: rate.safeSnapshot,
    originSnapshot: snapshots.origin,
    destinationSnapshot: snapshots.destination,
    packageSnapshot: snapshots.items,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  }));
  const saved = await saveShippingQuotes(records);
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: order.companyId,
    action: "shipping_rates_checked",
    entityType: "order",
    entityId: order.id,
    metadata: { provider: config.provider, rateCount: saved.length },
  });
  return saved;
}

export async function createCarrierShipment(input: {
  orderId: string;
  quoteId: string;
  actorId: string;
  request?: Request;
}) {
  const order = await findOrder(input.orderId);
  if (order.calculation.grandTotal > 0 && order.status !== "payment_received") {
    throw createApiError(
      "FORBIDDEN",
      "Pembayaran belum diterima. Shipment belum dapat dibuat.",
      403,
    );
  }
  const existing = await getCarrierShipmentByOrder({ orderId: order.id, companyId: order.companyId });
  if (existing) {
    return {
      idempotent: true,
      shipment: existing,
      events: await listCarrierShippingEvents({ shipmentId: existing.id, companyId: order.companyId }),
    };
  }
  const quote = await getShippingQuote({ id: input.quoteId, orderId: order.id, companyId: order.companyId });
  if (!quote) throw createApiError("NOT_FOUND", "Quote pengiriman tidak ditemukan.", 404);
  if (quote.expiresAt && Date.parse(quote.expiresAt) <= Date.now()) {
    throw createApiError("VALIDATION_ERROR", "Quote ongkir sudah kedaluwarsa. Cek ulang ongkir.", 400);
  }
  const config = getCarrierShippingConfig();
  assertShippingRuntimeAllowed(config);
  if (quote.provider !== config.provider) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Provider pengiriman berubah. Silakan cek ulang ongkir.",
      400,
    );
  }
  const provider = providerAdapter(quote.provider);
  const result = await provider.createShipment({ referenceId: order.id, quote });
  const now = new Date().toISOString();
  const shipment: CarrierShipmentRecord = {
    id: `csh_${randomUUID()}`,
    orderId: order.id,
    companyId: order.companyId,
    quoteId: quote.id,
    provider: quote.provider,
    providerShipmentId: result.providerShipmentId,
    biteshipOrderId: quote.provider === "biteship" ? result.providerShipmentId : null,
    biteshipWaybillId: result.waybillId,
    courierCompany: quote.courierCompany,
    courierType: quote.courierType,
    courierService: quote.courierService,
    shipmentStatus: mapBiteshipStatus(result.status),
    shippingPrice: result.price || quote.shippingPrice,
    shippingPriceSnapshot: {
      quotedPrice: quote.shippingPrice,
      providerPrice: result.price || quote.shippingPrice,
      currency: "IDR",
    },
    originSnapshot: quote.originSnapshot,
    destinationSnapshot: quote.destinationSnapshot,
    packageSnapshot: quote.packageSnapshot,
    trackingUrl: result.trackingUrl,
    providerStatus: result.status,
    createdBy: input.actorId,
    createdAt: now,
    updatedAt: now,
  };
  const saved = await saveCarrierShipment(shipment);
  const event = await addEvent({
    shipment: saved,
    eventType: "shipment_created",
    oldStatus: null,
    newStatus: saved.shipmentStatus,
    providerStatus: saved.providerStatus,
    webhookEventId: null,
    safeMetadata: { provider: saved.provider, waybillAvailable: Boolean(saved.biteshipWaybillId) },
  });
  await syncLegacyShipment(saved, order, input.actorId, input.request);
  await mirrorCarrierShipmentToWooCommerce(saved, order, input.request);
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: order.companyId,
    action: "carrier_shipment_created",
    entityType: "shipping_shipment",
    entityId: saved.id,
    metadata: { provider: saved.provider, orderId: order.id, idempotent: false },
  });
  return { idempotent: false, shipment: saved, events: [event] };
}

export async function refreshCarrierShipment(input: {
  orderId: string;
  actorId: string;
  request?: Request;
}) {
  const order = await findOrder(input.orderId);
  const shipment = await getCarrierShipmentByOrder({ orderId: order.id, companyId: order.companyId });
  if (!shipment?.providerShipmentId) throw createApiError("NOT_FOUND", "Shipment belum tersedia.", 404);
  const provider = providerAdapter(shipment.provider);
  if (!provider.retrieveShipment) {
    return { idempotent: true, shipment, events: await listCarrierShippingEvents({ shipmentId: shipment.id, companyId: shipment.companyId }) };
  }
  const result = await provider.retrieveShipment(shipment.providerShipmentId);
  return applyProviderShipmentUpdate({ shipment, result, webhookEventId: null, actorId: input.actorId, request: input.request });
}

export async function processBiteshipWebhook(input: {
  headers: Headers;
  rawBody: string;
  payload: JsonObject;
  request?: Request;
}) {
  const config = getCarrierShippingConfig();
  if (!verifyBiteshipWebhook(input.headers, input.rawBody, config.biteship.webhookSecret)) {
    throw createApiError("UNAUTHORIZED", "Webhook pengiriman tidak valid.", 401);
  }
  const providerShipmentId = firstString(
    input.payload.order_id,
    input.payload.id,
    input.payload.biteship_order_id,
  );
  if (!providerShipmentId) throw createApiError("VALIDATION_ERROR", "Reference shipment tidak valid.", 400);
  const shipment = await getCarrierShipmentByProviderId(providerShipmentId);
  if (!shipment) throw createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
  const webhookEventId = firstString(
    input.headers.get("x-biteship-event-id"),
    input.payload.event_id,
    input.payload.webhook_event_id,
  ) || webhookDigest(shipment.id, input.payload);
  if (await hasWebhookEvent(webhookEventId)) {
    return { idempotent: true, shipment, events: await listCarrierShippingEvents({ shipmentId: shipment.id, companyId: shipment.companyId }) };
  }
  const providerStatus = firstString(input.payload.status, input.payload.order_status) || "unknown";
  const price = finiteNonNegative(input.payload.order_price ?? input.payload.price);
  const result: ProviderCreateShipmentResult = {
    providerShipmentId,
    waybillId: firstString(input.payload.courier_waybill_id, input.payload.waybill_id) || shipment.biteshipWaybillId,
    status: providerStatus,
    trackingUrl: firstString(input.payload.courier_link, input.payload.tracking_url) || shipment.trackingUrl,
    price: price ?? shipment.shippingPrice,
    safeSnapshot: {
      event: firstString(input.payload.event) || "order.status",
      providerStatus,
      waybillAvailable: Boolean(input.payload.courier_waybill_id ?? input.payload.waybill_id),
      priceChanged: price !== null && price !== shipment.shippingPrice,
    },
  };
  return applyProviderShipmentUpdate({ shipment, result, webhookEventId, actorId: null, request: input.request });
}

export function verifyBiteshipWebhook(headers: Headers, rawBody: string, expectedSecret: string) {
  if (!expectedSecret) return false;
  const direct =
    headers.get("x-biteship-webhook-secret") ??
    headers.get("x-webhook-secret") ??
    headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (safeEqual(direct, expectedSecret)) return true;
  const signature = headers.get("x-biteship-signature")?.replace(/^sha256=/i, "") ?? "";
  const expectedSignature = createHash("sha256").update(`${expectedSecret}.${rawBody}`).digest("hex");
  return safeEqual(signature, expectedSignature);
}

async function applyProviderShipmentUpdate(input: {
  shipment: CarrierShipmentRecord;
  result: ProviderCreateShipmentResult;
  webhookEventId: string | null;
  actorId: string | null;
  request?: Request;
}) {
  const nextStatus = mapBiteshipStatus(input.result.status);
  const changed =
    nextStatus !== input.shipment.shipmentStatus ||
    input.result.waybillId !== input.shipment.biteshipWaybillId ||
    (input.result.price > 0 && input.result.price !== input.shipment.shippingPrice);
  const updated: CarrierShipmentRecord = {
    ...input.shipment,
    biteshipWaybillId: input.result.waybillId ?? input.shipment.biteshipWaybillId,
    shipmentStatus: nextStatus,
    shippingPrice: input.result.price > 0 ? input.result.price : input.shipment.shippingPrice,
    shippingPriceSnapshot: {
      ...input.shipment.shippingPriceSnapshot,
      latestProviderPrice: input.result.price > 0 ? input.result.price : input.shipment.shippingPrice,
      priceAdjustmentRequiresReview:
        input.result.price > 0 && input.result.price !== input.shipment.shippingPrice,
    },
    trackingUrl: input.result.trackingUrl ?? input.shipment.trackingUrl,
    providerStatus: input.result.status,
    updatedAt: new Date().toISOString(),
  };
  const saved = changed ? await updateCarrierShipment(updated) : input.shipment;
  let event: CarrierShippingEventRecord | null = null;
  if (changed || input.webhookEventId) {
    event = await addEvent({
      shipment: saved,
      eventType: input.webhookEventId ? "webhook_received" : "tracking_refreshed",
      oldStatus: input.shipment.shipmentStatus,
      newStatus: saved.shipmentStatus,
      providerStatus: input.result.status,
      webhookEventId: input.webhookEventId,
      safeMetadata: input.result.safeSnapshot,
    });
  }
  const order = await repositoryRegistry.orders.getOrderById({ companyId: saved.companyId, orderId: saved.orderId });
  if (order) {
    await syncLegacyShipment(saved, order, input.actorId, input.request);
    await mirrorCarrierShipmentToWooCommerce(saved, order, input.request);
  }
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: input.webhookEventId ? "system" : "internal",
    companyId: saved.companyId,
    action: input.webhookEventId ? "shipping_webhook_processed" : "carrier_shipment_refreshed",
    entityType: "shipping_shipment",
    entityId: saved.id,
    metadata: { idempotent: !changed, status: saved.shipmentStatus },
  });
  return {
    idempotent: !changed,
    shipment: saved,
    events: event
      ? [event, ...(await listCarrierShippingEvents({ shipmentId: saved.id, companyId: saved.companyId }))]
      : await listCarrierShippingEvents({ shipmentId: saved.id, companyId: saved.companyId }),
  };
}

async function addEvent(input: Omit<CarrierShippingEventRecord, "id" | "shipmentId" | "orderId" | "companyId" | "createdAt"> & { shipment: CarrierShipmentRecord }) {
  return saveCarrierShippingEvent({
    id: `sev_${randomUUID()}`,
    shipmentId: input.shipment.id,
    orderId: input.shipment.orderId,
    companyId: input.shipment.companyId,
    eventType: input.eventType,
    oldStatus: input.oldStatus,
    newStatus: input.newStatus,
    providerStatus: input.providerStatus,
    webhookEventId: input.webhookEventId,
    safeMetadata: input.safeMetadata,
    createdAt: new Date().toISOString(),
  });
}

async function findOrder(orderId: string) {
  const orders = (await repositoryRegistry.orders.listAll?.()) ?? [];
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
  return order;
}

async function buildServerShippingSnapshots(order: PaymentOrderRecord) {
  const config = getCarrierShippingConfig();
  if (!config.origin.contactPhone || !config.origin.address || !config.origin.postalCode) {
    if (config.provider === "biteship") {
      throw createApiError("PROVIDER_UNAVAILABLE", "Alamat origin Biteship belum lengkap.", 503);
    }
  }
  const destination = await resolveDestination(order);
  const items: ShippingPackageItemSnapshot[] = order.items.map((item) => ({
    name: item.productName,
    description: `${item.sku} - ${item.selectedColor}`,
    category: "apparel",
    quantity: item.totalQty,
    value: Math.max(0, Math.round(item.finalUnitPrice || item.priceFrom)),
    weightGram: config.packageDefaults.weightGram,
    lengthCm: config.packageDefaults.lengthCm,
    widthCm: config.packageDefaults.widthCm,
    heightCm: config.packageDefaults.heightCm,
  }));
  if (items.length === 0) throw createApiError("VALIDATION_ERROR", "Item order belum tersedia.", 400);
  return {
    origin: {
      ...config.origin,
      contactPhone: config.origin.contactPhone || "0000000000",
      address: config.origin.address || "Mock origin Ofissio",
      postalCode: config.origin.postalCode || "40115",
    },
    destination,
    items,
  };
}

async function resolveDestination(order: PaymentOrderRecord): Promise<ShippingAddressSnapshot> {
  const embedded = (order as PaymentOrderRecord & {
    shippingAddress?: Partial<ShippingAddressSnapshot>;
    destinationAddress?: Partial<ShippingAddressSnapshot>;
  }).shippingAddress ?? (order as PaymentOrderRecord & { destinationAddress?: Partial<ShippingAddressSnapshot> }).destinationAddress;
  if (embedded?.address && embedded.postalCode && embedded.contactName && embedded.contactPhone) {
    return {
      contactName: embedded.contactName,
      contactPhone: embedded.contactPhone,
      address: embedded.address,
      city: embedded.city ?? null,
      province: embedded.province ?? null,
      postalCode: embedded.postalCode,
      areaId: embedded.areaId ?? null,
    };
  }
  const client = getSupabaseAdminClient();
  if (client) {
    const addresses = await client.select("company_addresses", {
      filters: { company_id: order.companyId },
      order: "is_default_shipping.desc,created_at.asc",
      limit: 5,
    });
    const row = addresses.find((address) => Boolean(address.is_default_shipping ?? address.is_default)) ?? addresses[0];
    if (row) {
      return {
        contactName: String(row.recipient_name ?? ""),
        contactPhone: String(row.phone ?? ""),
        address: String(row.address_line ?? ""),
        city: row.city ? String(row.city) : null,
        province: row.province ? String(row.province) : null,
        postalCode: String(row.postal_code ?? ""),
        areaId: row.area_id ? String(row.area_id) : null,
      };
    }
  }
  if (repositoryRegistry.provider === "mock") {
    return {
      contactName: "Mock Customer",
      contactPhone: "081200000000",
      address: "Alamat tujuan mock",
      city: "Bandung",
      province: "Jawa Barat",
      postalCode: "40123",
      areaId: null,
    };
  }
  throw createApiError("VALIDATION_ERROR", "Alamat pengiriman customer belum lengkap.", 400);
}

function providerAdapter(provider: "mock" | "biteship"): CarrierShippingProviderAdapter {
  return provider === "biteship" ? biteshipCarrierShippingProvider : mockCarrierShippingProvider;
}

function assertShippingRuntimeAllowed(config: ReturnType<typeof getCarrierShippingConfig>) {
  if (!config.isRuntimeAllowed) {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Mock shipping tidak diizinkan pada environment production.",
      503,
    );
  }
}

async function syncLegacyShipment(
  carrier: CarrierShipmentRecord,
  order: PaymentOrderRecord,
  actorId: string | null,
  request?: Request,
) {
  const existing = (await getShipmentsByOrder({ orderId: order.id, companyId: order.companyId }))[0];
  const detail = existing
    ? { shipment: existing }
    : await createShipmentForOrder({
        orderId: order.id,
        companyId: order.companyId,
        actorId,
        actorType: actorId ? "internal" : "system",
        provider: normalizeProvider(carrier.courierCompany),
        service: carrier.courierService,
        recipientName: carrier.destinationSnapshot.contactName,
        recipientPhone: carrier.destinationSnapshot.contactPhone,
        destinationAddressJson: {
          recipientName: carrier.destinationSnapshot.contactName,
          phone: carrier.destinationSnapshot.contactPhone,
          addressLine: carrier.destinationSnapshot.address,
          city: carrier.destinationSnapshot.city,
          province: carrier.destinationSnapshot.province,
          postalCode: carrier.destinationSnapshot.postalCode,
          country: "Indonesia",
        },
        notes: null,
        request,
      });
  const legacyStatus = mapCarrierToLegacyStatus(carrier.shipmentStatus, detail.shipment.status);
  await updateShipment({
    shipmentId: detail.shipment.id,
    companyId: order.companyId,
    actorId,
    actorType: actorId ? "internal" : "system",
    provider: normalizeProvider(carrier.courierCompany),
    service: carrier.courierService,
    trackingNumber: carrier.biteshipWaybillId,
    trackingUrl: carrier.trackingUrl,
    status: legacyStatus,
    request,
  });
  const tracking = await repositoryRegistry.tracking.getTrackingByOrderId({
    companyId: order.companyId,
    orderId: order.id,
  });
  if (!tracking) return null;
  const carrierEvents = await listCarrierShippingEvents({
    shipmentId: carrier.id,
    companyId: carrier.companyId,
  });
  return repositoryRegistry.tracking.upsertTrackingOrder?.({
    ...tracking,
    shipmentTimeline: buildCustomerCarrierTimeline(carrier, carrierEvents),
    statusNote: customerCarrierStatusNote(carrier.shipmentStatus),
    shippingTrackingNumber: carrier.biteshipWaybillId,
    shippingTrackingUrl: carrier.trackingUrl,
    shippingProviderLabel: carrier.courierCompany.toUpperCase(),
    shippingServiceName: carrier.courierService,
    shipmentStatus: carrier.shipmentStatus,
    shipmentUpdatedAt: carrier.updatedAt,
    updatedAt: new Date().toISOString(),
  });
}

async function mirrorCarrierShipmentToWooCommerce(
  shipment: CarrierShipmentRecord,
  order: PaymentOrderRecord,
  request?: Request,
) {
  const wooOrderId = order.wooOrderId ?? order.woocommerceOrderId ?? null;
  if (!wooOrderId || !shouldSyncWooCommerceOrder()) return;

  try {
    const wooOrder = await woocommerceOrderRepository.getOrderById(wooOrderId);
    const values: Record<string, string | null> = {
      shipping_provider: shipment.provider,
      biteship_order_id: shipment.biteshipOrderId,
      courier_company: shipment.courierCompany,
      courier_service: shipment.courierService,
      waybill_id: shipment.biteshipWaybillId,
      shipment_status: shipment.shipmentStatus,
    };
    const metadata = Object.entries(values)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, value]) => upsertWooMeta(wooOrder.meta_data ?? [], key, value));
    await woocommerceOrderRepository.updateOrderMetadata(wooOrderId, metadata);
    logAuditEvent({
      request,
      actorId: null,
      actorType: "system",
      companyId: order.companyId,
      action: "shipping_woocommerce_mirror_synced",
      entityType: "shipping_shipment",
      entityId: shipment.id,
      metadata: { wooOrderId, shipmentStatus: shipment.shipmentStatus },
    });
  } catch (error) {
    logInternalError(error, {
      area: "carrier_shipping",
      operation: "woocommerce_mirror",
      orderId: order.id,
      wooOrderId,
    });
    logAuditEvent({
      request,
      actorId: null,
      actorType: "system",
      companyId: order.companyId,
      action: "shipping_woocommerce_mirror_failed",
      entityType: "shipping_shipment",
      entityId: shipment.id,
      metadata: { wooOrderId, shipmentStatus: shipment.shipmentStatus },
    });
  }
}

function upsertWooMeta(
  existing: WooCommerceMetaData[],
  key: string,
  value: string,
): WooCommerceMetaData {
  const current = [...existing].reverse().find((entry) => entry.key === key);
  return current?.id ? { id: current.id, key, value } : { key, value };
}

function mapCarrierToLegacyStatus(status: CarrierShipmentRecord["shipmentStatus"], current: ShipmentStatus): ShipmentStatus {
  switch (status) {
    case "shipment_created":
    case "pickup_scheduled":
      return "booked";
    case "picked_up":
      return "picked_up";
    case "in_transit":
    case "out_for_delivery":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "delivery_failed":
      return "failed";
    case "returned":
      return "returned";
    case "cancelled":
      return "cancelled";
    case "waiting_shipment":
      return "ready_to_ship";
    case "manual_review":
      return current;
  }
}

function sanitizeCourierFilter(value?: string[]) {
  return value
    ?.map((item) => item.trim().toLowerCase())
    .filter((item) => /^[a-z0-9_-]{2,30}$/.test(item))
    .slice(0, 12);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function webhookDigest(shipmentId: string, payload: JsonObject) {
  const stable = JSON.stringify({
    shipmentId,
    event: firstString(payload.event),
    status: firstString(payload.status, payload.order_status),
    waybill: firstString(payload.courier_waybill_id, payload.waybill_id),
    price: finiteNonNegative(payload.order_price ?? payload.price),
  });
  return `biteship_${createHash("sha256").update(stable).digest("hex")}`;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function finiteNonNegative(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function buildCustomerCarrierTimeline(
  shipment: CarrierShipmentRecord,
  events: CarrierShippingEventRecord[],
) {
  const steps: Array<{
    status: CarrierShipmentRecord["shipmentStatus"];
    label: string;
    description: string;
  }> = [
    {
      status: "shipment_created",
      label: "Pengiriman dibuat",
      description: "Pesanan sudah didaftarkan ke layanan pengiriman.",
    },
    {
      status: "pickup_scheduled",
      label: "Menunggu pickup",
      description: "Kurir sedang dijadwalkan untuk mengambil paket.",
    },
    {
      status: "picked_up",
      label: "Paket dijemput",
      description: "Paket sudah diterima oleh kurir.",
    },
    {
      status: "in_transit",
      label: "Dalam perjalanan",
      description: "Paket sedang menuju area tujuan.",
    },
    {
      status: "out_for_delivery",
      label: "Menuju alamat penerima",
      description: "Kurir sedang mengantar paket ke alamat penerima.",
    },
    {
      status: "delivered",
      label: "Terkirim",
      description: "Paket telah diterima.",
    },
  ];
  const index = steps.findIndex((step) => step.status === shipment.shipmentStatus);
  const effectiveIndex = index >= 0 ? index : Math.min(steps.length - 1, statusProgressIndex(shipment.shipmentStatus));
  return steps.map((step, stepIndex) => {
    const event = events.find((candidate) => candidate.newStatus === step.status);
    return {
      id: `carrier-${step.status}`,
      label: step.label,
      state:
        stepIndex < effectiveIndex || shipment.shipmentStatus === "delivered"
          ? ("completed" as const)
          : stepIndex === effectiveIndex
            ? ("current" as const)
            : ("pending" as const),
      timestamp: event?.createdAt ?? null,
      location:
        step.status === "delivered"
          ? shipment.destinationSnapshot.city ?? "Alamat penerima"
          : shipment.courierCompany.toUpperCase(),
      description: step.description,
    };
  });
}

function statusProgressIndex(status: CarrierShipmentRecord["shipmentStatus"]) {
  switch (status) {
    case "waiting_shipment":
    case "shipment_created":
      return 0;
    case "pickup_scheduled":
      return 1;
    case "picked_up":
      return 2;
    case "in_transit":
    case "delivery_failed":
    case "returned":
    case "cancelled":
    case "manual_review":
      return 3;
    case "out_for_delivery":
      return 4;
    case "delivered":
      return 5;
  }
}

function customerCarrierStatusNote(status: CarrierShipmentRecord["shipmentStatus"]) {
  switch (status) {
    case "waiting_shipment":
      return "Pesanan sedang diproses sebelum pengiriman dibuat.";
    case "shipment_created":
      return "Pengiriman sudah dibuat dan menunggu penjadwalan kurir.";
    case "pickup_scheduled":
      return "Pickup kurir sedang dijadwalkan.";
    case "picked_up":
      return "Paket sudah dijemput oleh kurir.";
    case "in_transit":
      return "Paket sedang dalam perjalanan.";
    case "out_for_delivery":
      return "Paket sedang menuju alamat penerima.";
    case "delivered":
      return "Paket sudah diterima.";
    case "delivery_failed":
      return "Pengiriman mengalami kendala. Tim Ofissio sedang membantu.";
    case "returned":
      return "Paket dikembalikan dan sedang ditangani tim Ofissio.";
    case "cancelled":
      return "Pengiriman dibatalkan. Hubungi Ofissio jika memerlukan bantuan.";
    case "manual_review":
      return "Status pengiriman sedang diverifikasi oleh tim Ofissio.";
  }
}
