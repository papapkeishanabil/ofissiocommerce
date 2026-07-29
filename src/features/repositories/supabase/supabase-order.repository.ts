import "server-only";

import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { OrderRepository } from "../repository.types";

export const supabaseOrderRepository: OrderRepository = {
  async saveOrder(input) {
    const client = getSupabaseAdminClient();
    if (!client) return;
    await client.insert("orders", orderToRow(input.paymentOrder));
  },

  async getOrderById(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("orders", {
      filters: { id: input.orderId, company_id: input.companyId },
      limit: 1,
    });
    return (rows[0]?.order_json as PaymentOrderRecord | undefined) ?? null;
  },

  async listOrdersByCompany(companyId) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const rows = await client.select("orders", {
      filters: { company_id: companyId },
      order: "created_at.desc",
    });
    return rows
      .map((row) => row.order_json as PaymentOrderRecord | undefined)
      .filter(Boolean) as PaymentOrderRecord[];
  },

  async updateOrderAfterPayment(input) {
    const current = await this.getOrderById(input);
    if (!current) return null;
    const next = { ...current, status: input.status, updatedAt: new Date().toISOString() };
    await getSupabaseAdminClient()?.update(
      "orders",
      { status: input.status, order_json: next, updated_at: next.updatedAt },
      { id: input.orderId, company_id: input.companyId },
    );
    return next;
  },
};

function orderToRow(order: PaymentOrderRecord) {
  return {
    id: order.id,
    order_number: order.id,
    cart_id: order.cartId,
    company_id: order.companyId,
    user_id: order.userId,
    status: order.status,
    payment_status: "waiting_payment",
    fulfillment_type: order.items[0]?.fulfillmentType ?? "MADE_TO_ORDER",
    transaction_mode: order.items[0]?.transactionMode ?? "HYBRID",
    subtotal: order.calculation.itemSubtotal,
    shipping_total: order.calculation.shippingFee,
    tax_total: order.calculation.tax,
    grand_total: order.calculation.grandTotal,
    order_json: order,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}
