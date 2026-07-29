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

  async listAll() {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const rows = await client.select("orders", {
      order: "created_at.desc",
    });
    return rows.map(rowToOrder).filter(Boolean) as PaymentOrderRecord[];
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

function rowToOrder(row: Record<string, unknown>) {
  if (row.order_json && typeof row.order_json === "object") {
    return row.order_json as PaymentOrderRecord;
  }
  if (!row.id || !row.company_id || !row.user_id) return null;
  const createdAt = String(row.created_at ?? new Date().toISOString());
  return {
    id: String(row.id),
    cartId: String(row.cart_id ?? ""),
    companyId: String(row.company_id),
    userId: String(row.user_id),
    items: [],
    shippingRateId: null,
    calculation: {
      itemSubtotal: Number(row.subtotal ?? 0),
      customizationFee: 0,
      shippingFee: Number(row.shipping_total ?? 0),
      tax: Number(row.tax_total ?? 0),
      grandTotal: Number(row.grand_total ?? 0),
    },
    status: String(row.status ?? "waiting_payment") as PaymentOrderRecord["status"],
    woocommerceOrderId: row.woo_order_id ? String(row.woo_order_id) : null,
    orderSyncStatus: "not_synced",
    createdAt,
    updatedAt: String(row.updated_at ?? createdAt),
  } satisfies PaymentOrderRecord;
}

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
