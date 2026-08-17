import "server-only";

import { getOptionalServerEnv } from "@/lib/security/server-only-secret";

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
  const requestedProvider = getOptionalServerEnv("SHIPPING_PROVIDER");
  return {
    provider:
      requestedProvider === "biteship"
        ? "biteship"
        : requestedProvider === "manual"
          ? "manual"
          : "mock",
    defaultOrigin: {
      city: getOptionalServerEnv("DEFAULT_ORIGIN_CITY", "Bandung"),
      postalCode: getOptionalServerEnv("DEFAULT_ORIGIN_POSTAL_CODE", "40115"),
    },
    // Product weight is not in Phase 4C yet. Never trust the browser's weight.
    placeholderWeightGram: 500,
  };
}
