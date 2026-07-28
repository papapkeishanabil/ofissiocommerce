import "server-only";

import type {
  NormalizedPaymentCallback,
  PaymentProviderAdapter,
  PaymentStatus,
  ProviderCreatePaymentInput,
} from "../payment.types";

export const mockPaymentProvider: PaymentProviderAdapter = {
  name: "mock",

  async createPayment(input: ProviderCreatePaymentInput) {
    return {
      referenceId: input.referenceId,
      paymentUrl: `/payment/mock/success?paymentId=${encodeURIComponent(input.paymentId)}`,
      rawResponse: {
        mode: "mock",
        referenceId: input.referenceId,
        amount: input.amount,
      },
    };
  },

  async verifyCallbackSignature() {
    return true;
  },

  normalizeCallback(payload: unknown): NormalizedPaymentCallback {
    const data = payload as {
      reference_id: string;
      amount: number;
      status: string;
      transaction_id?: string;
    };
    return {
      referenceId: data.reference_id,
      amount: data.amount,
      providerStatus: data.status,
      eventId:
        data.transaction_id ??
        `${data.reference_id}:${data.status}:${data.amount}`,
    };
  },

  mapProviderStatusToInternalStatus(providerStatus: string): PaymentStatus {
    return providerStatus === "paid" ? "paid" : "failed";
  },
};
