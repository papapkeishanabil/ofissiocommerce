export type ExternalOrderProvider = "woocommerce";

export type WooOrderSyncStatus = "disabled" | "pending" | "synced" | "failed";

export type OrderProcessRoute = "fulfillment" | "customization" | "production";
export type OrderProcessStatus =
  | "not_started"
  | "ready_to_process"
  | "in_progress"
  | "waiting_replenishment"
  | "waiting_customer_approval"
  | "on_hold"
  | "completed"
  | "cancelled";
export type OrderReplenishmentStatus =
  | "not_required"
  | "needed"
  | "in_progress"
  | "completed";
export type OrderCustomizationType =
  | "embroidery"
  | "screen_printing"
  | "dtf"
  | "name_tag"
  | "custom_design"
  | "none";

export interface ExternalOrderSyncState {
  provider: ExternalOrderProvider;
  externalOrderId: string;
  syncedAt: string;
}

export interface OrderProcessRouting {
  processRoute: OrderProcessRoute;
  processStatus: OrderProcessStatus;
  replenishmentStatus: OrderReplenishmentStatus;
  hasCustomization: boolean;
  customizationType: OrderCustomizationType;
  processRouteReason: string;
}
