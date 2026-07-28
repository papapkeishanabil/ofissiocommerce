import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";

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
  amount: number;
  currency: "IDR";
  status: PaymentStatus;
  paymentUrl: string | null;
  rawProviderResponse: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  cartId: string;
  companyId: string;
  userId: string;
  shippingRateId: string | null;
}

export interface CreatePaymentResult {
  paymentId: string;
  orderId: string;
  paymentUrl: string | null;
  status: "waiting_payment";
  provider: PaymentProvider;
}

export interface PaymentCalculation {
  itemSubtotal: number;
  customizationFee: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
}

export type PaymentOrderStatus =
  | "waiting_payment"
  | "payment_received"
  | "payment_failed"
  | "cancelled";

export interface PaymentOrderRecord {
  id: string;
  cartId: string;
  companyId: string;
  userId: string;
  items: ValidatedCheckoutCartItem[];
  shippingRateId: string | null;
  calculation: PaymentCalculation;
  status: PaymentOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCreatePaymentInput {
  paymentId: string;
  orderId: string;
  referenceId: string;
  amount: number;
  currency: "IDR";
  customer: {
    companyId: string;
    userId: string;
  };
}

export interface ProviderCreatePaymentOutput {
  referenceId: string;
  paymentUrl: string | null;
  rawResponse: unknown;
}

export interface NormalizedPaymentCallback {
  referenceId: string;
  amount: number;
  providerStatus: string;
  eventId: string;
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
