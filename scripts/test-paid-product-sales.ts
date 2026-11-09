import assert from "node:assert/strict";
import { aggregatePaidProductSales, isFullyPaidOrder } from "../src/features/products/paid-product-sales";
import type { PaymentOrderRecord } from "../src/features/payment/payment.types";

type Item = PaymentOrderRecord["items"][number];
const item = (productId: string, qty: number, price = 100): Item => ({
  productId, totalQty: qty, productName: productId, sku: `${productId}-blue`,
  parentSku: productId, source: "woocommerce", productSubtotal: price,
} as Item);
const order = (id: string, status: PaymentOrderRecord["status"], items: Item[], createdAt = "2026-11-06T17:00:00Z") =>
  ({ id, status, items, createdAt } as PaymentOrderRecord);
const paid = order("paid", "payment_received", [item("safety", 10), item("safety", 5), item("jacket", 1, 99999)]);
const orders = [paid, paid,
  order("unpaid", "waiting_payment", [item("jacket", 500)]),
  order("cancelled", "cancelled", [item("jacket", 500)]),
  order("failed", "payment_failed", [item("jacket", 500)]),
  order("before", "payment_received", [item("jacket", 500)], "2026-11-06T16:59:59Z"),
  order("after", "payment_received", [item("jacket", 500)], "2026-11-07T17:00:00Z"),
  order("invalid", "payment_received", [{ ...item("custom", 500), source: "custom" }, item("bad", -5), item("fraction", 0.5)]),
];
const rows = aggregatePaidProductSales(orders, { from: "2026-11-07", to: "2026-11-07" });
const deposit = { ...paid, paymentTerms: { mode: "deposit_balance", balanceStatus: "pending" } as PaymentOrderRecord["paymentTerms"] };
assert.equal(isFullyPaidOrder(deposit), false);
assert.equal(aggregatePaidProductSales([deposit]).length, 0);
assert.equal(isFullyPaidOrder({ ...deposit, paymentTerms: { ...deposit.paymentTerms!, balanceStatus: "paid" } }), true);
assert.deepEqual(rows.map(row => [row.productId, row.qty, row.orderCount]), [["safety", 15, 1], ["jacket", 1, 1]]);
assert.equal(rows[0]?.paidValue, 200);
assert.equal(rows[0]?.sku, "safety");
assert.equal(aggregatePaidProductSales(orders, { from: "2026-11-08", to: "2026-11-07" }).length, 0);
assert.equal(aggregatePaidProductSales(orders)[0]?.productId, "jacket");
console.log("PASS paid product sales: paid-only units, parent product grouping, duplicate protection, WIB boundaries, quantity validation, custom exclusion, unit ranking.");
