import "server-only";

import type {
  PaymentEventRecord,
  PaymentOrderRecord,
  PaymentRecord,
  PaymentStatus,
} from "./payment.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";

interface PaymentStoreState {
  payments: Map<string, PaymentRecord>;
  orders: Map<string, PaymentOrderRecord>;
  processedEvents: Set<string>;
  events: Map<string, PaymentEventRecord>;
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
    events: new Map(),
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

export async function findPaymentByIdPersisted(input: {
  companyId: string;
  paymentId: string;
}) {
  const cached = state.payments.get(input.paymentId);
  if (cached?.companyId === input.companyId) return cached;
  const persisted = await repositoryRegistry.payments.getPaymentById(input);
  if (persisted) state.payments.set(persisted.id, persisted);
  return persisted;
}

export function findPaymentByReference(referenceId: string) {
  return [...state.payments.values()].find(
    (payment) => payment.referenceId === referenceId,
  );
}

export async function findPaymentByReferencePersisted(referenceId: string) {
  const cached = findPaymentByReference(referenceId);
  if (cached) return cached;
  const persisted = await repositoryRegistry.payments.getPaymentByReference(referenceId);
  if (persisted) state.payments.set(persisted.id, persisted);
  return persisted;
}

export function findPaymentOrder(orderId: string) {
  return state.orders.get(orderId);
}

export function cachePaymentOrder(order: PaymentOrderRecord) {
  state.orders.set(order.id, order);
  return order;
}

export async function findPaymentByOrderPersisted(input: {
  companyId: string;
  orderId: string;
}) {
  const cached = [...state.payments.values()].find(
    (payment) => payment.companyId === input.companyId && payment.orderId === input.orderId,
  );
  if (cached) return cached;
  const persisted = await repositoryRegistry.payments.getPaymentByOrderId?.(input);
  if (persisted) state.payments.set(persisted.id, persisted);
  return persisted ?? null;
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
    paidAt: status === "paid" ? payment.paidAt ?? new Date().toISOString() : payment.paidAt,
    failedAt:
      status === "failed" ? payment.failedAt ?? new Date().toISOString() : payment.failedAt,
    cancelledAt:
      status === "cancelled"
        ? payment.cancelledAt ?? new Date().toISOString()
        : payment.cancelledAt,
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

export function updatePaymentRecord(
  paymentId: string,
  patch: Partial<PaymentRecord>,
) {
  const payment = state.payments.get(paymentId);
  if (!payment) return undefined;
  const updated: PaymentRecord = {
    ...payment,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  state.payments.set(paymentId, updated);
  void repositoryRegistry.payments.updatePayment?.({
    companyId: updated.companyId,
    paymentId,
    patch: updated,
  }).catch(() => {
    // Persistence foundation must not break payment flow.
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

export function savePaymentEvent(event: PaymentEventRecord) {
  state.events.set(event.id, event);
  void repositoryRegistry.payments.addPaymentEvent?.(event).catch(() => {
    // Event persistence must not break payment status changes.
  });
  return event;
}

export async function listPaymentEvents(input: {
  companyId: string;
  paymentId?: string;
  orderId?: string;
}) {
  const cached = [...state.events.values()].filter(
    (event) =>
      event.companyId === input.companyId &&
      (!input.paymentId || event.paymentId === input.paymentId) &&
      (!input.orderId || event.orderId === input.orderId),
  );
  const persisted = await repositoryRegistry.payments.listPaymentEvents?.(input).catch(() => []);
  const merged = new Map<string, PaymentEventRecord>();
  cached.forEach((event) => merged.set(event.id, event));
  (persisted ?? []).forEach((event) => merged.set(event.id, event));
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
