// Unit checks for the shared MOQ rule helpers (client + server contracts).
// Run: npm run test:moq-rules
import assert from "node:assert/strict";

import { moqSizeSpread, sumSizeMatrix } from "../src/types/cart";
import {
  hasBordirKeyword,
  hasEmbroideryRequest,
  resolveLineMoqIssue,
} from "../src/features/products/moq-rules";
import {
  DEFAULT_MOQ_SETTINGS,
  normalizeMoqSettings,
} from "../src/features/moq-settings/moq-settings.types";

// --- resolveLineMoqIssue -------------------------------------------------

// Ready stock: product moq 1, single piece, no embroidery → pass.
assert.equal(
  resolveLineMoqIssue({
    productMoq: 1,
    totalQty: 1,
    hasEmbroidery: false,
    embroideryMoq: DEFAULT_MOQ_SETTINGS.embroidery,
  }),
  null,
);

// Product MOQ unmet (no embroidery) → PRODUCT_MOQ with shortfall.
assert.deepEqual(
  resolveLineMoqIssue({
    productMoq: 12,
    totalQty: 11,
    hasEmbroidery: false,
    embroideryMoq: 8,
  }),
  {
    code: "PRODUCT_MOQ",
    reason: "MOQ 12 pcs belum terpenuhi (saat ini 11).",
    requiredQty: 12,
    shortfall: 1,
  },
);

// Embroidery floor above product moq and unmet → EMBROIDERY_MOQ.
assert.deepEqual(
  resolveLineMoqIssue({
    productMoq: 1,
    totalQty: 7,
    hasEmbroidery: true,
    embroideryMoq: 8,
  }),
  {
    code: "EMBROIDERY_MOQ",
    reason:
      "Bordir memerlukan minimal 8 pcs (saat ini 7). Hapus bordir atau tambahkan jumlah.",
    requiredQty: 8,
    shortfall: 1,
  },
);

// Product MOQ dominates when it is above the embroidery floor.
const productMoqDominant = resolveLineMoqIssue({
  productMoq: 20,
  totalQty: 5,
  hasEmbroidery: true,
  embroideryMoq: 8,
});
assert.equal(productMoqDominant?.code, "PRODUCT_MOQ");
assert.equal(productMoqDominant?.requiredQty, 20);
assert.equal(productMoqDominant?.shortfall, 15);

// Embroidery at the floor passes.
assert.equal(
  resolveLineMoqIssue({
    productMoq: 20,
    totalQty: 25,
    hasEmbroidery: true,
    embroideryMoq: 8,
  }),
  null,
);

// Exactly at each boundary passes.
assert.equal(
  resolveLineMoqIssue({
    productMoq: 8,
    totalQty: 8,
    hasEmbroidery: true,
    embroideryMoq: 8,
  }),
  null,
);

// --- bordir keyword detection ---------------------------------------------

assert.equal(hasBordirKeyword("Bordir logo dada kiri"), true);
assert.equal(hasBordirKeyword("embroidery left chest"), true);
assert.equal(hasBordirKeyword("sablon logo depan"), false);
assert.equal(hasBordirKeyword("logo perusahaan di punggung"), false);
assert.equal(hasBordirKeyword(""), false);
assert.equal(hasBordirKeyword(null), false);
assert.equal(hasBordirKeyword(undefined), false);

// 3D placements alone trigger embroidery; keyword alone also does.
assert.equal(
  hasEmbroideryRequest({
    embroideryPlacements: [{ zone: "left_chest" }],
    customization: null,
  }),
  true,
);
assert.equal(
  hasEmbroideryRequest({
    embroideryPlacements: [],
    customization: "tolong bordir nama",
  }),
  true,
);
assert.equal(
  hasEmbroideryRequest({
    embroideryPlacements: [],
    customization: "sablon plastisol depan",
  }),
  false,
);
assert.equal(hasEmbroideryRequest({}), false);

// --- moqSizeSpread ---------------------------------------------------------

// moq 1 → exactly 1 pc (previously produced 2 via Math.max(1, floor(1/3))).
assert.deepEqual(moqSizeSpread(1), { S: 0, M: 1, L: 0, XL: 0, "2XL": 0, "3XL": 0 });
assert.equal(sumSizeMatrix(moqSizeSpread(1)), 1);

assert.deepEqual(moqSizeSpread(2), { S: 0, M: 2, L: 0, XL: 0, "2XL": 0, "3XL": 0 });
assert.deepEqual(moqSizeSpread(3), { S: 0, M: 1, L: 1, XL: 1, "2XL": 0, "3XL": 0 });
assert.deepEqual(moqSizeSpread(13), { S: 0, M: 4, L: 4, XL: 5, "2XL": 0, "3XL": 0 });

// Totals always equal the requested moq.
for (const moq of [1, 2, 3, 7, 8, 12, 20, 48, 100, 251]) {
  assert.equal(
    sumSizeMatrix(moqSizeSpread(moq)),
    moq,
    `moqSizeSpread(${moq}) must sum to ${moq}`,
  );
}

// --- normalizeMoqSettings ---------------------------------------------------

assert.deepEqual(normalizeMoqSettings(null), DEFAULT_MOQ_SETTINGS);
assert.deepEqual(normalizeMoqSettings({}), DEFAULT_MOQ_SETTINGS);
assert.deepEqual(
  normalizeMoqSettings({ fulfillment: "3", customization: 0, production: 48.6, embroidery: "8" }),
  { fulfillment: 3, customization: 1, production: 48, embroidery: 8 },
);
assert.deepEqual(
  normalizeMoqSettings({ fulfillment: -5, customization: 1e9, production: Number.NaN, embroidery: true }),
  { fulfillment: 1, customization: 1_000_000, production: 48, embroidery: 1 },
);

console.log("test-moq-rules: all assertions passed");
