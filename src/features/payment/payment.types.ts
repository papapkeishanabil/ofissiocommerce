import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type {
  OrderCustomizationType,
  OrderProcessRoute,
  OrderProcessStatus,
  OrderReplenishmentStatus,
  WooOrderSyncStatus,
} from "@/features/orders/order.types";

export type PaymentProvider = "mock" | "ipaymu";

export type PaymentStatus =
  | "pending"
  | "waiting_payment"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled"
  | "refunded";

export interface PaymentRecord {
  id: string;
  orderId: string;
  companyId: string;
  provider: PaymentProvider;
  referenceId: string;
  providerPaymentId: string | null;
  providerTransactionId: string | null;
  amount: number;
  currency: "IDR";
  status: PaymentStatus;
  paymentUrl: string | null;
  paymentQrUrl: string | null;
  paymentQrDataUrl: string | null;
  paymentQrString: string | null;
  paymentMethod: string | null;
  paymentChannel: string | null;
  uniqueCode: number;
  expiredAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  callbackReceivedAt: string | null;
  callbackStatus: string | null;
  callbackReference: string | null;
  callbackAmount: number | null;
  callbackRawSafeJson: Record<string, unknown> | null;
  invoiceDocumentId: string | null;
  rawProviderResponse: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  cartId?: string;
  orderId?: string;
  companyId: string;
  userId: string;
  shippingRateId: string | null;
}

export interface CreatePaymentResult {
  paymentId: string;
  orderId: string;
  paymentUrl: string | null;
  expiredAt: string | null;
  amount: number;
  status: PaymentStatus;
  provider: PaymentProvider;
  idempotent?: boolean;
  qrAvailable?: boolean;
}

export interface PaymentCalculation {
  itemSubtotal: number;
  customizationFee: number;
  shippingFee: number;
  tax: number;
  taxEnabled?: boolean;
  taxRate?: number;
  taxLabel?: string;
  grandTotal: number;
}

export type PaymentOrderStatus =
  | "waiting_payment"
  | "payment_received"
  | "payment_failed"
  | "cancelled";

export interface PaymentOrderRecord {
  id: string;
  orderNumber?: string | null;
  cartId: string;
  companyId: string;
  userId: string;
  items: ValidatedCheckoutCartItem[];
  shippingRateId: string | null;
  calculation: PaymentCalculation;
  status: PaymentOrderStatus;
  quotationId?: string | null;
  processRoute?: OrderProcessRoute;
  processStatus?: OrderProcessStatus;
  replenishmentStatus?: OrderReplenishmentStatus;
  hasCustomization?: boolean;
  customizationType?: OrderCustomizationType;
  processRouteReason?: string | null;
  wooOrderId?: string | null;
  wooOrderNumber?: string | null;
  wooSyncStatus?: WooOrderSyncStatus;
  wooSyncError?: string | null;
  wooSyncedAt?: string | null;
  invoicePdfDocumentId?: string | null;
  invoicePdfGeneratedAt?: string | null;
  /**
   * Legacy aliases kept for Phase 8/17 compatibility. New code should prefer
   * wooOrderId + wooSyncStatus, but older dashboard/admin code still reads
   * these fields.
   */
  woocommerceOrderId?: string | null;
  orderSyncStatus?: "not_synced" | "synced" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCreatePaymentInput {
  paymentId: string;
  orderId: string;
  referenceId: string;
  amount: number;
  currency: "IDR";
  order?: PaymentOrderRecord;
  customer: {
    companyId: string;
    userId: string;
  };
}

export interface ProviderCreatePaymentOutput {
  referenceId: string;
  paymentUrl: string | null;
  providerPaymentId?: string | null;
  providerTransactionId?: string | null;
  paymentQrUrl?: string | null;
  paymentQrDataUrl?: string | null;
  paymentQrString?: string | null;
  paymentMethod?: string | null;
  paymentChannel?: string | null;
  uniqueCode?: number | null;
  expiredAt?: string | null;
  rawResponse: unknown;
}

export interface NormalizedPaymentCallback {
  referenceId: string;
  amount: number;
  providerStatus: string;
  eventId: string;
  providerPaymentId?: string | null;
  providerTransactionId?: string | null;
  paymentMethod?: string | null;
  paymentChannel?: string | null;
  paidAt?: string | null;
  callbackStatus?: string | null;
  rawSafeJson: Record<string, unknown>;
}

export type PaymentEventType =
  | "payment_created"
  | "payment_link_created"
  | "payment_callback_received"
  | "payment_paid"
  | "payment_failed"
  | "payment_expired"
  | "payment_cancelled"
  | "payment_verification_failed"
  | "invoice_regenerated_with_payment";

export interface PaymentEventRecord {
  id: string;
  paymentId: string;
  orderId: string;
  companyId: string;
  provider: PaymentProvider;
  eventType: PaymentEventType;
  oldStatus: PaymentStatus | null;
  newStatus: PaymentStatus | null;
  referenceId: string;
  amount: number;
  metadataJson: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentProviderAdapter {
  readonly name: PaymentProvider;
  createPayment(
    input: ProviderCreatePaymentInput,
  ): Promise<ProviderCreatePaymentOutput>;
  verifyCallbackSignature(payload: unknown, headers: Headers): Promise<boolean>;
  normalizeCallback(payload: unknown): NormalizedPaymentCallback;
  mapProviderStatusToInternalStatus(providerStatus: string): PaymentStatus;
}
