import "server-only";

import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import type { TrackingRepository } from "../repository.types";

type TrackingGlobal = typeof globalThis & {
  __ofissioRepositoryTrackingOrders?: Map<string, CustomerTrackingOrder>;
};

const trackingGlobal = globalThis as TrackingGlobal;
const trackingOrders =
  trackingGlobal.__ofissioRepositoryTrackingOrders ??
  (trackingGlobal.__ofissioRepositoryTrackingOrders = new Map<string, CustomerTrackingOrder>());

export const mockTrackingRepository: TrackingRepository = {
  async upsertTrackingOrder(order) {
    const existing = trackingOrders.get(order.id);
    const next = existing
      ? { ...existing, ...order, createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
      : order;
    trackingOrders.set(next.id, next);
    return next;
  },
  async getTrackingByOrderId(input) {
    const order = trackingOrders.get(input.orderId);
    if (!order || order.companyId !== input.companyId) return null;
    return order;
  },
  async listTrackingByCompany(companyId) {
    return [...trackingOrders.values()]
      .filter((order) => order.companyId === companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
};
