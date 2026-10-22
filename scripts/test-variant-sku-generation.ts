import assert from "node:assert/strict";
import { applyVariantSizeGroup, generateVariantCombinations, variantSizeGroups } from "../src/features/products/variant-sku-generation";
import { productVariantsSchema } from "../src/features/products/product-variants";

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const options = [{ name: "Lengan", values: ["Pendek", "Panjang"] }, { name: "Ukuran", values: sizes }];
let rows = generateVariantCombinations(options, [], 115000);
assert.equal(rows.length, sizes.length * 2);
const groups = variantSizeGroups(options, rows);
rows = applyVariantSizeGroup(options, rows, groups[0]!.key, { skuPrefix: "KK-006LPD", regularPrice: 115000, imageSrc: "https://example.test/pendek.jpg" });
rows = applyVariantSizeGroup(options, rows, groups[1]!.key, { skuPrefix: "KK-006LPJ", regularPrice: 125000, imageSrc: "https://example.test/panjang.jpg" });
assert.deepEqual(rows.filter(row => row.options.Lengan === "Pendek").map(row => row.sku), sizes.map(size => `KK-006LPD-${size}`));
assert(rows.filter(row => row.options.Lengan === "Panjang").every(row => row.regularPrice === 125000 && row.imageSrc.endsWith("panjang.jpg")));
assert(productVariantsSchema.safeParse({ options, variants: rows, defaultVariantSku: rows[0]!.sku }).success);
const stored = rows.map((row, index) => ({ ...row, id: 100 + index }));
stored[0]!.sku = "SKU-LAMA-KHUSUS";
const preserved = applyVariantSizeGroup(options, stored, groups[0]!.key, { skuPrefix: "NEW" });
assert.deepEqual(preserved.map(row => row.sku), stored.map(row => row.sku));
assert.deepEqual(preserved.map(row => row.id), stored.map(row => row.id));
assert.equal(variantSizeGroups(options, stored)[0]?.skuPrefix, "", "never infer an unsafe prefix from inconsistent old SKUs");
const rewritten = applyVariantSizeGroup(options, stored, groups[0]!.key, { skuPrefix: "KK-006LPD", replaceSkus: true });
assert.equal(rewritten[0]?.sku, "KK-006LPD-XS");
assert.equal(rewritten[0]?.id, stored[0]?.id);
assert.throws(() => applyVariantSizeGroup(options, rows.map(row => ({ ...row, sku: "" })), groups[0]!.key, { skuPrefix: "KK-006 LPD" }), /tanpa spasi/);
assert.throws(() => applyVariantSizeGroup(options, rows, groups[1]!.key, { skuPrefix: "KK-006LPD", replaceSkus: true }), /bertabrakan/);
const screenshot = [
  { options: { Lengan: "Pendek" }, sku: "KK-006LPD", imageSrc: "", regularPrice: 115000 },
  { options: { Lengan: "Panjang" }, sku: "KK-006LPJ", imageSrc: "", regularPrice: 125000 },
];
const expanded = generateVariantCombinations(options, screenshot, 0);
const appliedBeforeGenerate = applyVariantSizeGroup(options, screenshot, variantSizeGroups(options, screenshot)[0]!.key, { skuPrefix: "KK-006LPD", regularPrice: 115000 });
assert.equal(appliedBeforeGenerate.length, sizes.length * 2);
assert.equal(appliedBeforeGenerate[0]?.sku, "KK-006LPD-XS");
assert.equal(appliedBeforeGenerate[sizes.length]?.sku, "KK-006LPJ-XS");
assert.throws(() => applyVariantSizeGroup(options, screenshot.map((row, i) => ({ ...row, id: i + 1 })), groups[0]!.key, { skuPrefix: "KK-006LPD" }), /perbarui kombinasi terlebih dahulu/);
assert.equal(expanded[0]?.sku, "KK-006LPD-XS");
assert.equal(expanded[sizes.length]?.sku, "KK-006LPJ-XS");
assert.equal(expanded[sizes.length]?.regularPrice, 125000);
const addedSizeOptions = options.map(o => o.name === "Ukuran" ? { ...o, values: [...o.values, "OS"] } : o);
const expandedExisting = generateVariantCombinations(addedSizeOptions, rows.map((row, index) => ({ ...row, id: index + 1 })), 0);
assert.equal(expandedExisting.find(row => row.options.Lengan === "Pendek" && row.options.Ukuran === "OS")?.sku, "KK-006LPD-OS");
assert(expandedExisting.filter(row => row.options.Ukuran !== "OS").every(row => row.id));
assert.equal(expandedExisting.length, 20);
const reordered = generateVariantCombinations([...options].reverse(), stored, 0);
assert.deepEqual(reordered.map(row => row.id).sort(), stored.map(row => row.id).sort());
assert.throws(() => generateVariantCombinations([{ name: "Lengan", values: ["Pendek", "Pendek"] }], [], 0), /tidak boleh berulang/);
console.log("PASS: grouped SKU generation, shared price/photos, complete combinations, screenshot expansion, new sizes, custom legacy SKU/ID preservation and duplicate protection.");
