import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { repositoryRegistry } from "@/features/repositories/repository.factory";

import { eventToRow, quoteToRow, rowToCarrierShipment, rowToEvent, rowToQuote, shipmentToRow } from "./carrier-shipping.mapper";
import type {
  CarrierShipmentRecord,
  CarrierShippingEventRecord,
  ShippingQuoteRecord,
} from "./carrier-shipping.types";

interface CarrierStore {
  quotes: ShippingQuoteRecord[];
  shipments: CarrierShipmentRecord[];
  events: CarrierShippingEventRecord[];
}

declare global {
  // eslint-disable-next-line no-var
  var __ofissioCarrierShippingStore: CarrierStore | undefined;
}

const memoryStore =
  globalThis.__ofissioCarrierShippingStore ??
  (globalThis.__ofissioCarrierShippingStore = { quotes: [], shipments: [], events: [] });

function isSupabase() {
  return repositoryRegistry.provider === "supabase";
}

export async function saveShippingQuotes(quotes: ShippingQuoteRecord[]) {
  if (!isSupabase()) {
    memoryStore.quotes.push(...quotes);
    return quotes;
  }
  const client = getSupabaseAdminClient();
  if (!client) return [];
  const rows = await client.insert("shipping_quotes", quotes.map(quoteToRow));
  return rows.map(rowToQuote);
}

export async function listShippingQuotes(input: { orderId: string; companyId: string }) {
  if (!isSupabase()) {
    return memoryStore.quotes
      .filter((quote) => quote.orderId === input.orderId && quote.companyId === input.companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return safeRead(async () => {
    const rows = await getSupabaseAdminClient()!.select("shipping_quotes", {
      filters: { order_id: input.orderId, company_id: input.companyId },
      order: "created_at.desc",
    });
    return rows.map(rowToQuote);
  }, []);
}

export async function getShippingQuote(input: { id: string; orderId: string; companyId: string }) {
  if (!isSupabase()) {
    return memoryStore.quotes.find(
      (quote) => quote.id === input.id && quote.orderId === input.orderId && quote.companyId === input.companyId,
    ) ?? null;
  }
  return safeRead(async () => {
    const rows = await getSupabaseAdminClient()!.select("shipping_quotes", {
      filters: { id: input.id, order_id: input.orderId, company_id: input.companyId },
      limit: 1,
    });
    return rows[0] ? rowToQuote(rows[0]) : null;
  }, null);
}

export async function saveCarrierShipment(shipment: CarrierShipmentRecord) {
  if (!isSupabase()) {
    memoryStore.shipments.push(shipment);
    return shipment;
  }
  const rows = await getSupabaseAdminClient()!.insert("shipping_shipments", shipmentToRow(shipment));
  return rows[0] ? rowToCarrierShipment(rows[0]) : shipment;
}

export async function updateCarrierShipment(
  shipment: CarrierShipmentRecord,
) {
  if (!isSupabase()) {
    const index = memoryStore.shipments.findIndex((item) => item.id === shipment.id);
    if (index >= 0) memoryStore.shipments[index] = shipment;
    return shipment;
  }
  const rows = await getSupabaseAdminClient()!.update(
    "shipping_shipments",
    shipmentToRow(shipment),
    { id: shipment.id, company_id: shipment.companyId },
  );
  return rows[0] ? rowToCarrierShipment(rows[0]) : shipment;
}

export async function getCarrierShipmentByOrder(input: { orderId: string; companyId: string }) {
  if (!isSupabase()) {
    return memoryStore.shipments.find(
      (shipment) => shipment.orderId === input.orderId && shipment.companyId === input.companyId,
    ) ?? null;
  }
  return safeRead(async () => {
    const rows = await getSupabaseAdminClient()!.select("shipping_shipments", {
      filters: { order_id: input.orderId, company_id: input.companyId },
      order: "created_at.desc",
      limit: 1,
    });
    return rows[0] ? rowToCarrierShipment(rows[0]) : null;
  }, null);
}

export async function getCarrierShipmentByProviderId(providerShipmentId: string) {
  if (!isSupabase()) {
    return memoryStore.shipments.find(
      (shipment) => shipment.providerShipmentId === providerShipmentId || shipment.biteshipOrderId === providerShipmentId,
    ) ?? null;
  }
  return safeRead(async () => {
    let rows = await getSupabaseAdminClient()!.select("shipping_shipments", {
      filters: { provider_shipment_id: providerShipmentId },
      limit: 1,
    });
    if (!rows[0]) {
      rows = await getSupabaseAdminClient()!.select("shipping_shipments", {
        filters: { biteship_order_id: providerShipmentId },
        limit: 1,
      });
    }
    return rows[0] ? rowToCarrierShipment(rows[0]) : null;
  }, null);
}

export async function saveCarrierShippingEvent(event: CarrierShippingEventRecord) {
  if (!isSupabase()) {
    memoryStore.events.push(event);
    return event;
  }
  const rows = await getSupabaseAdminClient()!.insert("shipping_events", eventToRow(event));
  return rows[0] ? rowToEvent(rows[0]) : event;
}

export async function listCarrierShippingEvents(input: { shipmentId: string; companyId: string }) {
  if (!isSupabase()) {
    return memoryStore.events
      .filter((event) => event.shipmentId === input.shipmentId && event.companyId === input.companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return safeRead(async () => {
    const rows = await getSupabaseAdminClient()!.select("shipping_events", {
      filters: { shipment_id: input.shipmentId, company_id: input.companyId },
      order: "created_at.desc",
    });
    return rows.map(rowToEvent);
  }, []);
}

export async function hasWebhookEvent(webhookEventId: string) {
  if (!isSupabase()) {
    return memoryStore.events.some((event) => event.webhookEventId === webhookEventId);
  }
  return safeRead(async () => {
    const rows = await getSupabaseAdminClient()!.select("shipping_events", {
      filters: { webhook_event_id: webhookEventId },
      select: "id",
      limit: 1,
    });
    return Boolean(rows[0]);
  }, false);
}

async function safeRead<T>(callback: () => Promise<T>, fallback: T) {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof SupabaseDatabaseError && error.reason === "relation_does_not_exist") {
      return fallback;
    }
    throw error;
  }
}

