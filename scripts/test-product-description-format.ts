import assert from "node:assert/strict";

import { sanitizeProductDescriptionHtml } from "../src/features/products/description/sanitize-product-html";

const legacy = [
  "<h2>Kemeja Safety KS-003</h2>",
  "<p>Deskripsi produk.</p>",
  "<p><strong>Spesifikasi Kemeja:</strong></p>",
  "<ol><li></li><li>Potongan regular</li><li>Bahan: American Drill</li></ol>",
  "<p>READY STOCK.<br>UKURAN LENGKAP.<br>SIAP TAMBAH BORDIR.</p>",
].join("");

const normalizedLegacy = sanitizeProductDescriptionHtml(legacy, {
  productName: "Kemeja Safety KS-003",
  structuredFactLabels: ["Material", "Ukuran"],
});

assert.equal((normalizedLegacy.match(/<h3>Detail Produk<\/h3>/g) ?? []).length, 1);
assert.equal((normalizedLegacy.match(/<li>/g) ?? []).length, 1);
assert.equal(normalizedLegacy.includes("American Drill"), false);
assert.equal(normalizedLegacy.includes("READY STOCK"), false);
assert.equal(normalizedLegacy.includes("<ol>"), false);

const canonical = "<p>Deskripsi produk.</p><h3>Detail Produk</h3><ul><li>Fitur utama</li></ul>";
const normalizedCanonical = sanitizeProductDescriptionHtml(canonical);

assert.equal((normalizedCanonical.match(/<h3>Detail Produk<\/h3>/g) ?? []).length, 1);
assert.equal((normalizedCanonical.match(/<li>/g) ?? []).length, 1);

console.log("Product description formatting: OK");
