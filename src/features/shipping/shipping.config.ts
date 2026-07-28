import "server-only";

import type { ShippingProvider } from "./shipping.types";

export interface ShippingRuntimeConfig {
  provider: ShippingProvider;
  defaultOrigin: {
    city: string;
    postalCode: string;
  };
  placeholderWeightGram: number;
}

export function getShippingRuntimeConfig(): ShippingRuntimeConfig {
  return {
    provider: process.env.SHIPPING_PROVIDER === "manual" ? "manual" : "mock",
    defaultOrigin: {
      city: process.env.DEFAULT_ORIGIN_CITY?.trim() || "Bandung",
      postalCode: process.env.DEFAULT_ORIGIN_POSTAL_CODE?.trim() || "40115",
    },
    // Product weight is not in Phase 4C yet. Never trust the browser's weight.
    placeholderWeightGram: 500,
  };
}
