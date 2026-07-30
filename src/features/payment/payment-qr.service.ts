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
  if (normalized.value) return normalized;
  const fromPaymentUrl = createQrDataUrlFromPaymentUrl(payment.paymentUrl);
  if (fromPaymentUrl) {
    return {
      value: fromPaymentUrl,
      kind: "data_url",
      renderableInPdf: false,
    };
  }
  if (payment.paymentUrl) {
    return {
      value: payment.paymentUrl,
      kind: "payment_url",
      renderableInPdf: false,
    };
  }
  return emptyQr();
}

export function normalizeProviderQrData(payment: PaymentRecord): PaymentQrForInvoice {
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
  if (payment.paymentQrString) {
    return {
      value: payment.paymentQrString,
      kind: "string",
      renderableInPdf: false,
    };
  }
  return emptyQr();
}

export function hasPaymentQr(payment: PaymentRecord | null) {
  return getPaymentQrForInvoice(payment).kind !== "none";
}

/**
 * Phase 23 intentionally does not generate a fake scannable QR. The current
 * PDF renderer cannot embed image streams yet, so a real QR dependency/renderer
 * should be added in a focused follow-up once iPaymu sandbox payloads are known.
 */
export function createQrDataUrlFromPaymentUrl(_paymentUrl: string | null) {
  return null;
}

function emptyQr(): PaymentQrForInvoice {
  return { value: null, kind: "none", renderableInPdf: false };
}
