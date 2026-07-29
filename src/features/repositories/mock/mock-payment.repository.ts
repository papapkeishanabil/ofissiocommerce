import "server-only";

import type { PaymentOrderRecord, PaymentRecord } from "@/features/payment/payment.types";
import type { PaymentRepository } from "../repository.types";

type PaymentGlobal = typeof globalThis & {
  __ofissioRepositoryPayments?: Map<string, PaymentRecord>;
  __ofissioRepositoryPaymentOrders?: Map<string, PaymentOrderRecord>;
};

const paymentGlobal = globalThis as PaymentGlobal;
const payments =
  paymentGlobal.__ofissioRepositoryPayments ??
  (paymentGlobal.__ofissioRepositoryPayments = new Map<string, PaymentRecord>());
const paymentOrders =
  paymentGlobal.__ofissioRepositoryPaymentOrders ??
  (paymentGlobal.__ofissioRepositoryPaymentOrders = new Map<string, PaymentOrderRecord>());

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
};
