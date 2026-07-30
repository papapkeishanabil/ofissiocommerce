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
      providerPaymentId: `mock_${input.paymentId}`,
      providerTransactionId: null,
      paymentQrUrl: null,
      paymentQrDataUrl: null,
      paymentQrString: null,
      paymentMethod: "mock",
      paymentChannel: "mock",
      uniqueCode: 0,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
      rawSafeJson: {
        reference_id: data.reference_id,
        amount: data.amount,
        status: data.status,
        transaction_id: data.transaction_id ?? null,
      },
    };
  },

  mapProviderStatusToInternalStatus(providerStatus: string): PaymentStatus {
    return providerStatus === "paid" ? "paid" : "failed";
  },
};
