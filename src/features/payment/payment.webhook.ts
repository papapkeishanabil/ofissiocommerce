import "server-only";

import { createHash } from "node:crypto";

import { syncPaymentStatusToWooCommerce } from "@/features/commerce/commerce.service";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { upsertTrackingFromPaymentOrderPersisted } from "@/features/tracking/tracking-payment.integration";

import { getPaymentRuntimeConfig } from "./payment.config";
import {
  cachePaymentOrder,
  findPaymentByReferencePersisted,
  findPaymentOrder,
  savePaymentEventOnce,
  updateOrderAfterPaymentPersisted,
  updatePaymentRecordPersisted,
  updatePaymentStatusPersisted,
} from "./payment.store";
import type {
  NormalizedPaymentCallback,
  PaymentEventRecord,
  PaymentEventType,
  PaymentOrderRecord,
  PaymentRecord,
  PaymentStatus,
} from "./payment.types";
import { paymentCallbackSchema } from "./payment.validation";
import { ipaymuProvider } from "./providers/ipaymu.provider";

export interface IpaymuCallbackResult {
  paymentId: string;
  idempotent: boolean;
  status: PaymentStatus;
  manualReview: boolean;
}

export async function processIpaymuCallback(
  payload: unknown,
  headers: Headers,
): Promise<IpaymuCallbackResult> {
  const config = getPaymentRuntimeConfig();
  if (config.requestedProvider !== "ipaymu" || !config.ipaymu.isComplete) {
    throw new Error("Callback iPaymu belum aktif.");
  }

  const parsed = paymentCallbackSchema.parse(payload);
  const signatureValid = await ipaymuProvider.verifyCallbackSignature(parsed, headers);
  if (!signatureValid) throw new Error("Callback tidak valid.");

  const callback = ipaymuProvider.normalizeCallback(parsed);
  const payment = await findPaymentByReferencePersisted(callback.referenceId);
  if (!payment || payment.provider !== "ipaymu") {
    throw new Error("Reference pembayaran tidak ditemukan.");
  }

  const order = await loadPaymentOrder(payment);
  const eventKey = callbackEventKey(callback);
  const targetStatus =
    payment.amount === callback.amount
      ? ipaymuProvider.mapProviderStatusToInternalStatus(callback.providerStatus)
      : "manual_review";
  const callbackEvent = buildPaymentEvent({
    id: `${eventKey}:received`,
    payment,
    eventType: "payment_callback_received",
    newStatus: targetStatus,
    metadataJson: {
      eventKey,
      providerStatus: callback.providerStatus,
      amountMatched: payment.amount === callback.amount,
    },
  });
  const claimed = await savePaymentEventOnce(callbackEvent);
  if (
    payment.status === "paid" ||
    (!claimed.inserted && callbackStateAlreadyApplied(payment, callback, targetStatus))
  ) {
    return {
      paymentId: payment.id,
      idempotent: true,
      status: payment.status,
      manualReview: payment.status === "manual_review",
    };
  }

  if (payment.amount !== callback.amount) {
    const reviewed = await persistCallbackState({
      payment,
      callback,
      status: "manual_review",
    });
    await savePaymentEventOnce(
      buildPaymentEvent({
        id: `${eventKey}:verification`,
        payment: reviewed,
        eventType: "payment_verification_failed",
        oldStatus: payment.status,
        newStatus: "manual_review",
        metadataJson: { eventKey, reason: "amount_mismatch" },
      }),
    );
    return {
      paymentId: payment.id,
      idempotent: false,
      status: "manual_review",
      manualReview: true,
    };
  }

  if (targetStatus === "manual_review") {
    const reviewed = await persistCallbackState({
      payment,
      callback,
      status: "manual_review",
    });
    await savePaymentEventOnce(
      buildPaymentEvent({
        id: `${eventKey}:verification`,
        payment: reviewed,
        eventType: "payment_verification_failed",
        oldStatus: payment.status,
        newStatus: "manual_review",
        metadataJson: { eventKey, reason: "unknown_status" },
      }),
    );
    return {
      paymentId: payment.id,
      idempotent: false,
      status: "manual_review",
      manualReview: true,
    };
  }

  const updatedPayment = await persistCallbackState({
    payment,
    callback,
    status: targetStatus,
  });
  await savePaymentEventOnce(
    buildPaymentEvent({
      id: `${eventKey}:status`,
      payment: updatedPayment,
      eventType: eventTypeForStatus(targetStatus),
      oldStatus: payment.status,
      newStatus: targetStatus,
      metadataJson: { eventKey, providerStatus: callback.providerStatus },
    }),
  );

  if (targetStatus === "paid") {
    const updatedOrder = await updateOrderAfterPaymentPersisted(
      payment.orderId,
      "payment_received",
    );
    if (updatedOrder) {
      await upsertTrackingFromPaymentOrderPersisted({
        payment: updatedPayment,
        order: updatedOrder,
      });
      void syncPaymentStatusToWooCommerce({
        payment: updatedPayment,
        order: updatedOrder,
      });
    }
  } else if (["failed", "expired", "cancelled"].includes(targetStatus)) {
    const updatedOrder = await updateOrderAfterPaymentPersisted(
      payment.orderId,
      "payment_failed",
    );
    void syncPaymentStatusToWooCommerce({
      payment: updatedPayment,
      order: updatedOrder,
    });
  }

  return {
    paymentId: payment.id,
    idempotent: false,
    status: targetStatus,
    manualReview: false,
  };
}

