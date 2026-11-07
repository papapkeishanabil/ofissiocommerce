import type { PaymentOrderRecord } from "@/features/payment/payment.types";

export function isFullyPaidOrder(order: Pick<PaymentOrderRecord, "status" | "paymentTerms">) {
  return order.status === "payment_received" &&
    (order.paymentTerms?.mode !== "deposit_balance" || order.paymentTerms.balanceStatus === "paid");
}

export interface PaidProductSalesRow {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  orderCount: number;
  paidValue: number;
}

/** Period follows order creation date, using inclusive Jakarta calendar days. */
export function aggregatePaidProductSales(
  orders: PaymentOrderRecord[],
  period?: { from: string; to: string },
) {
  const start = period ? Date.parse(`${period.from}T00:00:00+07:00`) : -Infinity;
  const end = period ? Date.parse(`${period.to}T00:00:00+07:00`) + 86_400_000 : Infinity;
  const rows = new Map<string, PaidProductSalesRow>();
  const seen = new Set<string>();
  for (const order of orders) {
    const time = Date.parse(order.createdAt);
    if (seen.has(order.id) || !isFullyPaidOrder(order) ||
      !Number.isFinite(time) || !(time >= start && time < end)) continue;
    seen.add(order.id);
    const counted = new Set<string>();
    for (const item of order.items ?? []) {
      if (item.source === "custom" || !item.productId ||
        !Number.isSafeInteger(item.totalQty) || item.totalQty <= 0) continue;
      const row = rows.get(item.productId) ?? {
        productId: item.productId, productName: item.productName,
        sku: item.parentSku || item.sku, qty: 0, orderCount: 0, paidValue: 0,
      };
      row.qty += item.totalQty;
      const value = item.productSubtotal ?? item.subtotal;
      if (Number.isFinite(value) && value >= 0) row.paidValue += value;
      if (!counted.has(item.productId)) row.orderCount += 1;
      counted.add(item.productId);
      rows.set(item.productId, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.qty - a.qty || a.productId.localeCompare(b.productId));
}
