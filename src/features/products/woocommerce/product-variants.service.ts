import "server-only";
import type { z } from "zod";
import { productVariantsSchema, VARIANT_OPTIONS_META, GENERIC_VARIANTS_META, GENERIC_VARIANT_MARKER, PRODUCT_KIND_META, mapProductVariants, combinationKey, isColorOption, isSizeOption } from "../product-variants";
import { listColorVariationRows, type VariantSource } from "./color-variants.service";
import { woocommerceClient } from "./woocommerce.client";
import { createApiError } from "@/lib/security/safe-error-response";
import { assertFreeStockSkus } from "./size-variants.service";
import { fromSameOriginWordPressMediaUrl } from "./wordpress-media-proxy";
import { getWordPressMediaRuntimeConfig } from "./wordpress-media-upload.service";
import { getMetaBoolean } from "./woocommerce-product-meta";

export async function saveProductVariants(productId: number, raw: z.infer<typeof productVariantsSchema>, source: VariantSource = woocommerceClient) {
  const input = productVariantsSchema.parse(raw);
  const product = await source.getProductById(productId);
  const fail = (message: string): never => { throw createApiError("VALIDATION_ERROR", message, 400); };
  const rows = await listColorVariationRows(productId, source);
  const base = getWordPressMediaRuntimeConfig().baseUrl;
  const canonical = (src: string) => fromSameOriginWordPressMediaUrl(src, base);
  for (const row of input.variants) {
    if (row.sku.toLowerCase() === product.sku.toLowerCase()) fail("SKU varian harus berbeda dari SKU katalog otomatis.");
    if (row.id && !rows.some(r => r.id === row.id)) fail("ID varian bukan milik produk ini. Muat ulang produk.");
    if (row.imageSrc && !product.images?.some(i => canonical(i.src) === canonical(row.imageSrc))) fail(`Foto untuk ${row.sku} belum tersimpan di galeri.`);
  }
  // Recover a partially completed save by SKU without allocating duplicate native rows.
  const plans = input.variants.map(row => ({ ...row, id: row.id ?? rows.find(r => r.sku.toLowerCase() === row.sku.toLowerCase())?.id }));
  const unmapped = rows.filter(row => row.status === "publish" && !getMetaBoolean(row.meta_data ?? [], GENERIC_VARIANT_MARKER, false) && !plans.some(plan => plan.id === row.id));
  if (unmapped.length) fail(`Ada varian lama yang belum dipetakan: ${unmapped.map(row => row.sku || `ID ${row.id}`).join(", ")}. Muat ulang halaman edit dan pertahankan seluruh SKU lama saat beralih ke editor fleksibel.`);
  await assertFreeStockSkus(plans, source);
  const attributes = (product.attributes ?? []).filter(a => !input.options.some(o => o.name.toLowerCase() === a.name.toLowerCase())).map(a => ({ ...(a.id ? { id: a.id } : { name: a.name }), options: a.options ?? [], visible: true, variation: false }));
  for (const option of input.options) attributes.push({ name: option.name, options: option.values, visible: true, variation: true });
  const defaultRow = input.variants.find(row => row.sku === input.defaultVariantSku)!;
  await source.updateProduct(productId, {
    type: "variable", attributes,
    default_attributes: input.options.map(o => ({ name: o.name, option: defaultRow.options[o.name]! })),
    meta_data: [
      { key: PRODUCT_KIND_META, value: "variable" },
      { key: VARIANT_OPTIONS_META, value: input.options },
      { key: "ofissio_default_variant_sku", value: input.defaultVariantSku },
      { key: "ofissio_stock_variants_ready", value: "0" },
      { key: "ofissio_color_variants_enabled", value: "0" },
      { key: "ofissio_color_size_variants_enabled", value: "0" },
    ],
  });
  const retained = new Set<number>();
  for (const row of plans) {
    const image = row.imageSrc ? product.images?.find(i => canonical(i.src) === canonical(row.imageSrc)) : product.images?.[0];
    const payload = {
      sku: row.sku, status: "publish" as const, regular_price: String(row.regularPrice), sale_price: "",
      ...(image ? { image: image.id ? { id: image.id } : { src: canonical(image.src) } } : {}),
      attributes: input.options.map(o => ({ name: o.name, option: row.options[o.name]! })),
      meta_data: [{ key: GENERIC_VARIANT_MARKER, value: "1" }, { key: "ofissio_variant_inherit_image", value: row.imageSrc ? "0" : "1" }],
      // Inventory is owned by WooCommerce/Ginee. Editing a variant must not reset it.
      ...(!row.id ? { manage_stock: false, stock_quantity: null, stock_status: "instock" as const } : {}),
    };
    const saved = row.id ? await source.updateProductVariation(productId, row.id, payload) : await source.createProductVariation(productId, payload);
    retained.add(saved.id);
  }
  for (const row of rows) {
    if (!retained.has(row.id) && row.status !== "private") await source.updateProductVariation(productId, row.id, { status: "private", attributes: row.attributes ?? [] });
  }
  const native = await listColorVariationRows(productId, source);
  const fresh = mapProductVariants(native, input.options);
  if (fresh.length !== plans.length || plans.some(plan => !fresh.some(row => row.sku === plan.sku && combinationKey(input.options, row.options) === combinationKey(input.options, plan.options) && row.regularPrice === plan.regularPrice && canonical(row.imageSrc) === canonical(plan.imageSrc) && canonical(native.find(n => n.id === row.id)?.image?.src ?? "") === canonical(plan.imageSrc || product.images?.[0]?.src || "")))) {
    throw createApiError("BAD_REQUEST", "Varian belum terverifikasi. Simpan ulang; varian yang sudah dibuat akan dipakai kembali.", 502);
  }
  const colorOption = input.options.find(o => isColorOption(o.name));
  const sizeOption = input.options.find(o => isSizeOption(o.name));
  await source.updateProduct(productId, { meta_data: [
    { key: GENERIC_VARIANTS_META, value: fresh },
    { key: "ofissio_stock_variants_ready", value: "1" },
    ...(colorOption ? [{ key: "available_colors", value: JSON.stringify(colorOption.values) }] : []),
    { key: "available_sizes", value: JSON.stringify(sizeOption?.values ?? ["OS"]) },
  ] });
  return fresh;
}
