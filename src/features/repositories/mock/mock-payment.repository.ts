import "server-only";

import type {
  PaymentEventRecord,
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import type { PaymentRepository } from "../repository.types";

type PaymentGlobal = typeof globalThis & {
  __ofissioRepositoryPayments?: Map<string, PaymentRecord>;
  __ofissioRepositoryPaymentOrders?: Map<string, PaymentOrderRecord>;
  __ofissioRepositoryPaymentEvents?: Map<string, PaymentEventRecord>;
};

const paymentGlobal = globalThis as PaymentGlobal;
const payments =
  paymentGlobal.__ofissioRepositoryPayments ??
  (paymentGlobal.__ofissioRepositoryPayments = new Map<string, PaymentRecord>());
const paymentOrders =
  paymentGlobal.__ofissioRepositoryPaymentOrders ??
  (paymentGlobal.__ofissioRepositoryPaymentOrders = new Map<string, PaymentOrderRecord>());
const paymentEvents =
  paymentGlobal.__ofissioRepositoryPaymentEvents ??
  (paymentGlobal.__ofissioRepositoryPaymentEvents = new Map<string, PaymentEventRecord>());

export const mockPaymentRepository: PaymentRepository = {
  async savePayment(input) {
    payments.set(input.payment.id, input.payment);
    paymentOrders.set(input.order.id, input.order);
  },
  async getPaymentById(input) {
    const payment = payments.get(input.paymentId);
    if (!payment || payment.companyId !== input.companyId) return null;
    return payment;
  },
  async getPaymentByReference(referenceId) {
    return [...payments.values()].find((payment) => payment.referenceId === referenceId) ?? null;
  },
  async getPaymentByOrderId(input) {
    return (
      [...payments.values()].find(
        (payment) => payment.companyId === input.companyId && payment.orderId === input.orderId,
      ) ?? null
    );
  },
  async listPaymentsByOrder(input) {
    return [...payments.values()].filter(
      (payment) => payment.companyId === input.companyId && payment.orderId === input.orderId,
    );
  },
  async updatePayment(input) {
    const payment = payments.get(input.paymentId);
    if (!payment || payment.companyId !== input.companyId) return null;
    const next = {
      ...payment,
      ...input.patch,
      updatedAt: new Date().toISOString(),
    };
    payments.set(next.id, next);
    return next;
  },
  async updatePaymentStatus(input) {
    const payment = payments.get(input.paymentId);
    if (!payment || payment.companyId !== input.companyId) return null;
    const next = {
      ...payment,
      status: input.status,
      rawProviderResponse:
        input.rawProviderResponse === undefined
          ? payment.rawProviderResponse
          : input.rawProviderResponse,
      updatedAt: new Date().toISOString(),
    };
    payments.set(next.id, next);
    return next;
  },
  async addPaymentEvent(event) {
    paymentEvents.set(event.id, event);
    return event;
  },
  async listPaymentEvents(input) {
    return [...paymentEvents.values()].filter(
      (event) =>
        event.companyId === input.companyId &&
        (!input.paymentId || event.paymentId === input.paymentId) &&
        (!input.orderId || event.orderId === input.orderId),
    );
  },
};
