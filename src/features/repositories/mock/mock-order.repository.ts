import "server-only";

import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type { OrderRepository } from "../repository.types";

type OrderGlobal = typeof globalThis & {
  __ofissioRepositoryOrders?: Map<string, PaymentOrderRecord>;
};

const orderGlobal = globalThis as OrderGlobal;
const orders =
  orderGlobal.__ofissioRepositoryOrders ??
  (orderGlobal.__ofissioRepositoryOrders = new Map<string, PaymentOrderRecord>());

export const mockOrderRepository: OrderRepository = {
  async saveOrder(input) {
    orders.set(input.paymentOrder.id, input.paymentOrder);
  },
  async getOrderById(input) {
    const order = orders.get(input.orderId);
    if (!order || order.companyId !== input.companyId) return null;
    return order;
  },
  async listOrdersByCompany(companyId) {
    return [...orders.values()]
      .filter((order) => order.companyId === companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
  async listAll() {
    return [...orders.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },
  async updateOrderAfterPayment(input) {
    const order = orders.get(input.orderId);
    if (!order || order.companyId !== input.companyId) return null;
    const next = { ...order, status: input.status, updatedAt: new Date().toISOString() };
    orders.set(next.id, next);
    return next;
  },
};
