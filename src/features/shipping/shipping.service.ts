import "server-only";

import { randomUUID } from "node:crypto";

import { productServerService } from "@/features/products/product.server-service";

import { manualShippingProvider } from "./providers/manual-shipping.provider";
import { mockShippingProvider } from "./providers/mock-shipping.provider";
import { getShippingRuntimeConfig } from "./shipping.config";
import type {
  CreateShipmentInput,
  ShipmentRecord,
  ShippingProviderAdapter,
  ShippingRate,
  ShippingRateRequest,
} from "./shipping.types";
import {
  createShipmentSchema,
  shippingRateRequestSchema,
} from "./shipping.validation";

const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

interface ShippingState {
  cache: Map<string, { expiresAt: number; rates: ShippingRate[] }>;
  rates: Map<string, ShippingRate>;
  shipments: Map<string, ShipmentRecord>;
  rateLimits: Map<string, { count: number; resetAt: number }>;
}

type ShippingGlobal = typeof globalThis & {
  __ofissioShippingState?: ShippingState;
};

const shippingGlobal = globalThis as ShippingGlobal;
const state =
  shippingGlobal.__ofissioShippingState ??
  (shippingGlobal.__ofissioShippingState = {
    cache: new Map(),
    rates: new Map(),
    shipments: new Map(),
    rateLimits: new Map(),
  });

function enforceRateLimit(clientKey: string) {
  const now = Date.now();
  const current = state.rateLimits.get(clientKey);
  if (!current || current.resetAt <= now) {
    state.rateLimits.set(clientKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }
  if (current.count >= RATE_LIMIT_MAX) {
    throw new Error("Terlalu banyak permintaan ongkir. Silakan coba lagi.");
  }
  current.count += 1;
}

async function getCanonicalWeight(request: ShippingRateRequest) {
  const { placeholderWeightGram } = getShippingRuntimeConfig();
  let total = 0;
  for (const item of request.items) {
    const product = await productServerService.getProductById(item.productId);
    if (!product) throw new Error("Produk pengiriman tidak ditemukan.");
    const validation = productServerService.validateProductForCart(product);
    if (!validation.ok) throw new Error(validation.reason);
    total += placeholderWeightGram * item.quantity;
  }
  return total;
}

function provider(): ShippingProviderAdapter {
  return getShippingRuntimeConfig().provider === "manual"
    ? manualShippingProvider
    : mockShippingProvider;
}

async function getRates(
  input: ShippingRateRequest,
  clientKey = "anonymous",
): Promise<ShippingRate[]> {
  enforceRateLimit(clientKey);
  const parsed = shippingRateRequestSchema.parse(input);
  const config = getShippingRuntimeConfig();
  const request: ShippingRateRequest = {
    ...parsed,
    origin: config.defaultOrigin,
  };
  const canonicalWeightGram = await getCanonicalWeight(request);
  const activeProvider = provider();
  const cacheKey = [
    activeProvider.name,
    request.origin.city,
    request.origin.postalCode,
    request.destination.city,
    request.destination.postalCode,
    canonicalWeightGram,
    "all-couriers",
  ]
    .join("|")
    .toLowerCase();
  const cached = state.cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rates;

  let rates: ShippingRate[];
  try {
    rates = await activeProvider.getRates({ request, canonicalWeightGram });
  } catch {
    rates = await manualShippingProvider.getRates({
      request,
      canonicalWeightGram,
    });
  }
  const safeRates = rates.filter(
    (rate) => rate.isAvailable && rate.price >= 0,
  );
  safeRates.forEach((rate) => state.rates.set(rate.id, rate));
  state.cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    rates: safeRates,
  });
  return safeRates;
}

function getRateById(rateId: string) {
  return state.rates.get(rateId) ?? null;
}

function createShipment(input: CreateShipmentInput): ShipmentRecord {
  const parsed = createShipmentSchema.parse(input);
  const rate = getRateById(parsed.shippingRateId);
  if (!rate) throw new Error("Pilihan pengiriman tidak ditemukan.");
  const now = new Date().toISOString();
  const shipment: ShipmentRecord = {
    id: `shp_${randomUUID()}`,
    orderId: parsed.orderId,
    companyId: parsed.companyId ?? null,
    shippingRateId: rate.id,
    provider: rate.provider,
    trackingNumber:
      rate.provider === "mock"
        ? `MOCK${Date.now().toString().slice(-10)}`
        : null,
    status: "ready_to_ship",
    createdAt: now,
    updatedAt: now,
  };
  state.shipments.set(shipment.id, shipment);
  return shipment;
}

function trackShipment(shipmentId: string) {
  return state.shipments.get(shipmentId) ?? null;
}

export const shippingService = {
  getRates,
  getRateById,
  createShipment,
  trackShipment,
};
