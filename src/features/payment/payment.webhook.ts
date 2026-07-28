import "server-only";

import { ipaymuProvider } from "./providers/ipaymu.provider";
import { syncPaymentStatusToWooCommerce } from "@/features/commerce/commerce.service";
import { upsertTrackingFromPaymentOrder } from "@/features/tracking/tracking-payment.integration";
import {
  findPaymentByReference,
  findPaymentOrder,
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
  const updatedPayment = updatePaymentStatus(
    payment.id,
    status,
    safeCallbackSnapshot(parsed),
  );
  if (status === "paid") {
    const updatedOrder = updateOrderAfterPayment(
      payment.orderId,
      "payment_received",
    );
    const order = updatedOrder ?? findPaymentOrder(payment.orderId);
    if (updatedPayment && order) {
      upsertTrackingFromPaymentOrder({ payment: updatedPayment, order });
      void syncPaymentStatusToWooCommerce({
        payment: updatedPayment,
        order,
      });
    }
  } else if (status === "failed" || status === "expired") {
    const order = updateOrderAfterPayment(payment.orderId, "payment_failed");
    void syncPaymentStatusToWooCommerce({
      payment: updatedPayment,
      order,
    });
  }
  markPaymentEventProcessed(eventId);
  return { paymentId: payment.id, idempotent: false };
}

function safeCallbackSnapshot(payload: Record<string, unknown>) {
  return {
    reference_id: payload.reference_id,
    amount: payload.amount,
    status: payload.status,
    transaction_id: payload.transaction_id,
  };
}
