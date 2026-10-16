import "server-only";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { listTrackingOrders } from "./tracking.server-store";
import { mapPaymentOrderToTracking, type TrackingScope } from "./tracking.service";
import type { CustomerTrackingOrder, TrackingPaymentStatus } from "./tracking.types";

/** Checkout orders exist before production tracking is created, including unpaid orders. */
export async function listCustomerTrackingOrders(scope: TrackingScope): Promise<CustomerTrackingOrder[]> {
  if (!scope.companyId) return [];
  const companyId = scope.companyId;
  const [tracking, orders] = await Promise.all([
    repositoryRegistry.tracking.listTrackingByCompany(companyId),
    repositoryRegistry.orders.listOrdersByCompany(companyId),
  ]);
  const merged = new Map<string, CustomerTrackingOrder>();
  for (const order of [...tracking, ...listTrackingOrders(companyId)]) {
    if (order.companyId === companyId && !merged.has(order.id)) merged.set(order.id, order);
  }
  const missing = orders.filter((order) =>
    order.companyId === companyId && order.status !== "cancelled" && !merged.has(order.id),
  );
  const recovered = await Promise.all(missing.map(async (order) => {
    const payment = await repositoryRegistry.payments.getPaymentByOrderId?.({ companyId, orderId: order.id });
    let paymentStatus: TrackingPaymentStatus = order.status === "payment_received"
      ? "paid" : order.status === "payment_failed" ? "failed" : "waiting_payment";
    if (payment?.status === "paid") {
      paymentStatus = order.paymentTerms?.mode === "deposit_balance" && payment.paymentPurpose !== "balance"
        ? "deposit_paid" : "paid";
    }
    return mapPaymentOrderToTracking({
      order,
      paymentStatus,
      paymentReferenceId: payment?.referenceId || order.orderNumber,
      selectedShippingRate: order.selectedShippingRate,
      companyName: scope.companyName,
    });
  }));
  for (const order of recovered) merged.set(order.id, order);
  return [...merged.values()];
}
