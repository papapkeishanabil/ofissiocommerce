import "server-only";
import { uniformLiveOfferPrice } from "../product-schema-offer";
import { PRODUCT_COLOR_VALUES_META, collectProductColorValues, productColorIssues } from "../product-color-quality";
import { PRODUCT_KIND_META, VARIANT_OPTIONS_META, GENERIC_VARIANTS_META, readVariantOptions, mapProductVariants } from "../product-variants";
import { mapPurchaseVariants, PURCHASE_VARIANTS_META } from "../purchase-variants";
import { COLOR_SIZE_ENABLED_META, COLOR_SIZE_ROWS_META, mapNativeColorSizeVariants } from "../color-size-variants";

import { createApiError } from "@/lib/security/safe-error-response";
import {
  BASE_PRICE_META, COLOR_VARIANTS_ENABLED_META, COLOR_VARIANTS_META,
  COLOR_VARIANTS_READY_META, COLOR_VARIANT_MARKER, DEFAULT_COLOR_META, FABRIC_COLOR_META, MODEL_ADJUSTMENT_META,
  colorKey, isManagedColorVariant, mapNativeColorVariants, readColorVariants,
} from "../color-variants";
import type { AdminColorVariantsPayload } from "./color-variants.validation";
import { woocommerceClient } from "./woocommerce.client";
import { getMetaBoolean, getMetaNumber, getMetaString, getMetaValue, getMetaStringArray } from "./woocommerce-product-meta";
import { fromSameOriginWordPressMediaUrl } from "./wordpress-media-proxy";
import { toProxiedWordPressMediaUrl } from "./wordpress-media-proxy";
import { getWordPressMediaRuntimeConfig } from "./wordpress-media-upload.service";
import type { WooCommerceMetaData, WooCommerceProduct, WooCommerceProductVariation } from "./woocommerce.types";

export type VariantSource = Pick<typeof woocommerceClient, "getProductById" | "getProductVariations" | "createProductVariation" | "updateProductVariation" | "updateProduct"> & Partial<Pick<typeof woocommerceClient, "getProducts">>;

export async function listColorVariationRows(productId: number, source: VariantSource = woocommerceClient) {
  const rows: WooCommerceProductVariation[] = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await source.getProductVariations(productId, { page, per_page: 100 });
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
  throw createApiError("BAD_REQUEST", "Terlalu banyak varian untuk diedit melalui form warna.", 400);
}

/** Checkout and detail pages read native variations, including current stock. */
export async function withLiveColorVariants(product: WooCommerceProduct, source: VariantSource = woocommerceClient) {
  if (getMetaString(product.meta_data ?? [], PRODUCT_KIND_META) === "variable") {
    const options = readVariantOptions(getMetaValue(product.meta_data ?? [], VARIANT_OPTIONS_META));
    const rows = await listColorVariationRows(product.id, source);
    const variants = mapProductVariants(rows, options).map(row => ({ ...row, imageSrc: toProxiedWordPressMediaUrl(row.imageSrc, process.env.WORDPRESS_MEDIA_BASE_URL?.trim() ?? "") }));
    return { ...product, liveOfferPrice: uniformLiveOfferPrice(product, rows), meta_data: [...(product.meta_data ?? []).filter(row => row.key !== GENERIC_VARIANTS_META), { key: GENERIC_VARIANTS_META, value: variants }] };
  }
  if (!getMetaBoolean(product.meta_data ?? [], COLOR_VARIANTS_ENABLED_META, false)) {
    if (product.type !== "variable") return { ...product, liveOfferPrice: uniformLiveOfferPrice(product) };
    const rows = await listColorVariationRows(product.id, source);
    return { ...product, liveOfferPrice: uniformLiveOfferPrice(product, rows), meta_data: [...(product.meta_data ?? []).filter(row => row.key !== PURCHASE_VARIANTS_META), { key: PURCHASE_VARIANTS_META, value: mapPurchaseVariants(rows) }] };
  }
  const rows = await listColorVariationRows(product.id, source);
  const order = readColorVariants(product).map((variant) => variant.id);
  const variants = mapNativeColorVariants(product, rows).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return { ...product, liveOfferPrice: uniformLiveOfferPrice(product, rows), meta_data: [...(product.meta_data ?? []).filter((row) => row.key !== COLOR_VARIANTS_META && row.key !== COLOR_SIZE_ROWS_META), { key: COLOR_VARIANTS_META, value: JSON.stringify(variants) }, { key: COLOR_SIZE_ROWS_META, value: JSON.stringify(mapNativeColorSizeVariants(rows)) }] };
}

