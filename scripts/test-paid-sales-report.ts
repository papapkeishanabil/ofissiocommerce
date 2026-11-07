import assert from "node:assert/strict";
import type { PaymentOrderRecord } from "../src/features/payment/payment.types";

async function main() {
  process.env.DATABASE_PROVIDER = "mock";
  process.env.PRODUCT_SOURCE = "mock";
  const { repositoryRegistry } = await import("../src/features/repositories/repository.factory");
  const { productServerService } = await import("../src/features/products/product.server-service");
  const { getSalesReport, salesReportCsv } = await import("../src/features/admin/sales-report.service");
  const template = (await productServerService.getPublishedProducts())[0]!;
  const originalOrders = repositoryRegistry.orders.listAll;
  const originalProducts = productServerService.getPublishedProducts;
  const makeOrder = (id: string, productId: string, qty: number, status: PaymentOrderRecord["status"]): PaymentOrderRecord => ({
    id, companyId: "test-company", userId: "test-user", createdAt: "2026-11-06T17:00:00Z", updatedAt: "2026-11-06T17:00:00Z", status,
    calculation: { grandTotal: 1000 },
    items: [{ productId, sku: productId, productName: productId, source: "woocommerce", totalQty: qty, productSubtotal: 1000 }],
  } as PaymentOrderRecord);
  repositoryRegistry.orders.listAll = async () => [makeOrder("1", "safety", 15, "payment_received"), makeOrder("2", "jacket", 20, "payment_received"), makeOrder("3", "safety", 500, "waiting_payment"), { ...makeOrder("previous", "safety", 25, "payment_received"), createdAt: "2026-11-05T17:00:00Z" }, { ...makeOrder("deposit", "safety", 999, "payment_received"), paymentTerms: { mode: "deposit_balance", balanceStatus: "pending", balanceAmount: 750 } as PaymentOrderRecord["paymentTerms"] }];
  productServerService.getPublishedProducts = async () => [
    { ...template, id: "safety", categorySlugs: ["safety"] },
    { ...template, id: "jacket", categorySlugs: ["jacket"] },
  ];
  try {
    const period = { from: "2026-11-07", to: "2026-11-07" };
    const report = await getSalesReport({ ...period, category: "safety", target: 5000 });
    assert.deepEqual(report.topProducts.map(row => [row.productId, row.qty]), [["safety", 15]]);
    assert.equal(report.summary.orderCount, 4, "Category only filters product rows");
    assert.equal(report.summary.paidCount, 2);
    assert.equal(report.receivableOutstanding.value, 1750, "Only the remaining balance of a paid deposit is receivable");
    assert.equal(report.orders.find(order => order.id === "deposit")?.orderStatus, "deposit_paid");
    assert.equal(report.dashboard.current.paidValue, report.summary.paidValue);
    assert.equal(report.dashboard.previous.paidCount, 1);
    assert.equal(report.dashboard.target?.percent, 40);
    assert.deepEqual(report.dashboard.decliningProducts.map(row => [row.productId, row.difference]), [["safety", -10]]);
    const csv = salesReportCsv(report);
    assert.ok(csv.includes("safety,safety,15,1,1000"));
    assert.ok(!csv.includes("jacket,jacket,20"));
    assert.ok(csv.includes("safety,safety,25,15,-10,-40"));
    assert.ok(csv.includes("Pencapaian target (%),40"));
    await assert.rejects(getSalesReport({ from: "2026-02-30", to: "2026-03-01" }));
    const all = await getSalesReport(period);
    assert.deepEqual(all.topProducts.map(row => row.productId), ["jacket", "safety"]);
    console.log("PASS paid sales report: category scope, paid units, WIB period, matching CSV, unchanged financial summary scope.");
  } finally {
    repositoryRegistry.orders.listAll = originalOrders;
    productServerService.getPublishedProducts = originalProducts;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
