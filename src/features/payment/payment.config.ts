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
    mode: "sandbox" | "live";
    paymentMode: "sandbox" | "live";
    va: string;
    apiKey: string;
    baseUrl: string;
    notifyUrl: string;
    returnUrl: string;
    cancelUrl: string;
    expireMinutes: number;
    isComplete: boolean;
    configurationErrors: string[];
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
  const rawPaymentMode = getOptionalServerEnv("PAYMENT_MODE").toLowerCase();
  const rawIpaymuMode = getOptionalServerEnv("IPAYMU_MODE").toLowerCase();
  const paymentMode: "sandbox" | "live" = rawPaymentMode === "live" ? "live" : "sandbox";
  const mode: "sandbox" | "live" = rawIpaymuMode === "live" ? "live" : "sandbox";
  const defaultBaseUrl =
    mode === "live" ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
  const notifyUrl =
    getOptionalServerEnv("IPAYMU_NOTIFY_URL") ||
    getOptionalServerEnv("IPAYMU_CALLBACK_URL");
  const ipaymu = {
    enabled: getOptionalServerEnv("IPAYMU_ENABLED") === "true",
    mode,
    va: getOptionalServerEnv("IPAYMU_VA"),
    apiKey: getOptionalServerEnv("IPAYMU_API_KEY"),
    baseUrl: getOptionalServerEnv("IPAYMU_BASE_URL") || defaultBaseUrl,
    notifyUrl,
    returnUrl: getOptionalServerEnv("IPAYMU_RETURN_URL"),
    cancelUrl: getOptionalServerEnv("IPAYMU_CANCEL_URL"),
    expireMinutes: normalizeExpireMinutes(getOptionalServerEnv("IPAYMU_EXPIRE_MINUTES")),
  };
  const configurationErrors = validateIpaymuConfiguration({
    ...ipaymu,
    mode,
    paymentMode,
    rawPaymentMode,
    rawIpaymuMode,
  });
  const isComplete =
    configurationErrors.length === 0;

  return {
    requestedProvider,
    provider:
      requestedProvider,
    ipaymu: {
      ...ipaymu,
      mode,
      paymentMode,
      isComplete,
      configurationErrors,
    },
  };
}

function validateIpaymuConfiguration(input: {
  enabled: boolean;
  mode: "sandbox" | "live";
  paymentMode: "sandbox" | "live";
  rawPaymentMode: string;
  rawIpaymuMode: string;
  va: string;
  apiKey: string;
  baseUrl: string;
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const errors: string[] = [];
  if (!input.enabled) errors.push("IPAYMU_ENABLED belum aktif.");
  if (!input.va) errors.push("IPAYMU_VA belum diisi.");
  if (!input.apiKey) errors.push("IPAYMU_API_KEY belum diisi.");
  if (!isHttpsUrl(input.baseUrl)) errors.push("IPAYMU_BASE_URL harus memakai HTTPS.");
  if (!isPublicHttpsUrl(input.notifyUrl)) {
    errors.push("IPAYMU_NOTIFY_URL harus berupa URL HTTPS publik.");
  }
  if (!isHttpsOrLocalUrl(input.returnUrl)) errors.push("IPAYMU_RETURN_URL tidak valid.");
  if (!isHttpsOrLocalUrl(input.cancelUrl)) errors.push("IPAYMU_CANCEL_URL tidak valid.");
  if (input.rawPaymentMode && !["sandbox", "live"].includes(input.rawPaymentMode)) {
    errors.push("PAYMENT_MODE hanya boleh sandbox atau live.");
  }
  if (input.rawIpaymuMode && !["sandbox", "live"].includes(input.rawIpaymuMode)) {
    errors.push("IPAYMU_MODE hanya boleh sandbox atau live.");
  }
  if (input.mode !== input.paymentMode) {
    errors.push("PAYMENT_MODE dan IPAYMU_MODE harus sama.");
  }
  if (
    input.mode === "live" &&
    (input.rawPaymentMode !== "live" || input.rawIpaymuMode !== "live")
  ) {
    errors.push("Mode live membutuhkan PAYMENT_MODE=live dan IPAYMU_MODE=live secara eksplisit.");
  }
  const expectedHost = input.mode === "live" ? "my.ipaymu.com" : "sandbox.ipaymu.com";
  if (urlHost(input.baseUrl) !== expectedHost) {
    errors.push(`IPAYMU_BASE_URL harus menggunakan host ${expectedHost} untuk mode ${input.mode}.`);
  }
  return errors;
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isHttpsOrLocalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && isLocalHost(url.hostname));
  } catch {
    return false;
  }
}

function isPublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !isLocalHost(url.hostname);
  } catch {
    return false;
  }
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function urlHost(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeExpireMinutes(value: string) {
  const parsed = Number.parseInt(value || "1440", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 43_200) : 1440;
}
