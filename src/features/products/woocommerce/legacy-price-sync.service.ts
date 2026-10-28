import "server-only";
import { createApiError } from "@/lib/security/safe-error-response";
import { listColorVariationRows, type VariantSource } from "./color-variants.service";
import { getMetaBoolean, getMetaString } from "./woocommerce-product-meta";
import type { WooCommerceProduct } from "./woocommerce.types";

/** Legacy products charge the parent price; existing native SKUs must agree. */
export async function syncLegacyVariantPrices(product: WooCommerceProduct, price: number, source: VariantSource) {
  const meta = product.meta_data ?? [];
  // Generic variants and managed colors have their own explicit price editors.
  if (product.type !== "variable" || getMetaString(meta, "ofissio_product_kind")
    || getMetaBoolean(meta, "ofissio_color_variants_enabled", false)) return;
  if (!Number.isFinite(price) || price < 0) throw createApiError("VALIDATION_ERROR", "Harga produk tidak valid.", 400);
  const rows = (await listColorVariationRows(product.id, source)).filter(row => row.status === "publish");
  const pending = rows.filter(row => Number(row.regular_price) !== price);
  const retryReady = getMetaBoolean(meta, "ofissio_price_sync_restore_ready", false);
  if (!pending.length && !retryReady) return;
  if (pending.some(row => !Array.isArray(row.attributes))) {
    throw createApiError("VALIDATION_ERROR", "Identitas varian belum lengkap. Periksa varian sebelum menyimpan harga produk.", 400);
  }
  // Do not silently replace an independently configured promotion.
  if (rows.some(row => Number(row.sale_price) > 0)) {
    throw createApiError("VALIDATION_ERROR", "Varian masih memiliki harga promo WooCommerce. Selaraskan harga promo sebelum menyimpan harga produk.", 400);
  }
  const restoreReady = retryReady || getMetaBoolean(meta, "ofissio_stock_variants_ready", false);
  await source.updateProduct(product.id, { meta_data: [
    { key: "ofissio_stock_variants_ready", value: false },
    { key: "ofissio_price_sync_restore_ready", value: restoreReady },
  ] });
  // A failed write deliberately leaves readiness false. A later save retries all rows.
  for (const row of pending) await source.updateProductVariation(product.id, row.id, { regular_price: String(price), attributes: row.attributes! });
  const fresh = (await listColorVariationRows(product.id, source)).filter(row => row.status === "publish");
  if (fresh.length !== rows.length || rows.some(row => !fresh.some(item => item.id === row.id))
    || fresh.some(row => Number(row.regular_price) !== price || Number(row.price) !== price)) {
    throw createApiError("VALIDATION_ERROR", "Harga varian belum tersinkron. Simpan ulang produk untuk melanjutkan.", 502);
  }
  if (restoreReady) await source.updateProduct(product.id, { meta_data: [
    { key: "ofissio_stock_variants_ready", value: true },
    { key: "ofissio_price_sync_restore_ready", value: false },
  ] });
}
