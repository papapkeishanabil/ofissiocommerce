import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";

import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import {
  getProductReadiness,
} from "../src/features/products/woocommerce/woocommerce-product-readiness";
import {
  buildWooVariationSku,
  getWooCommerceProductStandard,
} from "../src/features/products/woocommerce/woocommerce-product-standard";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import type {
  WooCommerceProduct,
  WooCommerceProductVariation,
} from "../src/features/products/woocommerce/woocommerce.types";
import { getWooSizeStockMatrix } from "../src/features/stock-monitoring/woocommerce-stock.service";
import type { WooStockDataSource } from "../src/features/stock-monitoring/stock-monitoring.types";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

run().catch((error: unknown) => {
  console.error("ERROR: WooCommerce product standard check gagal.");
  console.error(error instanceof Error ? error.message : "Unknown product standard error.");
  process.exitCode = 1;
});

async function run() {
  console.log("Ofissio WooCommerce product standard check");
  console.log("-------------------------------------------");

  assert(buildWooVariationSku("tg-055", "m", "camel") === "TG-055-CAMEL-M", "format SKU warna salah");
  console.log("PASS: format Parent SKU, ukuran, dan warna dinormalisasi konsisten.");

  for (const parentSku of ["KL-007", "KK-006"]) {
    const fixture = standardFixture(parentSku);
    const standard = getWooCommerceProductStandard(fixture.product, fixture.variations);
    assert(standard.isStandard, `${parentSku} fixture belum standard: ${standard.issues[0]?.message}`);
    assert(
      standard.expectedVariationSkus.join() === ["S", "M", "L", "XL"].map((size) => `${parentSku}-${size}`).join(),
      `${parentSku} harus memiliki variasi S/M/L/XL`,
    );
    const matrix = await getWooSizeStockMatrix(parentSku, fixture.source);
    assert(matrix.rows.length === 4, `${parentSku} size matrix harus memiliki empat variation`);
    assert(matrix.rows.every((row) => row.variationSkuConfigured), `${parentSku} variation SKU belum lengkap`);
  }
  console.log("PASS: sample KL-007 dan KK-006 memiliki variation SKU S/M/L/XL dan stok admin terbaca.");

  assertReadinessPolicy();
  console.log("PASS: readiness memblokir foto/metadata wajib dan zona bordir yang diperlukan.");

  assertCustomerStockIsPrivate();
  console.log("PASS: payload dan UI customer tidak menampilkan atau memblokir order berdasarkan stok.");

  await checkLiveWooCommerce();
}

function assertReadinessPolicy() {
  const fixture = standardFixture("KL-007").product;
  const ready = getProductReadiness(fixture);
  assert(ready.isVisibleInOfissio, `fixture valid harus ready: ${ready.blockingIssues[0]?.label}`);

  const withoutImage = structuredClone(fixture);
  withoutImage.images = [];
  assert(
    getProductReadiness(withoutImage).blockingIssues.some((item) => item.field === "images"),
    "foto utama kosong harus blocking",
  );

  const withoutZones = structuredClone(fixture);
  withoutZones.meta_data = withoutZones.meta_data?.map((meta) =>
    meta.key === "embroidery_zones" ? { ...meta, value: [] } : meta,
  );
  assert(
    getProductReadiness(withoutZones).blockingIssues.some((item) => item.field === "embroidery_zones"),
    "produk bordir tanpa zona harus blocking",
  );

  const embroideryDisabled = structuredClone(withoutZones);
  embroideryDisabled.meta_data = embroideryDisabled.meta_data?.map((meta) =>
    meta.key === "supports_embroidery" ? { ...meta, value: false } : meta,
  );
  assert(
    !getProductReadiness(embroideryDisabled).blockingIssues.some((item) => item.field === "embroidery_zones"),
    "produk tanpa dukungan bordir tidak boleh diwajibkan memiliki zona",
  );

  const incomplete = structuredClone(fixture);
  incomplete.meta_data = incomplete.meta_data?.filter((meta) => meta.key !== "moq");
  assert(!getProductReadiness(incomplete).isVisibleInOfissio, "metadata wajib kosong harus membuat produk belum ready");
}

