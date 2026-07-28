import "server-only";

import type { PaymentProvider } from "./payment.types";

export interface PaymentRuntimeConfig {
  requestedProvider: PaymentProvider;
  provider: PaymentProvider;
  ipaymu: {
    va: string;
    apiKey: string;
    baseUrl: string;
    callbackUrl: string;
    returnUrl: string;
    cancelUrl: string;
    isComplete: boolean;
  };
}

export function getPaymentRuntimeConfig(): PaymentRuntimeConfig {
  const requestedProvider: PaymentProvider =
    process.env.PAYMENT_PROVIDER === "ipaymu" ? "ipaymu" : "mock";
  const ipaymu = {
    va: process.env.IPAYMU_VA?.trim() ?? "",
    apiKey: process.env.IPAYMU_API_KEY?.trim() ?? "",
    baseUrl: process.env.IPAYMU_BASE_URL?.trim() ?? "",
    callbackUrl: process.env.IPAYMU_CALLBACK_URL?.trim() ?? "",
    returnUrl: process.env.IPAYMU_RETURN_URL?.trim() ?? "",
    cancelUrl: process.env.IPAYMU_CANCEL_URL?.trim() ?? "",
  };
  const isComplete = Object.values(ipaymu).every(Boolean);

  return {
    requestedProvider,
    provider:
      requestedProvider === "ipaymu" && isComplete ? "ipaymu" : "mock",
    ipaymu: { ...ipaymu, isComplete },
  };
}