/** A failed multi-request save stays unready; retry reuses native rows instead of duplicating them. */
export async function saveColorVariants(productId: number, input: AdminColorVariantsPayload, source: VariantSource = woocommerceClient) {
  const product = await source.getProductById(productId);
  const colorIssues = productColorIssues(input.variants.map(row => row.color), { colorVariants: input.variants });
  if (product.status === "publish" && colorIssues.length) throw createApiError("VALIDATION_ERROR", colorIssues.map(issue => issue.message).join(" "), 400);
  const colorValues = collectProductColorValues(input.variants.map(row => row.color), { colorVariants: input.variants });
  // Never split an existing aggregate stock figure into invented per-size counts.
  if (getMetaBoolean(product.meta_data ?? [], COLOR_SIZE_ENABLED_META, false) || input.variants.length > 0 && input.variants.every(v => v.stockQuantity == null) && getMetaStringArray(product.meta_data ?? [], "available_sizes").length > 0) {
    const { saveColorSizeVariants } = await import("./color-size-variants.service");
    return saveColorSizeVariants(product, input, source);
  }
  const rows = await listColorVariationRows(productId, source);
  const ownRows = rows.filter(isManagedColorVariant);
  if (rows.some((row) => !isManagedColorVariant(row))) {
    throw createApiError("BAD_REQUEST", "Produk ini sudah memiliki varian ukuran atau varian dari sistem lain. Pengaturan warna tidak dapat menimpa varian tersebut.", 400);
  }
  const meta = product.meta_data ?? [];
  const colors = getMetaStringArray(meta, "available_colors");
  const enabled = input.variants.length > 0;
  const colorAttribute = product.attributes?.find((attribute) => /^(pa_)?(warna|color)$/i.test(attribute.slug || attribute.name));
  if (enabled && (!colorAttribute || colors.length !== input.variants.length || colors.some((color) => !input.variants.some((variant) => colorKey(variant.color) === colorKey(color))))) {
    throw createApiError("BAD_REQUEST", "Isi satu varian untuk setiap warna pada bagian Katalog dan atribut, lalu simpan kembali.", 400);
  }
  const mediaBase = getWordPressMediaRuntimeConfig().baseUrl;
  const canonicalImage = (src: string) => fromSameOriginWordPressMediaUrl(src, mediaBase);
  for (const variant of input.variants) {
    if (colorKey(variant.sku) === colorKey(product.sku)) throw createApiError("BAD_REQUEST", "SKU varian harus berbeda dari SKU produk induk.", 400);
    if (variant.id && !ownRows.some((row) => row.id === variant.id)) throw createApiError("BAD_REQUEST", "ID varian tidak sesuai dengan produk ini. Muat ulang halaman.", 400);
    if (!(product.images ?? []).some((image) => canonicalImage(image.src) === canonicalImage(variant.imageSrc))) {
      throw createApiError("BAD_REQUEST", `Foto warna ${variant.color} belum ada di galeri. Simpan foto produk terlebih dahulu.`, 400);
    }
  }
  const regularPrice = getMetaNumber(meta, BASE_PRICE_META, Number(product.regular_price || product.price));
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) throw createApiError("BAD_REQUEST", "Isi harga regular produk sebelum menyimpan varian.", 400);
  const attributes = (product.attributes ?? []).map((attribute) => ({
    ...(attribute.id ? { id: attribute.id } : { name: attribute.name }),
    visible: attribute.visible ?? true,
    variation: enabled && attribute === colorAttribute,
    options: attribute.options ?? [],
  }));
  await source.updateProduct(productId, {
    type: enabled ? "variable" : "simple", attributes,
    regular_price: String(regularPrice),
    default_attributes: enabled ? [{ ...(colorAttribute?.id ? { id: colorAttribute.id } : { name: colorAttribute!.name }), option: input.defaultColor }] : [],
    meta_data: replaceMeta(meta, [
      [PRODUCT_COLOR_VALUES_META, colorValues], [COLOR_VARIANTS_ENABLED_META, enabled], [COLOR_VARIANTS_READY_META, false], [BASE_PRICE_META, regularPrice],
    ]),
  });
  const retained = new Set<number>();
  for (const variant of input.variants) {
    const existing = variant.id ? ownRows.find((row) => row.id === variant.id) : ownRows.find((row) =>
      colorKey(row.sku) === colorKey(variant.sku) || colorKey(mapNativeColorVariants(product, [{ ...row, status: "publish" }])[0]?.color ?? "") === colorKey(variant.color),
    );
    if (existing && retained.has(existing.id)) throw createApiError("BAD_REQUEST", "Dua warna mengacu pada varian yang sama. Muat ulang halaman lalu simpan lagi.", 400);
    const image = product.images!.find((image) => canonicalImage(image.src) === canonicalImage(variant.imageSrc))!;
    const payload = {
      sku: variant.sku, status: "publish" as const, regular_price: String(regularPrice), sale_price: "",
      manage_stock: variant.stockQuantity !== null,
      stock_quantity: variant.stockQuantity,
      stock_status: variant.stockQuantity === 0 ? "outofstock" as const : "instock" as const,
      image: image.id ? { id: image.id } : { src: canonicalImage(image.src) },
      attributes: [{ ...(colorAttribute?.id ? { id: colorAttribute.id } : { name: colorAttribute!.name }), option: variant.color }],
      meta_data: [{ key: COLOR_VARIANT_MARKER, value: true }, { key: "ofissio_color", value: variant.color }, { key: FABRIC_COLOR_META, value: variant.fabricColor ?? "" }, { key: MODEL_ADJUSTMENT_META, value: variant.modelAdjustment ? JSON.stringify(variant.modelAdjustment) : "" }],
    };
    const saved = existing
      ? await source.updateProductVariation(productId, existing.id, payload)
      : await source.createProductVariation(productId, payload);
    retained.add(saved.id);
  }
  for (const row of ownRows) {
    if (!retained.has(row.id) && row.status !== "private") {
      await source.updateProductVariation(productId, row.id, { status: "private", attributes: row.attributes ?? [] });
    }
  }
  const freshProduct = await source.getProductById(productId);
  const fresh = mapNativeColorVariants(freshProduct, await listColorVariationRows(productId, source));
  if (fresh.length !== input.variants.length || input.variants.some((variant) => !fresh.some((row) =>
    row.sku === variant.sku && colorKey(row.color) === colorKey(variant.color) &&
    canonicalImage(row.imageSrc) === canonicalImage(variant.imageSrc) && row.stockQuantity === variant.stockQuantity && row.fabricColor === variant.fabricColor && JSON.stringify(row.modelAdjustment) === JSON.stringify(variant.modelAdjustment),
  ))) {
    throw createApiError("BAD_REQUEST", "WooCommerce belum mengonfirmasi seluruh varian. Simpan ulang untuk melanjutkan.", 502);
  }
  const ordered = input.variants.map((variant) => fresh.find((row) => row.sku === variant.sku)!);
  await source.updateProduct(productId, {
    meta_data: replaceMeta(freshProduct.meta_data ?? [], [
      [COLOR_VARIANTS_META, JSON.stringify(ordered)], [COLOR_VARIANTS_READY_META, true], [DEFAULT_COLOR_META, enabled ? input.defaultColor : ""],
    ]),
  });
  return ordered;
}

function replaceMeta(meta: WooCommerceMetaData[], entries: Array<[string, unknown]>) {
  // Only send fields being changed; WooCommerce merges meta by id/key.
  return entries.map(([key, value]) => {
    const existing = [...meta].reverse().find((row) => row.key === key);
    return { ...(existing?.id ? { id: existing.id } : {}), key, value };
  });
}
