import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  isSpecialServiceAddon,
  SPECIAL_PRODUCT_DISPOSITION,
  SPECIAL_PRODUCT_REASON,
} from "../src/features/products/special-product";

assert.equal(isSpecialServiceAddon({ sku: "BDR", name: "Tambah Bordir" }), true);
assert.equal(isSpecialServiceAddon({ sku: " bdr " }), true);
assert.equal(isSpecialServiceAddon({ sku: "KK-007", name: "Kemeja" }), false);
assert.equal(SPECIAL_PRODUCT_DISPOSITION, "SKIPPED_SPECIAL_PRODUCT");
assert.equal(SPECIAL_PRODUCT_REASON, "SERVICE_ADDON_NOT_CATALOG_PRODUCT");

const planner = readFileSync("src/features/product-integrity-repair/product-integrity-repair.service.ts", "utf8");
const specialBranch = planner.indexOf("if (isSpecialServiceAddon(product))");
const legacyBranch = planner.indexOf('if (planned?.photoSource === "LEGACY_WOOCOMMERCE")', specialBranch);
assert.ok(specialBranch >= 0, "Integrity planner must classify the special product explicitly");
assert.ok(legacyBranch > specialBranch, "Special-product exit must happen before Legacy Media planning");
assert.match(planner, /repair:\s*"SPECIAL_PRODUCT"/);
assert.match(planner, /classification:\s*SPECIAL_PRODUCT_DISPOSITION/);

const executor = readFileSync("src/features/product-integrity-repair/product-integrity-repair-execute.service.ts", "utf8");
assert.match(executor, /classification\s*!==\s*"AUTO_REPAIRABLE"/, "Only auto-repairable rows may reach repair writes");

const client = readFileSync("src/features/product-integrity-repair/components/ProductIntegrityRepairClient.tsx", "utf8");
assert.match(client, /SKIPPED_SPECIAL_PRODUCT/);
assert.match(client, /row\.classification\s*===\s*"AUTO_REPAIRABLE"/, "Special rows must have disabled selection");

console.log("PASS: BDR special-product disposition is explicit, non-selectable, and bypasses Legacy Media repair");
