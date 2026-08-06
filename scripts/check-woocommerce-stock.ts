import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { loadEnvConfig } from "@next/env";

import { requireInternalAdmin } from "../src/features/admin/admin.service";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import type {
  WooCommerceProduct,
  WooCommerceProductVariation,
} from "../src/features/products/woocommerce/woocommerce.types";
import { createInMemoryReplenishmentRepository } from "../src/features/stock-monitoring/replenishment.repository";
import { saveProductionReplenishmentRequest } from "../src/features/stock-monitoring/replenishment.service";
import type { WooStockDataSource } from "../src/features/stock-monitoring/stock-monitoring.types";
import {
  compareOrderRequirementWithWooStock,
  getWooSizeStockMatrix,
  getWooStockBySku,
} from "../src/features/stock-monitoring/woocommerce-stock.service";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

run().catch((error: unknown) => {
  console.error("ERROR: WooCommerce stock monitoring check gagal.");
  console.error(error instanceof Error ? error.message : "Unknown stock check error.");
  process.exitCode = 1;
});

async function run() {
  console.log("Ofissio WooCommerce admin stock monitoring check");
  console.log("-------------------------------------------------");

  assertMigration();
  console.log("PASS: migration 022 membuat request replenishment internal dengan forced RLS.");

  const source = mockStockSource();
  const matrix = await getWooSizeStockMatrix("KK-006", source);
  assert(matrix.rows.length === 3, "matrix harus berisi SKU S/M/L");
  assert(matrix.rows.map((row) => row.stockSku).join() === "KK-006-S,KK-006-M,KK-006-L", "urutan Stock SKU salah");
  assert(matrix.rows.find((row) => row.stockSku === "KK-006-M")?.status === "low", "stok M harus menipis");
  assert((await getWooStockBySku("KK-006-L", source))?.stockQuantity === 2, "stok L belum terbaca by SKU");
  console.log("PASS: SKU KK-006-S/M/L dibaca per variasi dan membentuk size stock matrix.");

  const order = {
    id: "order-stock-check",
    companyId: "company-stock-check",
    items: [{
      source: "woocommerce",
      productId: "wc-6",
      productName: "Kemeja KK-006",
      sku: "KK-006",
      sizeMatrix: { S: 4, M: 10, L: 10 },
      totalQty: 24,
    }],
  } as Parameters<typeof compareOrderRequirementWithWooStock>[0];
  const comparison = await compareOrderRequirementWithWooStock(order, source);
  const lRow = comparison.requirements.find((row) => row.stockSku === "KK-006-L");
  assert(lRow?.availableQty === 2 && lRow.shortageQty === 8, "shortage L harus 8 pcs");
  assert(comparison.hasShortage, "order workbench harus memberi shortage warning");
  console.log("PASS: required vs available vs shortage dihitung tanpa memblokir order.");

  const repository = createInMemoryReplenishmentRepository();
  const requestInput = {
    companyId: "company-stock-check",
    orderId: "order-stock-check",
    parentSku: "KK-006",
    stockSku: "KK-006-L",
    sizeLabel: "L",
    requiredQty: 10,
    availableStock: 2,
    shortageQty: 8,
    reason: "order_shortage" as const,
    createdBy: "admin-stock-check",
  };
  const first = await saveProductionReplenishmentRequest(requestInput, repository);
  const duplicate = await saveProductionReplenishmentRequest(requestInput, repository);
  assert(!first.idempotent && duplicate.idempotent, "request shortage yang sama harus idempotent");
  assert(first.request.id === duplicate.request.id, "request idempotent tidak boleh membuat ID baru");
  console.log("PASS: request produksi/replenishment idempotent untuk shortage yang sama.");

  assertCustomerPayloadIsStockFree(source.product);
  console.log("PASS: output product customer tidak mengandung jumlah/status/shortage stok.");

  assertAdminGuard();
  console.log("PASS: hanya role internal berizin yang dapat membuat request replenishment.");

  assertNoGineePageDependency();
  console.log("PASS: halaman admin produk/order tidak mengimpor atau memanggil Ginee.");

  assertSecretSafety();
  console.log("PASS: WooCommerce secret tidak bocor dan .env.local tidak tracked.");

  if (process.env.WOOCOMMERCE_ENABLED === "true") {
    try {
      const products = await woocommerceClient.getProducts({ status: "any", per_page: 100 });
      const candidate = products.find((product) => product.sku?.trim() && (product.variations?.length ?? 0) > 0)
        ?? products.find((product) => product.sku?.trim());
      if (!candidate) {
        console.log("WARN: tidak ada produk WooCommerce dengan Parent SKU untuk live stock check.");
      } else {
        const live = await getWooSizeStockMatrix(candidate.sku, woocommerceClient);
        console.log(`LIVE: ${candidate.sku} ditemukan=${Boolean(live.productId)}; variation rows=${live.rows.length}; warning SKU=${live.hasVariationSkuWarning}.`);
      }
    } catch {
      console.log("WARN: live WooCommerce stock belum dapat dijangkau; seluruh contract test mock tetap PASS.");
    }
  } else {
    console.log("SKIP: live WooCommerce stock check karena WOOCOMMERCE_ENABLED bukan true; mock adapter PASS.");
  }
}

