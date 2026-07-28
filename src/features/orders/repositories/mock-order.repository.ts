import "server-only";

import { findPaymentOrder } from "@/features/payment/payment.store";

export const mockOrderRepository = {
  getOrderById: findPaymentOrder,
};
