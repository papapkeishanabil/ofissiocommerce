import assert from "node:assert/strict";

import { resolveOrderProcessingInfo } from "../src/features/products/order-processing";

assert.equal(resolveOrderProcessingInfo({ processRoute: "fulfillment", fulfillmentType: "READY_STOCK", leadTimeDays: 14 }).value, "Ready Stock");
assert.equal(resolveOrderProcessingInfo({ processRoute: "fulfillment", fulfillmentType: "READY_STOCK", leadTimeDays: 14, hasEmbroidery: true }).value, "2–4 hari");
assert.deepEqual(
  resolveOrderProcessingInfo({ processRoute: "production", fulfillmentType: "MADE_TO_ORDER", leadTimeDays: 14, hasEmbroidery: true }),
  { kind: "production", label: "Estimasi produksi", value: "14 hari", detail: "Untuk produksi full custom; belum termasuk waktu pengiriman." },
);

console.log("PASS: stok, bordir, dan produksi menggunakan waktu proses yang berbeda.");