function mockStockSource(): WooStockDataSource & { product: WooCommerceProduct } {
  const product: WooCommerceProduct = {
    id: 6,
    name: "Kemeja KK-006",
    slug: "kemeja-kk-006",
    sku: "KK-006",
    status: "publish",
    type: "variable",
    description: "Kemeja kerja",
    short_description: "Kemeja",
    price: "150000",
    regular_price: "150000",
    sale_price: "",
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    variations: [61, 62, 63],
    attributes: [{ id: 1, name: "Size", slug: "pa_size", options: ["S", "M", "L"], variation: true }],
    meta_data: [],
  };
  const variations: WooCommerceProductVariation[] = [
    variation(61, "S", 25),
    variation(62, "M", 8),
    variation(63, "L", 2),
  ];
  return {
    product,
    async getProducts(params = {}) {
      const wanted = params.sku?.toUpperCase();
      return !wanted || wanted === product.sku ? [structuredClone(product)] : [];
    },
    async getProductVariations() {
      return structuredClone(variations);
    },
  };
}

function variation(id: number, size: string, stock: number): WooCommerceProductVariation {
  return {
    id,
    sku: `KK-006-${size}`,
    manage_stock: true,
    stock_quantity: stock,
    stock_status: stock > 0 ? "instock" : "outofstock",
    low_stock_amount: 10,
    attributes: [{ name: "Size", option: size }],
  };
}

function assertCustomerPayloadIsStockFree(product: WooCommerceProduct) {
  const mapped = JSON.stringify(mapWooCommerceProductToOfissioProduct(product));
  for (const field of ["stock_quantity", "stock_status", "manage_stock", "shortageQty", "availableQty"]) {
    assert(!mapped.includes(field), `field stok customer bocor: ${field}`);
  }
}

function assertAdminGuard() {
  const actor = requireInternalAdmin(trustedInternalRequest("super_admin"), "admin:stock:request");
  assert(actor.role === "super_admin", "super admin harus diizinkan");
  assertThrows(() => requireInternalAdmin(trustedInternalRequest("finance_admin"), "admin:stock:request"));
  assertThrows(() => requireInternalAdmin(new Request("http://localhost/api/admin/stock-monitoring/replenishment-requests"), "admin:stock:request"));
}

function trustedInternalRequest(role: string) {
  return new Request("http://localhost/api/admin/stock-monitoring/replenishment-requests", {
    headers: {
      "x-ofissio-auth-verified": "1",
      "x-ofissio-auth-kind": "internal",
      "x-ofissio-internal-role": role,
      "x-ofissio-internal-user-id": `stock-check-${role}`,
      "x-ofissio-internal-user-name": "Stock Check",
    },
  });
}

function assertNoGineePageDependency() {
  for (const file of [
    "src/app/admin/products/woocommerce/[id]/page.tsx",
    "src/app/admin/orders/[id]/page.tsx",
    "src/features/stock-monitoring/woocommerce-stock.service.ts",
  ]) {
    const content = readFileSync(join(process.cwd(), file), "utf8");
    assert(!/from ["'][^"']*ginee|checkGineeStock|getGinee/i.test(content), `Ginee dipanggil dari ${file}`);
  }
}

function assertMigration() {
  const sql = readFileSync(join(process.cwd(), "database/migrations/022_woocommerce_stock_monitoring.sql"), "utf8").toLowerCase();
  assert(sql.includes("create table if not exists public.production_replenishment_requests"), "tabel replenishment belum dibuat");
  assert(sql.includes("idempotency_key text not null unique"), "idempotency key belum unique");
  assert(sql.includes("force row level security"), "forced RLS belum aktif");
  assert(sql.includes("revoke all") && sql.includes("anon, authenticated"), "browser access belum direvoke");
}

function assertSecretSafety() {
  const forbidden = ["NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET", "NEXT_PUBLIC_WOO_CONSUMER_SECRET"];
  for (const name of forbidden) {
    assert(!process.env[name]?.trim(), `${name} tidak boleh dikonfigurasi`);
  }
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();
  const staticRoot = join(process.cwd(), ".next/static");
  if (secret && secret.length >= 8 && existsSync(staticRoot)) {
    for (const file of walkFiles(staticRoot)) assert(!readFileSync(file, "utf8").includes(secret), "Woo secret ditemukan di client bundle");
  }
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", ".env.local"], { encoding: "utf8" });
  assert(tracked.status !== 0, ".env.local tidak boleh tracked");
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? walkFiles(path) : /\.(?:js|mjs|cjs|ts|tsx)$/.test(name) ? [path] : [];
  });
}

function assertThrows(work: () => unknown) {
  let threw = false;
  try { work(); } catch { threw = true; }
  assert(threw, "guard seharusnya menolak request");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
