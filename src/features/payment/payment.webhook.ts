import "server-only";

import { ipaymuProvider } from "./providers/ipaymu.provider";
import { syncPaymentStatusToWooCommerce } from "@/features/commerce/commerce.service";
import { upsertTrackingFromPaymentOrder } from "@/features/tracking/tracking-payment.integration";
import {
  findPaymentByReferencePersisted,
  findPaymentOrder,
  hasProcessedPaymentEvent,
  markPaymentEventProcessed,
  savePaymentEvent,
  updateOrderAfterPayment,
  updatePaymentRecord,
  updatePaymentStatus,
} from "./payment.store";
import { recordPaymentEvent } from "./payment.service";
import { paymentCallbackSchema } from "./payment.validation";
import type { PaymentEventType, PaymentRecord, PaymentStatus } from "./payment.types";

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
  const payment = await findPaymentByReferencePersisted(callback.referenceId);
  if (!payment || payment.provider !== "ipaymu") {
    throw new Error("Reference pembayaran tidak ditemukan.");
  }
  if (payment.amount !== callback.amount) {
    throw new Error("Nominal callback tidak sesuai.");
  }

  const eventId = `ipaymu:${callback.referenceId}:${callback.eventId}`;
  if (hasProcessedPaymentEvent(eventId) || (payment.status === "paid" && callback.providerStatus)) {
    return { paymentId: payment.id, idempotent: true };
  }

  const status = ipaymuProvider.mapProviderStatusToInternalStatus(
    callback.providerStatus,
  );
  recordCallbackReceived(payment, status, callback.rawSafeJson);
  const previousStatus = payment.status;
  const updatedPayment = updatePaymentStatus(
    payment.id,
    status,
    callback.rawSafeJson,
  );
  if (updatedPayment) {
    updatePaymentRecord(updatedPayment.id, {
      providerPaymentId: callback.providerPaymentId ?? updatedPayment.providerPaymentId,
      providerTransactionId:
        callback.providerTransactionId ?? updatedPayment.providerTransactionId,
      paymentMethod: callback.paymentMethod ?? updatedPayment.paymentMethod,
      paymentChannel: callback.paymentChannel ?? updatedPayment.paymentChannel,
      callbackReceivedAt: new Date().toISOString(),
      callbackStatus: callback.callbackStatus ?? callback.providerStatus,
      callbackReference: callback.referenceId,
      callbackAmount: callback.amount,
      callbackRawSafeJson: callback.rawSafeJson,
      paidAt: status === "paid" ? callback.paidAt ?? new Date().toISOString() : updatedPayment.paidAt,
    });
    recordPaymentEvent(updatedPayment, eventTypeForStatus(status), {
      oldStatus: previousStatus,
      metadataJson: {
        providerStatus: callback.providerStatus,
        eventId,
      },
    });
  }
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

function recordCallbackReceived(
  payment: PaymentRecord,
  status: PaymentStatus,
  metadataJson: Record<string, unknown>,
) {
  savePaymentEvent({
    id: `pevt_ipaymu_${payment.id}_${Date.now()}`,
    paymentId: payment.id,
    orderId: payment.orderId,
    companyId: payment.companyId,
    provider: payment.provider,
    eventType: "payment_callback_received",
    oldStatus: payment.status,
    newStatus: status,
    referenceId: payment.referenceId,
    amount: payment.amount,
    metadataJson,
    createdAt: new Date().toISOString(),
  });
}

function eventTypeForStatus(status: PaymentStatus): PaymentEventType {
  if (status === "paid") return "payment_paid";
  if (status === "expired") return "payment_expired";
  if (status === "cancelled") return "payment_cancelled";
  if (status === "waiting_payment" || status === "pending") return "payment_callback_received";
  return "payment_failed";
}
