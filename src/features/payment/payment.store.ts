import "server-only";

import type {
  PaymentOrderRecord,
  PaymentRecord,
  PaymentStatus,
} from "./payment.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";

interface PaymentStoreState {
  payments: Map<string, PaymentRecord>;
  orders: Map<string, PaymentOrderRecord>;
  processedEvents: Set<string>;
}

type PaymentGlobal = typeof globalThis & {
  __ofissioPaymentStore?: PaymentStoreState;
};

const paymentGlobal = globalThis as PaymentGlobal;
const state =
  paymentGlobal.__ofissioPaymentStore ??
  (paymentGlobal.__ofissioPaymentStore = {
    payments: new Map(),
    orders: new Map(),
    processedEvents: new Set(),
  });

export function savePayment(
  payment: PaymentRecord,
  order: PaymentOrderRecord,
) {
  state.payments.set(payment.id, payment);
  state.orders.set(order.id, order);
  void repositoryRegistry.payments.savePayment?.({ payment, order }).catch(() => {
    // Persistence foundation must not break payment mock flow.
  });
  void repositoryRegistry.orders.saveOrder?.({ paymentOrder: order }).catch(() => {
    // Persistence foundation must not break payment mock flow.
  });
}

export function findPaymentById(paymentId: string) {
  return state.payments.get(paymentId);
}

export function findPaymentByReference(referenceId: string) {
  return [...state.payments.values()].find(
    (payment) => payment.referenceId === referenceId,
  );
}

export function findPaymentOrder(orderId: string) {
  return state.orders.get(orderId);
}

export function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  rawProviderResponse?: unknown,
) {
  const payment = state.payments.get(paymentId);
  if (!payment) return undefined;
  const updated: PaymentRecord = {
    ...payment,
    status,
    rawProviderResponse:
      rawProviderResponse === undefined
        ? payment.rawProviderResponse
        : rawProviderResponse,
    updatedAt: new Date().toISOString(),
  };
  state.payments.set(paymentId, updated);
  void repositoryRegistry.payments.updatePaymentStatus?.({
    companyId: updated.companyId,
    paymentId,
    status,
    rawProviderResponse,
  }).catch(() => {
    // Persistence foundation must not break payment status update.
  });
  return updated;
}

export function updateOrderAfterPayment(
  orderId: string,
  status: PaymentOrderRecord["status"],
) {
  const order = state.orders.get(orderId);
  if (!order) return undefined;
  const updated = { ...order, status, updatedAt: new Date().toISOString() };
  state.orders.set(orderId, updated);
  void repositoryRegistry.orders.updateOrderAfterPayment?.({
    companyId: updated.companyId,
    orderId,
    status,
  }).catch(() => {
    // Persistence foundation must not break payment status update.
  });
  return updated;
}

export function updatePaymentOrderSync(
  orderId: string,
  patch: Pick<
    PaymentOrderRecord,
    | "wooOrderId"
    | "wooOrderNumber"
    | "wooSyncStatus"
    | "wooSyncError"
    | "wooSyncedAt"
    | "woocommerceOrderId"
    | "orderSyncStatus"
  >,
) {
  const order = state.orders.get(orderId);
  if (!order) return undefined;
  const updated = { ...order, ...patch, updatedAt: new Date().toISOString() };
  state.orders.set(orderId, updated);
  void repositoryRegistry.orders.updateOrderWooSync?.({
    companyId: updated.companyId,
    orderId,
    patch,
  }).catch(() => {
    // Persistence foundation must not break payment sync flow.
  });
  return updated;
}

export function hasProcessedPaymentEvent(eventId: string) {
  return state.processedEvents.has(eventId);
}

export function markPaymentEventProcessed(eventId: string) {
  state.processedEvents.add(eventId);
}
