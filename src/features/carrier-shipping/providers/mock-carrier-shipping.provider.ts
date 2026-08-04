import { createHash } from "node:crypto";

import type { CarrierShippingProviderAdapter } from "./carrier-shipping.provider";

export const mockCarrierShippingProvider: CarrierShippingProviderAdapter = {
  async getRates(request) {
    const weight = request.items.reduce(
      (total, item) => total + item.weightGram * item.quantity,
      0,
    );
    const base = Math.max(18_000, Math.ceil(weight / 1000) * 9_000);
    return [
      {
        providerQuoteId: mockId(`${request.orderId}:jne:reg`),
        courierCompany: "jne",
        courierType: "reg",
        courierService: "JNE Regular",
        price: base,
        duration: "2-4 hari",
        safeSnapshot: { source: "mock", service: "regular", weightGram: weight },
      },
      {
        providerQuoteId: mockId(`${request.orderId}:sicepat:best`),
        courierCompany: "sicepat",
        courierType: "best",
        courierService: "SiCepat BEST",
        price: base + 12_000,
        duration: "1-2 hari",
        safeSnapshot: { source: "mock", service: "express", weightGram: weight },
      },
    ];
  },
  async createShipment({ referenceId, quote }) {
    return {
      providerShipmentId: `mock_order_${mockId(referenceId).slice(-16)}`,
      waybillId: `MOCK${mockId(`${referenceId}:waybill`).slice(-10).toUpperCase()}`,
      status: "confirmed",
      trackingUrl: null,
      price: quote.shippingPrice,
      safeSnapshot: { source: "mock", status: "confirmed" },
    };
  },
  async retrieveShipment(providerShipmentId) {
    return {
      providerShipmentId,
      waybillId: null,
      status: "confirmed",
      trackingUrl: null,
      price: 0,
      safeSnapshot: { source: "mock", refreshed: true },
    };
  },
};

function mockId(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

