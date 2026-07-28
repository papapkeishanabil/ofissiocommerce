export type ExternalOrderProvider = "woocommerce";

export interface ExternalOrderSyncState {
  provider: ExternalOrderProvider;
  externalOrderId: string;
  syncedAt: string;
}
