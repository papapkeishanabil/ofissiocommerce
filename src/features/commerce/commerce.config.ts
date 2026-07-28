import "server-only";

import {
  assertNoPublicSecretEnv,
  getOptionalServerEnv,
} from "@/lib/security/server-only-secret";

import type { CommerceRuntimeConfig, ProductSource } from "./commerce.types";

export function getCommerceRuntimeConfig(): CommerceRuntimeConfig {
  assertNoPublicSecretEnv([
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY",
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
    "NEXT_PUBLIC_WOO_CONSUMER_KEY",
    "NEXT_PUBLIC_WOO_CONSUMER_SECRET",
  ]);

  const requestedProductSource: ProductSource =
    getOptionalServerEnv("PRODUCT_SOURCE", "mock") === "woocommerce"
      ? "woocommerce"
      : "mock";
  const woocommerce = {
    enabled: getOptionalServerEnv("WOOCOMMERCE_ENABLED", "false") === "true",
    baseUrl:
      getOptionalServerEnv("WOOCOMMERCE_BASE_URL") ||
      getOptionalServerEnv("WOO_API_URL").replace(/\/wp-json\/wc\/v3\/?$/, ""),
    consumerKey:
      getOptionalServerEnv("WOOCOMMERCE_CONSUMER_KEY") ||
      getOptionalServerEnv("WOO_CONSUMER_KEY"),
    consumerSecret:
      getOptionalServerEnv("WOOCOMMERCE_CONSUMER_SECRET") ||
      getOptionalServerEnv("WOO_CONSUMER_SECRET"),
    syncOrders:
      getOptionalServerEnv("WOOCOMMERCE_SYNC_ORDERS", "false") === "true",
  };
  const isConfigured = Boolean(
    woocommerce.enabled &&
      woocommerce.baseUrl &&
      woocommerce.consumerKey &&
      woocommerce.consumerSecret,
  );

  return {
    requestedProductSource,
    productSource:
      requestedProductSource === "woocommerce" && isConfigured
        ? "woocommerce"
        : "mock",
    woocommerce: { ...woocommerce, isConfigured },
  };
}
