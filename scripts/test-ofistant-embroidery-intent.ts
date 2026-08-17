import assert from "node:assert/strict";

import { detectIntent } from "../src/lib/ofistant/ofistant.intent";

const generic = detectIntent("berapa harga bordir?");
assert.equal(generic.intent, "ASK_EMBROIDERY_PRICE");
assert.deepEqual(generic.requestedEmbroideryZones, []);

const detailed = detectIntent("berapa biaya bordir dada kiri untuk 100 pcs?");
assert.equal(detailed.intent, "ASK_EMBROIDERY_PRICE");
assert.deepEqual(detailed.requestedEmbroideryZones, ["left_chest"]);
assert.equal(detailed.requestedQty, 100);

const configurator = detectIntent("saya ingin upload logo bordir");
assert.equal(configurator.intent, "ASK_3D_CONFIGURATOR");

console.log("Ofistant embroidery intent tests: PASS");
