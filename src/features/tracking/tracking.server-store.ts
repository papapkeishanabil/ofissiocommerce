import "server-only";

import type { CustomerTrackingOrder } from "./tracking.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";

interface TrackingStoreState {
  orders: Map<string, CustomerTrackingOrder>;
}

type TrackingGlobal = typeof globalThis & {
  __ofissioTrackingStore?: TrackingStoreState;
};

const trackingGlobal = globalThis as TrackingGlobal;
const state =
  trackingGlobal.__ofissioTrackingStore ??
  (trackingGlobal.__ofissioTrackingStore = {
    orders: new Map<string, CustomerTrackingOrder>(),
  });

export function upsertTrackingOrder(order: CustomerTrackingOrder) {
  const existing = state.orders.get(order.id);
  const next: CustomerTrackingOrder = existing
    ? {
        ...existing,
        ...order,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      }
    : order;
  state.orders.set(order.id, next);
  void repositoryRegistry.tracking.upsertTrackingOrder?.(next).catch(() => {
    // Persistence foundation must not break tracking updates.
  });
  return { order: next, created: !existing };
}

export async function upsertTrackingOrderPersisted(order: CustomerTrackingOrder) {
  const existing = state.orders.get(order.id);
  const next: CustomerTrackingOrder = existing
    ? {
        ...existing,
        ...order,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      }
    : order;
  state.orders.set(order.id, next);
  await repositoryRegistry.tracking.upsertTrackingOrder?.(next);
  return { order: next, created: !existing };
}

export function findTrackingOrder(orderId: string) {
  return state.orders.get(orderId) ?? null;
}

export function listTrackingOrders(companyId?: string | null) {
  const orders = [...state.orders.values()];
  return companyId
    ? orders.filter((order) => order.companyId === companyId)
    : orders;
}