function assertCustomerStockIsPrivate() {
  const product = standardFixture("KL-007").product;
  const customerPayload = JSON.stringify(mapWooCommerceProductToOfissioProduct(product));
  for (const term of ["stock_quantity", "stock_status", "manage_stock", "availableQty", "shortageQty"]) {
    assert(!customerPayload.includes(term), `data stok bocor ke product mapper customer: ${term}`);
  }

  const roots = [
    "src/app/catalog",
    "src/app/product",
    "src/app/cart",
    "src/app/checkout",
    "src/components/product",
    "src/components/cart",
    "src/components/checkout",
  ];
  const forbidden = /stock_quantity|stock_status|availableQty|shortageQty|out[ _-]?of[ _-]?stock|stok habis/i;
  for (const root of roots) {
    for (const file of walkSourceFiles(join(process.cwd(), root))) {
      assert(!forbidden.test(readFileSync(file, "utf8")), `customer stock copy/field ditemukan di ${file}`);
    }
  }
}

async function checkLiveWooCommerce() {
  if (process.env.WOOCOMMERCE_ENABLED !== "true") {
    console.log("SKIP: live WooCommerce product standard karena WOOCOMMERCE_ENABLED bukan true; fixture PASS.");
    return;
  }

  try {
    const products = await woocommerceClient.getProducts({ status: "any", per_page: 100 });
    const candidates = products.filter((product) => ["KL-007", "KK-006"].includes(product.sku?.trim().toUpperCase()));
    if (candidates.length === 0) {
      console.log("WARN: sample live KL-007/KK-006 tidak ditemukan; gunakan checklist docs untuk membuat variations.");
      return;
    }
    for (const product of candidates) {
      const variations = await woocommerceClient.getProductVariations(product.id, { per_page: 100 });
      const result = getWooCommerceProductStandard(product, variations);
      if (result.isStandard) {
        console.log(`LIVE PASS: ${result.parentSku} mengikuti standard variable product Ofissio.`);
      } else {
        console.log(`LIVE WARN: ${result.parentSku} perlu diperbaiki (${result.issues.slice(0, 3).map((item) => item.message).join("; ")}).`);
      }
    }
  } catch {
    console.log("WARN: WooCommerce live belum dapat dijangkau; contract fixture tetap PASS.");
  }
}

function standardFixture(parentSku: string): {
  product: WooCommerceProduct;
  variations: WooCommerceProductVariation[];
  source: WooStockDataSource;
} {
  const sizes = ["S", "M", "L", "XL"];
  const product: WooCommerceProduct = {
    id: parentSku === "KL-007" ? 7 : 6,
    name: `Produk ${parentSku}`,
    slug: parentSku.toLowerCase(),
    sku: parentSku,
    status: "publish",
    type: "variable",
    description: "Seragam kerja Ofissio",
    short_description: "Seragam kerja",
    price: "150000",
    regular_price: "150000",
    sale_price: "",
    categories: [{ id: 1, name: "Seragam Kerja", slug: "seragam-kerja" }],
    images: [{ id: 1, src: "https://commerce.ofissio.test/product.webp", alt: parentSku }],
    attributes: [{ id: 1, name: "Ukuran", slug: "pa_ukuran", options: sizes, visible: true, variation: true }],
    variations: sizes.map((_, index) => 100 + index),
    meta_data: [
      { key: "industries", value: ["corporate"] },
      { key: "has_3d_model", value: true },
      { key: "model_3d_url", value: `/3d/${parentSku.toLowerCase()}.glb` },
      { key: "model_3d_id", value: `${parentSku.toLowerCase()}-v1` },
      { key: "model_3d_version", value: "v1" },
      { key: "model_3d_source", value: "woocommerce" },
      { key: "model_3d_filename", value: `${parentSku.toLowerCase()}.glb` },
      { key: "moq", value: 20 },
      { key: "lead_time", value: "14 hari" },
      { key: "fulfillment_type", value: "ready_stock_with_customization" },
      { key: "transaction_mode", value: "hybrid" },
      { key: "supports_embroidery", value: true },
      { key: "embroidery_zones", value: ["left_chest", "right_chest"] },
    ],
  };
  const variations = sizes.map((size, index): WooCommerceProductVariation => ({
    id: 100 + index,
    sku: `${parentSku}-${size}`,
    manage_stock: true,
    stock_quantity: 20 - index * 4,
    stock_status: "instock",
    low_stock_amount: 5,
    attributes: [{ id: 1, name: "Ukuran", option: size }],
  }));
  return {
    product,
    variations,
    source: {
      async getProducts(params = {}) {
        return !params.sku || params.sku.toUpperCase() === parentSku ? [structuredClone(product)] : [];
      },
      async getProductVariations() {
        return structuredClone(variations);
      },
    },
  };
}

function walkSourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory()
      ? walkSourceFiles(path)
      : /\.(?:ts|tsx)$/.test(name)
        ? [path]
        : [];
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
