import "server-only";

import { shippingService } from "@/features/shipping/shipping.service";
import type {
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";

import { mapPaymentOrderToTracking } from "./tracking.service";
import {
  findTrackingOrder,
  upsertTrackingOrder,
  upsertTrackingOrderPersisted,
} from "./tracking.server-store";
import type { CustomerTrackingOrder } from "./tracking.types";

export function createTrackingFromPaidOrder(input: {
  payment: PaymentRecord;
  order: PaymentOrderRecord;
  companyName?: string | null;
}): { tracking: CustomerTrackingOrder; created: boolean } {
  return upsertTrackingFromPaymentOrder(input);
}

export function upsertTrackingFromPaymentOrder(input: {
  payment: PaymentRecord;
  order: PaymentOrderRecord;
  companyName?: string | null;
}): { tracking: CustomerTrackingOrder; created: boolean } {
  const selectedShippingRate = input.order.shippingRateId
    ? shippingService.getRateById(input.order.shippingRateId)
    : null;
  const tracking = mapPaymentOrderToTracking({
    order: input.order,
    paymentStatus:
      input.payment.status === "paid"
        ? "paid"
        : input.payment.status === "failed"
          ? "failed"
          : "waiting_payment",
    paymentReferenceId: input.payment.referenceId,
    selectedShippingRate,
    companyName: input.companyName,
  });
  const result = upsertTrackingOrder(tracking);
  return { tracking: result.order, created: result.created };
}

export async function upsertTrackingFromPaymentOrderPersisted(input: {
  payment: PaymentRecord;
  order: PaymentOrderRecord;
  companyName?: string | null;
}): Promise<{ tracking: CustomerTrackingOrder; created: boolean }> {
  const selectedShippingRate = input.order.shippingRateId
    ? shippingService.getRateById(input.order.shippingRateId)
    : null;
  const tracking = mapPaymentOrderToTracking({
    order: input.order,
    paymentStatus:
      input.payment.status === "paid"
        ? "paid"
        : input.payment.status === "failed"
          ? "failed"
          : "waiting_payment",
    paymentReferenceId: input.payment.referenceId,
    selectedShippingRate,
    companyName: input.companyName,
  });
  const result = await upsertTrackingOrderPersisted(tracking);
  return { tracking: result.order, created: result.created };
}

export function getTrackingFromPaymentOrder(orderId: string) {
  return findTrackingOrder(orderId);
}
