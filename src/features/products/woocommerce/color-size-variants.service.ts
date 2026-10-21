import "server-only";
import { COLOR_SIZE_ENABLED_META, COLOR_SIZE_MARKER, COLOR_SIZE_ROWS_META, COLOR_SKU_META, colorSizeSku, mapNativeColorSizeVariants, stockSize } from "../color-size-variants";
import { BASE_PRICE_META, COLOR_VARIANTS_ENABLED_META, COLOR_VARIANTS_META, COLOR_VARIANTS_READY_META, COLOR_VARIANT_MARKER, DEFAULT_COLOR_META, FABRIC_COLOR_META, MODEL_ADJUSTMENT_META, colorKey, isManagedColorVariant, mapNativeColorVariants } from "../color-variants";
import type { WooCommerceMetaData, WooCommerceProduct } from "./woocommerce.types";
import type { AdminColorVariantsPayload } from "./color-variants.validation";
import { listColorVariationRows, type VariantSource } from "./color-variants.service";
import { getMetaBoolean, getMetaNumber, getMetaString, getMetaStringArray } from "./woocommerce-product-meta";
import { fromSameOriginWordPressMediaUrl } from "./wordpress-media-proxy";
import { getWordPressMediaRuntimeConfig } from "./wordpress-media-upload.service";
import { createApiError } from "@/lib/security/safe-error-response";

function patchMeta(meta: WooCommerceMetaData[], entries: Array<[string, unknown]>) {
  return entries.map(([key, value]) => ({ ...(meta.find(row => row.key === key)?.id ? { id: meta.find(row => row.key === key)!.id } : {}), key, value }));
}

