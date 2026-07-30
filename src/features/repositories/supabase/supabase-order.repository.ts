import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
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
      {
        status: input.status,
        payment_status: mapOrderStatusToPaymentStatus(input.status),
        order_json: next,
        updated_at: next.updatedAt,
      },
      { id: input.orderId, company_id: input.companyId },
    );
    return next;
  },

  async updateOrderWooSync(input) {
    const current = await this.getOrderById(input);
    if (!current) return null;
    const next = { ...current, ...input.patch, updatedAt: new Date().toISOString() };
    await getSupabaseAdminClient()?.update(
      "orders",
      {
        order_json: next,
        woo_order_id: next.wooOrderId ?? next.woocommerceOrderId ?? null,
        updated_at: next.updatedAt,
      },
      { id: input.orderId, company_id: input.companyId },
    );
    return next;
  },

  async updateOrderProcess(input) {
    const current = await this.getOrderById(input);
    if (!current) return null;
    const next = { ...current, ...input.patch, updatedAt: new Date().toISOString() };
    const row = {
      order_json: next,
      invoice_pdf_document_id: next.invoicePdfDocumentId ?? null,
      invoice_pdf_generated_at: next.invoicePdfGeneratedAt ?? null,
      updated_at: next.updatedAt,
    };
    try {
      await getSupabaseAdminClient()?.update(
        "orders",
        row,
        { id: input.orderId, company_id: input.companyId },
      );
    } catch (error) {
      if (!isOptionalDocumentColumnError(error)) throw error;
      await getSupabaseAdminClient()?.update(
        "orders",
        removeOptionalDocumentColumns(row),
        { id: input.orderId, company_id: input.companyId },
      );
    }
    return next;
  },
};

function mapOrderStatusToPaymentStatus(status: PaymentOrderRecord["status"]) {
  switch (status) {
    case "payment_received":
      return "paid";
    case "payment_failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "waiting_payment":
    default:
      return "waiting_payment";
  }
}

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
    processRoute: row.process_route
      ? (String(row.process_route) as PaymentOrderRecord["processRoute"])
      : "fulfillment",
    processStatus: row.process_status
      ? (String(row.process_status) as PaymentOrderRecord["processStatus"])
      : "not_started",
    replenishmentStatus: row.replenishment_status
      ? (String(row.replenishment_status) as PaymentOrderRecord["replenishmentStatus"])
      : "not_required",
    hasCustomization: Boolean(row.has_customization),
    customizationType: row.customization_type
      ? (String(row.customization_type) as PaymentOrderRecord["customizationType"])
      : "none",
    wooOrderId: row.woo_order_id ? String(row.woo_order_id) : null,
    wooSyncStatus: row.woo_order_id ? "synced" : "disabled",
    woocommerceOrderId: row.woo_order_id ? String(row.woo_order_id) : null,
    orderSyncStatus: row.woo_order_id ? "synced" : "not_synced",
    createdAt,
    updatedAt: String(row.updated_at ?? createdAt),
  } satisfies PaymentOrderRecord;
}

function isOptionalDocumentColumnError(error: unknown) {
  return (
    error instanceof SupabaseDatabaseError &&
    error.reason === "query_error" &&
    ["PGRST204", "42703"].includes(String(error.code))
  );
}

function removeOptionalDocumentColumns(row: Record<string, unknown>) {
  const next = { ...row };
  delete next.invoice_pdf_document_id;
  delete next.invoice_pdf_generated_at;
  return next;
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