function callbackStateAlreadyApplied(
  payment: PaymentRecord,
  callback: NormalizedPaymentCallback,
  targetStatus: PaymentStatus,
) {
  return (
    payment.status === targetStatus &&
    payment.callbackReference === callback.referenceId &&
    payment.callbackAmount === callback.amount
  );
}

async function loadPaymentOrder(payment: PaymentRecord) {
  const cached = findPaymentOrder(payment.orderId);
  if (cached) return cached;
  const persisted = await repositoryRegistry.orders.getOrderById({
    companyId: payment.companyId,
    orderId: payment.orderId,
  });
  if (!persisted) throw new Error("Order pembayaran tidak ditemukan.");
  return cachePaymentOrder(persisted);
}

async function persistCallbackState(input: {
  payment: PaymentRecord;
  callback: NormalizedPaymentCallback;
  status: PaymentStatus;
}) {
  const statusUpdated = await updatePaymentStatusPersisted(
    input.payment.id,
    input.status,
    input.callback.rawSafeJson,
  );
  if (!statusUpdated) throw new Error("Status pembayaran tidak dapat diperbarui.");
  const now = new Date().toISOString();
  const metadataUpdated = await updatePaymentRecordPersisted(statusUpdated.id, {
    providerPaymentId:
      input.callback.providerPaymentId ?? statusUpdated.providerPaymentId,
    providerTransactionId:
      input.callback.providerTransactionId ?? statusUpdated.providerTransactionId,
    paymentMethod: input.callback.paymentMethod ?? statusUpdated.paymentMethod,
    paymentChannel: input.callback.paymentChannel ?? statusUpdated.paymentChannel,
    callbackReceivedAt: now,
    callbackStatus:
      input.callback.callbackStatus ?? input.callback.providerStatus,
    callbackReference: input.callback.referenceId,
    callbackAmount: input.callback.amount,
    callbackRawSafeJson: input.callback.rawSafeJson,
    paidAt:
      input.status === "paid"
        ? input.callback.paidAt ?? statusUpdated.paidAt ?? now
        : statusUpdated.paidAt,
  });
  return metadataUpdated ?? statusUpdated;
}

function callbackEventKey(callback: NormalizedPaymentCallback) {
  const identity = [
    callback.referenceId,
    callback.eventId,
    callback.providerStatus,
    callback.amount,
  ].join(":");
  return `pevt_ipaymu_${createHash("sha256").update(identity).digest("hex").slice(0, 32)}`;
}

function buildPaymentEvent(input: {
  id: string;
  payment: PaymentRecord;
  eventType: PaymentEventType;
  oldStatus?: PaymentStatus | null;
  newStatus?: PaymentStatus | null;
  metadataJson: Record<string, unknown>;
}): PaymentEventRecord {
  return {
    id: input.id,
    paymentId: input.payment.id,
    orderId: input.payment.orderId,
    companyId: input.payment.companyId,
    provider: input.payment.provider,
    eventType: input.eventType,
    oldStatus: input.oldStatus ?? input.payment.status,
    newStatus: input.newStatus ?? input.payment.status,
    referenceId: input.payment.referenceId,
    amount: input.payment.amount,
    metadataJson: input.metadataJson,
    createdAt: new Date().toISOString(),
  };
}

function eventTypeForStatus(status: PaymentStatus): PaymentEventType {
  if (status === "paid") return "payment_paid";
  if (status === "expired") return "payment_expired";
  if (status === "cancelled") return "payment_cancelled";
  if (status === "failed") return "payment_failed";
  return "payment_callback_received";
}
