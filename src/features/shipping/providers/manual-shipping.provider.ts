import "server-only";

import type { ShippingProviderAdapter } from "../shipping.types";

export const manualShippingProvider: ShippingProviderAdapter = {
  name: "manual",
  async getRates() {
    return [
      {
        id: "manual-quotation",
        provider: "manual",
        courierCode: "manual",
        courierName: "Konfirmasi Ofissio",
        serviceCode: "QUOTATION",
        serviceName: "Ongkir via quotation",
        price: 0,
        currency: "IDR",
        estimatedDays: "Dikonfirmasi tim Ofissio",
        isAvailable: true,
      },
    ];
  },
};
