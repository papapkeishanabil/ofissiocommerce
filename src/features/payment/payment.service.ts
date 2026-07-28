import "server-only";

import { randomUUID } from "node:crypto";

import { getValidatedCheckoutCart } from "@/features/checkout/checkout-cart.service";
import {
  syncOrderToWooCommerce,
  syncPaymentStatusToWooCommerce,
} from "@/features/commerce/commerce.service";
import { shippingService } from "@/features/shipping/shipping.service";
import { upsertTrackingFromPaymentOrder } from "@/features/tracking/tracking-payment.integration";

import { getPaymentRuntimeConfig } from "./payment.config";
import {
  findPaymentById,
  findPaymentOrder,
  savePayment,
  updateOrderAfterPayment,
  updatePaymentOrderSync,
  updatePaymentStatus,
} from "./payment.store";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentCalculation,
  PaymentOrderRecord,
  PaymentProviderAdapter,
  PaymentRecord,
} from "./payment.types";
import { createPaymentSchema } from "./payment.validation";
import { ipaymuProvider } from "./providers/ipaymu.provider";
import { mockPaymentProvider } from "./providers/mock-payment.provider";

const TAX_RATE = 0.11;

function activeProvider(): PaymentProviderAdapter {
  return getPaymentRuntimeConfig().provider === "ipaymu"
    ? ipaymuProvider
    : mockPaymentProvider;
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const parsed = createPaymentSchema.parse(input);
  const cart = await getValidatedCheckoutCart(
    parsed.cartId,
    parsed.companyId,
    parsed.userId,
  );

  const shippingRate = parsed.shippingRateId
    ? shippingService.getRateById(parsed.shippingRateId)
    : null;
  if (parsed.shippingRateId && !shippingRate) {
    throw new Error("Pilihan ongkir tidak valid atau sudah kedaluwarsa.");
  }

  const calculation: PaymentCalculation = {
    itemSubtotal: cart.subtotal,
    customizationFee: 0,
    shippingFee: shippingRate?.price ?? 0,
    tax: Math.round(cart.subtotal * TAX_RATE),
    grandTotal: 0,
  };
  calculation.grandTotal =
    calculation.itemSubtotal +
    calculation.customizationFee +
    calculation.shippingFee +
    calculation.tax;

  const provider = activeProvider();
  const now = new Date().toISOString();
  const paymentId = `pay_${randomUUID()}`;
  const orderId = `ord_${randomUUID()}`;
  const referenceId = `OF-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const providerResult = await provider.createPayment({
    paymentId,
    orderId,
    referenceId,
    amount: calculation.grandTotal,
    currency: "IDR",
    customer: {
      companyId: parsed.companyId,
      userId: parsed.userId,
    },
  });

  const order: PaymentOrderRecord = {
    id: orderId,
    cartId: cart.id,
    companyId: cart.companyId,
    userId: cart.userId,
    items: cart.items,
    shippingRateId: parsed.shippingRateId,
    calculation,
    status: "waiting_payment",
    woocommerceOrderId: null,
    orderSyncStatus: "not_synced",
    createdAt: now,
    updatedAt: now,
  };
  const payment: PaymentRecord = {
    id: paymentId,
    orderId,
    companyId: parsed.companyId,
    provider: provider.name,
    referenceId: providerResult.referenceId,
    amount: calculation.grandTotal,
    currency: "IDR",
    status: "waiting_payment",
    paymentUrl: providerResult.paymentUrl,
    rawProviderResponse: providerResult.rawResponse,
    createdAt: now,
    updatedAt: now,
  };
  savePayment(payment, order);
  const sync = await syncOrderToWooCommerce({ order, payment });
  if (sync.provider === "woocommerce" && !sync.skipped) {
    updatePaymentOrderSync(order.id, {
      woocommerceOrderId: sync.externalOrderId ?? null,
      orderSyncStatus: sync.ok ? "synced" : "failed",
    });
  }

  return {
    paymentId,
    orderId,
    paymentUrl: payment.paymentUrl,
    status: "waiting_payment",
    provider: payment.provider,
  };
}

export function getPaymentStatus(paymentId: string) {
  const payment = findPaymentById(paymentId);
  if (!payment) return null;
  const order = findPaymentOrder(payment.orderId);
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    companyId: payment.companyId,
    userId: order?.userId ?? null,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentUrl: payment.paymentUrl,
    orderStatus: order?.status ?? null,
    calculation: order?.calculation ?? null,
    updatedAt: payment.updatedAt,
  };
}

export function completeMockPayment(
  paymentId: string,
  status: "paid" | "failed",
) {
  const payment = findPaymentById(paymentId);
  if (!payment || payment.provider !== "mock") {
    throw new Error("Mock payment tidak ditemukan.");
  }
  if (payment.status === status) {
    const order = findPaymentOrder(payment.orderId);
    const tracking =
      status === "paid" && order
        ? upsertTrackingFromPaymentOrder({ payment, order }).tracking
        : null;
    return { payment, idempotent: true, tracking };
  }
  const updated = updatePaymentStatus(paymentId, status, {
    mode: "mock",
    simulatedStatus: status,
  });
  const order = updateOrderAfterPayment(
    payment.orderId,
    status === "paid" ? "payment_received" : "payment_failed",
  );
  const tracking =
    status === "paid" && updated && order
      ? upsertTrackingFromPaymentOrder({ payment: updated, order }).tracking
      : null;
  void syncPaymentStatusToWooCommerce({
    payment: updated,
    order,
  });
  return { payment: updated!, idempotent: false, tracking };
}
