import "server-only";

import {
  assertNoPublicSecretEnv,
  getOptionalServerEnv,
} from "@/lib/security/server-only-secret";

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
  assertNoPublicSecretEnv([
    "NEXT_PUBLIC_IPAYMU_API_KEY",
    "NEXT_PUBLIC_IPAYMU_SECRET",
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
  ]);
  const requestedProvider: PaymentProvider =
    getOptionalServerEnv("PAYMENT_PROVIDER") === "ipaymu" ? "ipaymu" : "mock";
  const ipaymu = {
    va: getOptionalServerEnv("IPAYMU_VA"),
    apiKey: getOptionalServerEnv("IPAYMU_API_KEY"),
    baseUrl: getOptionalServerEnv("IPAYMU_BASE_URL"),
    callbackUrl: getOptionalServerEnv("IPAYMU_CALLBACK_URL"),
    returnUrl: getOptionalServerEnv("IPAYMU_RETURN_URL"),
    cancelUrl: getOptionalServerEnv("IPAYMU_CANCEL_URL"),
  };
  const isComplete = Object.values(ipaymu).every(Boolean);

  return {
    requestedProvider,
    provider:
      requestedProvider === "ipaymu" && isComplete ? "ipaymu" : "mock",
    ipaymu: { ...ipaymu, isComplete },
  };
}