/** Opt-in conversion keeps historical variation IDs and never invents stock. */
export async function saveColorSizeVariants(product: WooCommerceProduct, input: AdminColorVariantsPayload, source: VariantSource) {
  const meta = product.meta_data ?? [];
  const colors = getMetaStringArray(meta, "available_colors");
  const colorAttribute = product.attributes?.find(a => /^(pa_)?(warna|color)$/i.test(a.slug || a.name));
  const sizeAttribute = product.attributes?.find(a => /^(pa_)?(ukuran|size)$/i.test(a.slug || a.name));
  const sizes = [...new Set((getMetaStringArray(meta, "available_sizes").length ? getMetaStringArray(meta, "available_sizes") : sizeAttribute?.options ?? []).map(stockSize))];
  if (!colorAttribute || !sizeAttribute || !sizes.length || !input.variants.length || input.variants.length !== colors.length || colors.some(color => !input.variants.some(v => colorKey(v.color) === colorKey(color)))) {
    throw createApiError("BAD_REQUEST", "Lengkapi warna dan ukuran. Mode stok warna dan ukuran tidak dapat dinonaktifkan melalui form warna.", 400);
  }
  if (sizes.length * colors.length > 300 || sizes.some(size => !/^(XS|S|M|L|XL|XXL|3XL|4XL|5XL)$/.test(size))) throw createApiError("BAD_REQUEST", "Kombinasi ukuran tidak didukung.", 400);
  const price = getMetaNumber(meta, BASE_PRICE_META, Number(product.regular_price || product.price));
  if (!(price > 0)) throw createApiError("BAD_REQUEST", "Harga produk belum valid.", 400);
  const rows = await listColorVariationRows(product.id, source);
  if (rows.some(row => !isManagedColorVariant(row))) throw createApiError("BAD_REQUEST", "Varian dari sistem lain tidak dapat ditimpa.", 400);
  const canonical = (src: string) => fromSameOriginWordPressMediaUrl(src, getWordPressMediaRuntimeConfig().baseUrl);
  const wantedSkus = new Set(input.variants.flatMap(v => sizes.map(size => colorSizeSku(v.sku, size))));
  if (wantedSkus.size !== input.variants.length * sizes.length) throw createApiError("BAD_REQUEST", "SKU kombinasi harus unik.", 400);
  for (const variant of input.variants) {
    if (variant.id && !rows.some(row => row.id === variant.id)) throw createApiError("BAD_REQUEST", "ID warna tidak sesuai. Muat ulang halaman.", 400);
    if (!product.images?.some(image => canonical(image.src) === canonical(variant.imageSrc))) throw createApiError("BAD_REQUEST", "Foto warna belum tersimpan di galeri produk.", 400);
    // Renaming stocked SKUs requires explicit remapping in Ginee, not a photo edit.
    if (getMetaBoolean(meta, COLOR_SIZE_ENABLED_META, false) && rows.some(row => row.status === "publish" && getMetaBoolean(row.meta_data ?? [], COLOR_SIZE_MARKER, false) && colorKey(getMetaString(row.meta_data ?? [], "ofissio_color")) === colorKey(variant.color) && colorKey(getMetaString(row.meta_data ?? [], COLOR_SKU_META)) !== colorKey(variant.sku))) throw createApiError("BAD_REQUEST", "SKU warna yang sudah dipetakan ke ukuran tidak dapat diganti melalui form ini.", 400);
  }
  await source.updateProduct(product.id, {
    type: "variable", regular_price: String(price),
    attributes: (product.attributes ?? []).map(a => ({ ...(a.id ? { id: a.id } : { name: a.name }), visible: a.visible ?? true, variation: a === colorAttribute || a === sizeAttribute, options: a === sizeAttribute ? sizes : a.options ?? [] })),
    default_attributes: [{ ...(colorAttribute.id ? { id: colorAttribute.id } : { name: colorAttribute.name }), option: input.defaultColor }],
    meta_data: patchMeta(meta, [[COLOR_VARIANTS_READY_META, false], [COLOR_VARIANTS_ENABLED_META, true], [COLOR_SIZE_ENABLED_META, true], [BASE_PRICE_META, price]]),
  });
  const retained = new Set<number>();
  for (const variant of input.variants) for (const size of sizes) {
    const sku = colorSizeSku(variant.sku, size);
    const existing = rows.find(row => row.sku.toUpperCase() === sku);
    const image = product.images!.find(image => canonical(image.src) === canonical(variant.imageSrc))!;
    const payload = {
      sku, status: "publish" as const, regular_price: String(price), sale_price: "",
      image: image.id ? { id: image.id } : { src: canonical(image.src) },
      attributes: [
        { ...(colorAttribute.id ? { id: colorAttribute.id } : { name: colorAttribute.name }), option: variant.color },
        { ...(sizeAttribute.id ? { id: sizeAttribute.id } : { name: sizeAttribute.name }), option: size },
      ],
      meta_data: [{ key: COLOR_VARIANT_MARKER, value: true }, { key: COLOR_SIZE_MARKER, value: true }, { key: COLOR_SKU_META, value: variant.sku }, { key: "ofissio_color", value: variant.color }, { key: "ofissio_size", value: size }, { key: FABRIC_COLOR_META, value: variant.fabricColor ?? "" }, { key: MODEL_ADJUSTMENT_META, value: variant.modelAdjustment ? JSON.stringify(variant.modelAdjustment) : "" }],
    };
    const saved = existing
      ? await source.updateProductVariation(product.id, existing.id, payload)
      : await source.createProductVariation(product.id, { ...payload, manage_stock: false, stock_quantity: null, stock_status: "instock" });
    retained.add(saved.id);
  }
  for (const row of rows) if (!retained.has(row.id) && row.status !== "private") {
    await source.updateProductVariation(product.id, row.id, { status: "private", attributes: row.attributes ?? [] });
  }
  const freshProduct = await source.getProductById(product.id);
  const freshRows = await listColorVariationRows(product.id, source);
  const sizeRows = mapNativeColorSizeVariants(freshRows);
  if (sizeRows.length !== wantedSkus.size || sizeRows.some(row => !wantedSkus.has(row.sku.toUpperCase())) || new Set(sizeRows.map(row => row.sku)).size !== wantedSkus.size) throw createApiError("BAD_REQUEST", "Varian ukuran belum terverifikasi. Simpan ulang untuk melanjutkan.", 502);
  const colorRows = mapNativeColorVariants(freshProduct, freshRows);
  const ordered = input.variants.map(variant => colorRows.find(row => colorKey(row.color) === colorKey(variant.color))!);
  if (ordered.some(row => !row)) throw createApiError("BAD_REQUEST", "Foto dan SKU warna belum terverifikasi.", 502);
  await source.updateProduct(product.id, { meta_data: patchMeta(freshProduct.meta_data ?? [], [[COLOR_VARIANTS_META, JSON.stringify(ordered)], [COLOR_SIZE_ROWS_META, JSON.stringify(sizeRows)], [COLOR_VARIANTS_READY_META, true], [DEFAULT_COLOR_META, input.defaultColor]]) });
  return ordered;
}
