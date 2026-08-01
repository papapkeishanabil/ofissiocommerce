import assert from "node:assert/strict";

import { mapPaymentStatusToWooCommerceStatus } from "../src/features/orders/order.mapper";

assert.equal(mapPaymentStatusToWooCommerceStatus("waiting_payment"), "pending");
assert.equal(mapPaymentStatusToWooCommerceStatus("pending"), "pending");
assert.equal(mapPaymentStatusToWooCommerceStatus("expired"), "pending");
assert.equal(mapPaymentStatusToWooCommerceStatus("paid"), "processing");
assert.equal(mapPaymentStatusToWooCommerceStatus("failed"), "failed");
assert.equal(mapPaymentStatusToWooCommerceStatus("cancelled"), "cancelled");
assert.equal(mapPaymentStatusToWooCommerceStatus("refunded"), "refunded");

console.log("WooCommerce order sync mapping tests: PASS");
console.log("- unpaid/waiting payment -> pending");
console.log("- paid -> processing");
