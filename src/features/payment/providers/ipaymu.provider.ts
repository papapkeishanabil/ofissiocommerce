import "server-only";

import type {
  NormalizedPaymentCallback,
  PaymentProviderAdapter,
  PaymentStatus,
  ProviderCreatePaymentInput,
} from "../payment.types";

/**
 * Safe iPaymu integration boundary.
 *
 * TODO before enabling live payments:
 * - confirm the exact endpoint and request payload from the merchant's current
 *   official iPaymu documentation;
 * - implement the documented request signature;
 * - confirm callback headers, payload fields, and provider status codes;
 * - add contract tests against the iPaymu sandbox.
 *
 * This intentionally does not guess a live signature or send funds.
 */
export const ipaymuProvider: PaymentProviderAdapter = {
  name: "ipaymu",

  async createPayment(_input: ProviderCreatePaymentInput) {
    throw new Error("iPaymu live belum diaktifkan.");
  },

  async verifyCallbackSignature(_payload: unknown, _headers: Headers) {
    // Fail closed until the official merchant signature contract is wired.
    return false;
  },

  normalizeCallback(_payload: unknown): NormalizedPaymentCallback {
    throw new Error("Normalisasi callback iPaymu belum dikonfigurasi.");
  },

  mapProviderStatusToInternalStatus(_providerStatus: string): PaymentStatus {
    // Never infer a paid state from undocumented provider values.
    return "failed";
  },
};
