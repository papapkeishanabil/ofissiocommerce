import assert from "node:assert/strict";
import { buildSalesDashboard, previousSalesPeriod, salesPeriodRange, parseSalesTarget } from "../src/features/admin/sales-dashboard";
import type { PaymentOrderRecord } from "../src/features/payment/payment.types";

const order = (id: string, createdAt: string, value: number, productId: string, qty: number, status = "payment_received") => ({
  id, createdAt, status, calculation: { grandTotal: value },
  items: [{ productId, productName: productId, sku: productId, source: "woocommerce", totalQty: qty, productSubtotal: value }],
} as PaymentOrderRecord);
const period = { from: "2026-11-07", to: "2026-11-07" };
const rows = [
  order("previous", "2026-11-05T17:00:00Z", 1000, "safety", 20),
  order("previous-disappeared", "2026-11-06T16:59:59Z", 500, "jacket", 10),
  order("current", "2026-11-06T17:00:00Z", 600, "safety", 5),
  order("unpaid", "2026-11-06T17:00:00Z", 9999, "safety", 1000, "waiting_payment"),
  order("outside", "2026-11-07T17:00:00Z", 9999, "safety", 1000),
];
const result = buildSalesDashboard([...rows, rows[2]!], period, { target: 1000 });
const deposit = { ...rows[2]!, id: "deposit", paymentTerms: { mode: "deposit_balance", balanceStatus: "due" } as PaymentOrderRecord["paymentTerms"] };
assert.equal(buildSalesDashboard([deposit], period).current.paidValue, 0);
assert.equal(buildSalesDashboard([deposit], period).current.paidUnits, 0);
assert.deepEqual(result.previousPeriod, { from: "2026-11-06", to: "2026-11-06" });
assert.equal(result.current.paidCount, 1);
assert.equal(result.current.averageOrderValue, 600);
assert.equal(result.previous.averageOrderValue, 750);
assert.equal(result.revenueChange.percent, -60);
assert.equal(result.averageOrderChange?.percent, -20);
assert.equal(result.target?.percent, 60);
assert.equal(result.target?.remaining, 400);
assert.deepEqual(result.decliningProducts.map(row => [row.productId, row.currentQty, row.difference]), [["safety", 5, -15], ["jacket", 0, -10]]);
const filtered = buildSalesDashboard(rows, period, { categoryProductIds: new Set(["jacket"]) });
assert.deepEqual(filtered.decliningProducts.map(row => row.productId), ["jacket"]);
assert.equal(filtered.current.paidValue, 600, "Financial metrics remain across all categories");
const empty = buildSalesDashboard([], period);
assert.equal(empty.current.averageOrderValue, null);
assert.equal(empty.averageOrderChange, null);
assert.equal(empty.revenueChange.percent, null);
assert.equal(empty.target, null);
assert.equal(buildSalesDashboard([rows[2]!], period).revenueChange.percent, null);
assert.equal(buildSalesDashboard(rows, period, { target: 100 }).target?.remaining, 0);
assert.deepEqual(previousSalesPeriod({ from: "2026-01-01", to: "2026-01-07" }), { from: "2025-12-25", to: "2025-12-31" });
assert.deepEqual(previousSalesPeriod({ from: "2024-03-01", to: "2024-03-01" }), { from: "2024-02-29", to: "2024-02-29" });
for (const invalid of [{ from: "2026-02-30", to: "2026-03-01" }, { from: "2026-11-08", to: "2026-11-07" }]) {
  assert.equal(salesPeriodRange(invalid), null);
  assert.throws(() => buildSalesDashboard([], invalid));
}
assert.equal(parseSalesTarget("50000000"), 50_000_000);
assert.equal(parseSalesTarget(""), undefined);
for (const invalid of ["0", "-5", "1e9", "1.5", "NaN", "9007199254740992"]) assert.throws(() => parseSalesTarget(invalid));
console.log("PASS sales dashboard: equal-length previous periods, WIB boundaries, leap year, zero baseline, paid AOV, disappearing products, category scope, targets, duplicates, invalid dates.");
