export type ProductSource = "mock" | "woocommerce";

export interface WooCommerceRuntimeConfig {
  enabled: boolean;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  syncOrders: boolean;
  isConfigured: boolean;
}

export interface CommerceRuntimeConfig {
  requestedProductSource: ProductSource;
  productSource: ProductSource;
  woocommerce: WooCommerceRuntimeConfig;
}

export interface CommerceSyncResult {
  ok: boolean;
  skipped: boolean;
  provider: "woocommerce" | "mock";
  externalOrderId?: string | null;
  message: string;
}
