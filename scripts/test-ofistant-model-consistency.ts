import assert from "node:assert/strict";

import {
  extractCriticalFacts,
  validateGroundedOfistantMessage,
} from "../src/lib/ofistant/ofistant-response-contract";

const trustedEvidence = [
  "Harga bordir Dada Kiri adalah Rp 5.000 per pcs.",
  "Pesanan ORD-260817-001 berjumlah 40 pcs dan selesai 19/08/2026.",
];

const modelVariants = [
  "Biaya bordir Dada Kiri Rp 5.000 per pcs, Pak.",
  "Pak, tarif resmi untuk bordir Dada Kiri adalah Rp5.000 per pcs.",
];

for (const message of modelVariants) {
  assert.equal(validateGroundedOfistantMessage(message, trustedEvidence).ok, true);
}

const inventedPrice = validateGroundedOfistantMessage(
  "Biaya bordirnya Rp 7.500 per pcs.",
  trustedEvidence,
);
assert.equal(inventedPrice.ok, false);
assert.deepEqual(inventedPrice.unsupportedFacts, ["Rp 7.500"]);

const inventedSchedule = validateGroundedOfistantMessage(
  "Pesanan ORD-260817-001 sebanyak 40 pcs selesai 20/08/2026.",
  trustedEvidence,
);
assert.equal(inventedSchedule.ok, false);
assert.ok(inventedSchedule.unsupportedFacts.includes("20/08/2026"));

assert.deepEqual(extractCriticalFacts("Diskon 10% untuk 50 pcs"), ["10%", "50 pcs"]);

console.log("PASS: respons lintas-model memakai fakta yang sama.");
console.log("PASS: harga dan tanggal yang tidak bersumber ditolak.");
