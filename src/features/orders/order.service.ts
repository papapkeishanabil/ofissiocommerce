import "server-only";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import type { CommerceSyncResult } from "@/features/commerce/commerce.types";
import { logAuditEvent } from "@/lib/security/audit-log";

import { mapPaymentStatusToWooCommerceStatus } from "./order.mapper";
import { woocommerceOrderRepository } from "./repositories/woocommerce-order.repository";
import type {
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";

export async function syncOrderToWooCommerce(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord;
  request?: Request;
}): Promise<CommerceSyncResult> {
  const config = getCommerceRuntimeConfig();
  if (!config.woocommerce.enabled || !config.woocommerce.syncOrders) {
    return {
      ok: true,
      skipped: true,
      provider: "mock",
      message: "WooCommerce order sync tidak aktif.",
    };
  }

  try {
    const wooOrder = await woocommerceOrderRepository.createOrder(input);
    logAuditEvent({
      request: input.request,
      actorId: input.order.userId,
      actorType: "customer",
      companyId: input.order.companyId,
      action: "woocommerce_order_created",
      entityType: "order",
      entityId: input.order.id,
      metadata: { woocommerceOrderId: wooOrder.id },
    });
    return {
      ok: true,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: String(wooOrder.id),
      message: "Order berhasil disinkronkan ke WooCommerce.",
    };
  } catch (error) {
    logAuditEvent({
      request: input.request,
      actorId: input.order.userId,
      actorType: "customer",
      companyId: input.order.companyId,
      action: "woocommerce_order_sync_failed",
      entityType: "order",
      entityId: input.order.id,
      metadata: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
    return {
      ok: false,
      skipped: false,
      provider: "woocommerce",
      message: "Order belum berhasil disinkronkan ke WooCommerce.",
    };
  }
}

export async function syncPaymentStatusToWooCommerce(input: {
  order: PaymentOrderRecord | undefined;
  payment: PaymentRecord | undefined;
  request?: Request;
}): Promise<CommerceSyncResult> {
  const config = getCommerceRuntimeConfig();
  const order = input.order;
  const payment = input.payment;
  if (
    !config.woocommerce.enabled ||
    !config.woocommerce.syncOrders ||
    !order?.woocommerceOrderId ||
    !payment
  ) {
    return {
      ok: true,
      skipped: true,
      provider: "mock",
      message: "WooCommerce payment status sync tidak aktif.",
    };
  }

  try {
    const status = mapPaymentStatusToWooCommerceStatus(payment.status);
    await woocommerceOrderRepository.updateOrderStatus(
      order.woocommerceOrderId,
      status,
    );
    logAuditEvent({
      request: input.request,
      actorId: order.userId,
      actorType: "customer",
      companyId: order.companyId,
      action: "woocommerce_payment_status_synced",
      entityType: "order",
      entityId: order.id,
      metadata: { woocommerceOrderId: order.woocommerceOrderId, status },
    });
    return {
      ok: true,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: order.woocommerceOrderId,
      message: "Status payment tersinkron ke WooCommerce.",
    };
  } catch (error) {
    logAuditEvent({
      request: input.request,
      actorId: order.userId,
      actorType: "customer",
      companyId: order.companyId,
      action: "woocommerce_payment_status_sync_failed",
      entityType: "order",
      entityId: order.id,
      metadata: {
        woocommerceOrderId: order.woocommerceOrderId,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
    return {
      ok: false,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: order.woocommerceOrderId,
      message: "Status payment belum berhasil disinkronkan ke WooCommerce.",
    };
  }
}
