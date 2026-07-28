import "server-only";

import { ipaymuProvider } from "./providers/ipaymu.provider";
import {
  findPaymentByReference,
  hasProcessedPaymentEvent,
  markPaymentEventProcessed,
  updateOrderAfterPayment,
  updatePaymentStatus,
} from "./payment.store";
import { paymentCallbackSchema } from "./payment.validation";

export async function processIpaymuCallback(
  payload: unknown,
  headers: Headers,
) {
  const parsed = paymentCallbackSchema.parse(payload);
  const signatureValid = await ipaymuProvider.verifyCallbackSignature(
    parsed,
    headers,
  );
  if (!signatureValid) throw new Error("Callback tidak valid.");

  const callback = ipaymuProvider.normalizeCallback(parsed);
  const payment = findPaymentByReference(callback.referenceId);
  if (!payment || payment.provider !== "ipaymu") {
    throw new Error("Reference pembayaran tidak ditemukan.");
  }
  if (payment.amount !== callback.amount) {
    throw new Error("Nominal callback tidak sesuai.");
  }

  const eventId = `ipaymu:${callback.referenceId}:${callback.eventId}`;
  if (hasProcessedPaymentEvent(eventId)) {
    return { paymentId: payment.id, idempotent: true };
  }

  const status = ipaymuProvider.mapProviderStatusToInternalStatus(
    callback.providerStatus,
  );
  updatePaymentStatus(payment.id, status, parsed);
  if (status === "paid") {
    updateOrderAfterPayment(payment.orderId, "payment_received");
  } else if (status === "failed" || status === "expired") {
    updateOrderAfterPayment(payment.orderId, "payment_failed");
  }
  markPaymentEventProcessed(eventId);
  return { paymentId: payment.id, idempotent: false };
}
