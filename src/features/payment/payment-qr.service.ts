import "server-only";

import type { PaymentRecord } from "./payment.types";

export interface PaymentQrForInvoice {
  value: string | null;
  kind: "data_url" | "url" | "string" | "payment_url" | "none";
  renderableInPdf: boolean;
}

export function getPaymentQrForInvoice(payment: PaymentRecord | null): PaymentQrForInvoice {
  if (!payment) return emptyQr();
  const normalized = normalizeProviderQrData(payment);
  if (normalized.kind === "string") return normalized;
  const fromPaymentUrl = createQrPayloadFromPaymentUrl(payment.paymentUrl);
  if (fromPaymentUrl) {
    return {
      value: fromPaymentUrl,
      kind: "payment_url",
      renderableInPdf: true,
    };
  }
  if (normalized.value) return normalized;
  return emptyQr();
}

export function normalizeProviderQrData(payment: PaymentRecord): PaymentQrForInvoice {
  if (payment.paymentQrString) {
    return {
      value: payment.paymentQrString,
      kind: "string",
      renderableInPdf: true,
    };
  }
  if (payment.paymentQrDataUrl) {
    return {
      value: payment.paymentQrDataUrl,
      kind: "data_url",
      renderableInPdf: false,
    };
  }
  if (payment.paymentQrUrl) {
    return {
      value: payment.paymentQrUrl,
      kind: "url",
      renderableInPdf: false,
    };
  }
  return emptyQr();
}

export function hasPaymentQr(payment: PaymentRecord | null) {
  return getPaymentQrForInvoice(payment).kind !== "none";
}

export function createQrPayloadFromPaymentUrl(paymentUrl: string | null) {
  const value = paymentUrl?.trim();
  return value || null;
}

function emptyQr(): PaymentQrForInvoice {
  return { value: null, kind: "none", renderableInPdf: false };
}
