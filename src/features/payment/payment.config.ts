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
    enabled: boolean;
    mode: "sandbox" | "production";
    va: string;
    apiKey: string;
    baseUrl: string;
    callbackUrl: string;
    returnUrl: string;
    cancelUrl: string;
    expireMinutes: number;
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
  const mode: "sandbox" | "production" =
    getOptionalServerEnv("IPAYMU_MODE") === "production" ? "production" : "sandbox";
  const defaultBaseUrl =
    mode === "production" ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
  const ipaymu = {
    enabled: getOptionalServerEnv("IPAYMU_ENABLED") === "true",
    mode,
    va: getOptionalServerEnv("IPAYMU_VA"),
    apiKey: getOptionalServerEnv("IPAYMU_API_KEY"),
    baseUrl: getOptionalServerEnv("IPAYMU_BASE_URL") || defaultBaseUrl,
    callbackUrl: getOptionalServerEnv("IPAYMU_CALLBACK_URL"),
    returnUrl: getOptionalServerEnv("IPAYMU_RETURN_URL"),
    cancelUrl: getOptionalServerEnv("IPAYMU_CANCEL_URL"),
    expireMinutes: normalizeExpireMinutes(getOptionalServerEnv("IPAYMU_EXPIRE_MINUTES")),
  };
  const isComplete =
    ipaymu.enabled &&
    Boolean(ipaymu.va) &&
    Boolean(ipaymu.apiKey) &&
    Boolean(ipaymu.baseUrl) &&
    Boolean(ipaymu.callbackUrl) &&
    Boolean(ipaymu.returnUrl) &&
    Boolean(ipaymu.cancelUrl);

  return {
    requestedProvider,
    provider:
      requestedProvider === "ipaymu" && isComplete ? "ipaymu" : "mock",
    ipaymu: { ...ipaymu, isComplete },
  };
}

function normalizeExpireMinutes(value: string) {
  const parsed = Number.parseInt(value || "1440", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 43_200) : 1440;
}
