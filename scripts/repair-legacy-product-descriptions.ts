/**
 * Repair junk deskripsi legacy di WooCommerce (sisa "\n" import CSV lama yang
 * termakan backslash-nya sehingga tersisa huruf "n" nyasar + run &nbsp;).
 *
 * Default DRY-RUN: hanya mencetak laporan per-SKU (rule yang diterapkan +
 * pratinjau sebelum/sesudah) tanpa menulis apa pun.
 *   npx tsx --require ./scripts/register-server-only.cjs \
 *     scripts/repair-legacy-product-descriptions.ts            # dry-run
 *   ... repair-legacy-product-descriptions.ts --execute        # tulis ke Woo
 *   ... repair-legacy-product-descriptions.ts --sku=KK-006     # filter SKU
 *   ... repair-legacy-product-descriptions.ts --verbose        # diff penuh
 *
 * Hanya produk yang cocok dengan signature junk presisi yang disentuh;
 * transformasi idempoten — menjalankan ulang setelah sukses → "matched 0".
 */
import { loadEnvConfig } from "@next/env";

import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import {
  hasLegacyDescriptionJunk,
  junkPreview,
  repairLegacyDescriptionHtml,
} from "../src/features/products/description/legacy-description-junk";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const EXECUTE = process.argv.includes("--execute");
const VERBOSE = process.argv.includes("--verbose");
const SKU_FILTER = (() => {
  const arg = process.argv.find((value) => value.startsWith("--sku="));
  return arg ? arg.slice("--sku=".length).trim().toUpperCase() : null;
})();

const WRITE_DELAY_MS = 250;

run().catch((error: unknown) => {
  console.error("ERROR: repair deskripsi legacy gagal.");
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

async function run() {
  console.log("Ofissio repair deskripsi produk legacy");
  console.log("---------------------------------------");
  console.log(`Target : ${process.env.WOOCOMMERCE_BASE_URL ?? process.env.NEXT_PUBLIC_WOOCOMMERCE_URL ?? "(env Woo belum diset)"}`);
  console.log(`Mode   : ${EXECUTE ? "EXECUTE — akan MENULIS ke WooCommerce" : "DRY-RUN (gunakan --execute untuk menulis)"}`);
  if (SKU_FILTER) console.log(`Filter : SKU ${SKU_FILTER}`);
  console.log("");

  const products = await listAllProducts();
  console.log(`Scanned ${products.length} produk (publish + draft).`);

  const matched = products
    .map((product) => {
      const descriptionRepair = repairLegacyDescriptionHtml(product.description ?? "");
      const shortRepair = repairLegacyDescriptionHtml(product.short_description ?? "");
      // Double-gate: hasil berubah DAN signature junk memang terdeteksi, agar
      // perubahan kosmetik murni (mis. trim) tidak dikira sebagai match.
      const junk =
        hasLegacyDescriptionJunk(product.description ?? "") ||
        hasLegacyDescriptionJunk(product.short_description ?? "");
      const changed =
        junk &&
        (descriptionRepair.html !== (product.description ?? "") ||
          shortRepair.html !== (product.short_description ?? ""));
      return { product, descriptionRepair, shortRepair, changed };
    })
    .filter((entry) => entry.changed)
    .filter((entry) => !SKU_FILTER || entry.product.sku.trim().toUpperCase() === SKU_FILTER);

  for (const { product, descriptionRepair, shortRepair } of matched) {
    console.log(`\n=== ${product.sku || "(tanpa SKU)"} (#${product.id}, ${product.status}) — ${product.name} ===`);
    const rules = [...new Set([...descriptionRepair.appliedRules, ...shortRepair.appliedRules])];
    console.log(`Rules  : ${rules.join(", ")}`);
    printSide("description", product.description ?? "", descriptionRepair.html);
    printSide("short_description", product.short_description ?? "", shortRepair.html);
  }

  console.log("\n---------------------------------------");
  console.log(`Summary: scanned ${products.length} | matched ${matched.length} | no-change ${products.length - matched.length}`);
  if (!EXECUTE) {
    console.log("WRITE COUNTS: 0 (dry-run)");
    return;
  }

  let updated = 0;
  let failed = 0;
  for (const { product, descriptionRepair, shortRepair } of matched) {
    try {
      await woocommerceClient.updateProduct(product.id, {
        ...(descriptionRepair.html !== (product.description ?? "") ? { description: descriptionRepair.html } : {}),
        ...(shortRepair.html !== (product.short_description ?? "") ? { short_description: shortRepair.html } : {}),
      });
      updated += 1;
      console.log(`UPDATED ${product.sku || "#" + product.id}`);
    } catch (error) {
      failed += 1;
      console.error(`GAGAL   ${product.sku || "#" + product.id}: ${error instanceof Error ? error.message : error}`);
    }
    await delay(WRITE_DELAY_MS);
  }
  console.log(`\nSummary write: updated ${updated} | failed ${failed}`);
}

async function listAllProducts() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const chunk = await woocommerceClient.getProducts({ status: "any", per_page: 100, page });
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}

function printSide(label: string, before: string, after: string) {
  if (before === after) return;
  if (VERBOSE) {
    console.log(`[${label}] BEFORE:`);
    console.log(before);
    console.log(`[${label}] AFTER:`);
    console.log(after);
  } else {
    console.log(`[${label}] BEFORE: ${junkPreview(before)}`);
    console.log(`[${label}] AFTER : ${junkPreview(after)}`);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
