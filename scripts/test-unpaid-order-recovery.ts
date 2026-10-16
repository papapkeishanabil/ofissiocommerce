import assert from "node:assert/strict";
import { repositoryRegistry } from "../src/features/repositories/repository.factory";
import { listCustomerTrackingOrders } from "../src/features/tracking/customer-tracking-orders.service";
import { getDashboardTrackingSnapshot, getOrderTrackingById } from "../src/features/tracking/tracking.service";
import type { PaymentOrderRecord, PaymentRecord } from "../src/features/payment/payment.types";
import { buildTimeline } from "../src/features/tracking/tracking-utils";

const order: PaymentOrderRecord = {
  id: "ord_unpaid-recovery", orderNumber: "OF-UNPAID-RECOVERY", companyId: "recovery-company", userId: "recovery-user", cartId: "cart-recovery",
  status: "waiting_payment", shippingRateId: null, createdAt: "2026-10-16T05:49:33.154Z", updatedAt: "2026-10-16T05:49:33.154Z",
  calculation: { itemSubtotal: 1500000, customizationFee: 0, shippingFee: 40000, tax: 165000, grandTotal: 1705000 },
  items: [{
    productId: "kl-003", source: "woocommerce", sourceId: "003", productSlug: "kemeja-lapangan-kl-003", productName: "Kemeja Lapangan KL-003", sku: "KL-003",
    selectedColor: "Navy", sizeMatrix: { S: 10, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0 }, totalQty: 10,
    priceFrom: 150000, regularPrice: 150000, finalUnitPrice: 150000, quantityTierLabel: null, quantityPricingBasis: "total_order_qty", quantityPricingMode: "fixed_unit_price", quantityTierApplied: false,
    subtotal: 1500000, productSubtotal: 1500000, selectedEmbroideryZones: [], embroideryPricingSnapshot: { enabled: false, mode: "flat_per_piece", zones: [] },
    embroideryLines: [], embroideryTotal: 0, missingEmbroideryPricingZones: [], customizationTotal: 0, finalEstimatedTotal: 1500000,
    moq: 1, fulfillmentType: "READY_STOCK", transactionMode: "DIRECT_PURCHASE", model3dId: "kl003", model3dUrl: "/3d/kl003.glb", customization: null, embroideryPlacements: [],
  }],
};

async function main() {
  // Read-only repository stubs: simulate durable orders with no tracking after a restart.
  repositoryRegistry.orders.listOrdersByCompany = async () => [order, { ...order, id: "foreign", companyId: "other-company" }, { ...order, id: "cancelled", status: "cancelled" }];
  repositoryRegistry.tracking.listTrackingByCompany = async () => [];
  repositoryRegistry.payments.getPaymentByOrderId = async () => null;
  const scope = { companyId: order.companyId, companyName: "Recovery test" };
  const recovered = await listCustomerTrackingOrders(scope);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0]?.orderNumber, order.orderNumber);
  assert.equal(recovered[0]?.paymentStatus, "waiting_payment");
  assert.equal(recovered[0]?.items[0]?.sku, "KL-003");
  assert.equal(getOrderTrackingById(order.id, scope, recovered)?.id, order.id);
  assert.ok(getDashboardTrackingSnapshot(scope, recovered).activeOrders.some((row) => row.id === order.id));
  assert.equal((await listCustomerTrackingOrders(scope)).length, 1, "Repeated reads must not duplicate orders");
  const existing = { ...recovered[0]!, paymentStatus: "paid" as const, currentStageId: "packing" };
  repositoryRegistry.tracking.listTrackingByCompany = async () => [existing];
  assert.equal((await listCustomerTrackingOrders(scope))[0]?.currentStageId, "packing", "Existing production tracking must be preserved");
  repositoryRegistry.tracking.listTrackingByCompany = async () => [];
  repositoryRegistry.payments.getPaymentByOrderId = async () => ({ status: "paid", referenceId: order.orderNumber, paymentPurpose: "full" } as PaymentRecord);
  assert.equal((await listCustomerTrackingOrders(scope))[0]?.paymentStatus, "paid", "A settled payment must not reappear as unpaid");
  assert.deepEqual(await listCustomerTrackingOrders({}), []);
  const readyToShip = { ...recovered[0]!, fulfillmentType: "MADE_TO_ORDER" as const, currentStageId: "ready_to_ship", productionTimeline: buildTimeline("MADE_TO_ORDER", "ready_to_ship") };
  const shippingSnapshot = getDashboardTrackingSnapshot(scope, [readyToShip]);
  assert.ok(shippingSnapshot.activeOrders.some(row => row.id === readyToShip.id), "Production at 100% must stay active until delivery");
  assert.ok(!shippingSnapshot.orderHistory.some(row => row.id === readyToShip.id));
  const deliveredSnapshot = getDashboardTrackingSnapshot(scope, [{ ...readyToShip, currentStageId: "delivered" }]);
  assert.ok(deliveredSnapshot.orderHistory.some(row => row.id === readyToShip.id), "Delivered is the final customer stage");
  console.log("PASS: unpaid persisted orders appear in dashboard/detail; no duplicates, cross-company leaks, or overwritten production progress; paid status preserved.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
