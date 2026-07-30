import "server-only";

import { mapPaymentOrderToWooCommerceOrder } from "../order.mapper";
import type {
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import type { WooCommerceCreateOrderInput } from "@/features/products/woocommerce/woocommerce.types";

export const woocommerceOrderRepository = {
  async createOrder(input: {
    order: PaymentOrderRecord;
    payment: PaymentRecord;
    companyName?: string | null;
    picName?: string | null;
    picWhatsapp?: string | null;
    quotationId?: string | null;
    payload?: WooCommerceCreateOrderInput;
  }) {
    return woocommerceClient.createOrder(
      input.payload ?? mapPaymentOrderToWooCommerceOrder(input),
    );
  },

  async updateOrderStatus(orderId: string | number, status: string) {
    return woocommerceClient.updateOrderStatus(orderId, status);
  },

  async getOrderById(orderId: string | number) {
    return woocommerceClient.getOrderById(orderId);
  },
};
