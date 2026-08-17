import assert from "node:assert/strict";

import { detectIntent } from "../src/lib/ofistant/ofistant.intent";
import { classifyHandoffDestination } from "../src/lib/ofistant/ofistant-handoff-routing";

// The route performs destination triage after this intent is recognized. The
// generic button phrase must stay generic instead of naming Admin or CS.
const genericHelpRequest = "Saya butuh bantuan tim Ofissio";

const trackingQuestions = [
  "Pesanan saya sudah tahap apa?",
  "Pengiriman sudah sampai mana?",
  "Kapan order saya dikirim?",
  "Kurir apa yang membawa paket saya?",
  "Nomor resinya berapa?",
  "Posisi paket saya sekarang di mana?",
  "Kenapa pesanan saya masih belum sampai dan tidak sesuai target waktu?",
  "Paket saya terlambat, ada kendala apa?",
];

for (const question of trackingQuestions) {
  assert.equal(
    detectIntent(question).intent,
    "ASK_TRACKING",
    `Pertanyaan tracking tidak dikenali: ${question}`,
  );
}

assert.notEqual(
  detectIntent("Saya mencari kemeja kantor warna navy").intent,
  "ASK_TRACKING",
  "Pertanyaan katalog tidak boleh salah dianggap sebagai tracking",
);

assert.equal(
  detectIntent("Ya, teruskan ke CS").intent,
  "ASK_HUMAN",
  "Persetujuan eskalasi harus dikenali sebagai handoff ke CS",
);

for (const handoffRequest of [
  genericHelpRequest,
  "Bantuan Ready Stock/Bordir",
  "Konsultasi Full Custom/Production",
  "full costom",
]) {
  assert.equal(
    detectIntent(handoffRequest).intent,
    "ASK_HUMAN",
    `Pilihan triage tidak dikenali sebagai handoff: ${handoffRequest}`,
  );
}

assert.equal(
  classifyHandoffDestination(genericHelpRequest, "READY_STOCK_WITH_CUSTOMIZATION"),
  null,
  "Tombol bantuan umum harus tetap bertanya meskipun halaman order CUS sedang terbuka",
);
assert.deepEqual(classifyHandoffDestination("Bantuan Ready Stock/Bordir"), {
  destination: "admin",
  category: "catalog_customization",
});
assert.deepEqual(classifyHandoffDestination("Konsultasi Full Custom/Production"), {
  destination: "cs_full_custom",
  category: "full_custom_production",
});
assert.deepEqual(classifyHandoffDestination("full costom"), {
  destination: "cs_full_custom",
  category: "full_custom_production",
});

console.log("PASS: Ofistant mengenali pertanyaan proses pesanan dan shipment secara natural.");
