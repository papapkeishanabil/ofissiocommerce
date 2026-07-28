import "server-only";

import { mapPaymentOrderToWooCommerceOrder } from "../order.mapper";
import type {
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";

export const woocommerceOrderRepository = {
  async createOrder(input: {
    order: PaymentOrderRecord;
    payment: PaymentRecord;
    companyName?: string | null;
    picName?: string | null;
    picWhatsapp?: string | null;
    quotationId?: string | null;
  }) {
    return woocommerceClient.createOrder(mapPaymentOrderToWooCommerceOrder(input));
  },

  async updateOrderStatus(orderId: string | number, status: string) {
    return woocommerceClient.updateOrderStatus(orderId, status);
  },

  async getOrderById(orderId: string | number) {
    return woocommerceClient.getOrderById(orderId);
  },
};
