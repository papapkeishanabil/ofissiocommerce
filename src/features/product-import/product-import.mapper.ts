import type { WooCommerceProductVariationWritePayload, WooCommerceProductWritePayload } from "@/features/products/woocommerce/woocommerce.types";
import type { WooCommerceImportProduct } from "./product-import.types";

export function mapImportProductToWooDraft(input: { product: WooCommerceImportProduct; targetSku: string | null; batchId?: string; mediaIds?: number[]; categoryIds?: number[] }): WooCommerceProductWritePayload {
  const product = input.product;
  return { type: product.productType === "variable" ? "variable" : "simple", status: "draft", name: product.name, sku: input.targetSku || undefined, description: product.description, short_description: product.shortDescription, regular_price: money(product.regularPrice), sale_price: money(product.salePrice), categories: input.categoryIds?.map((id) => ({ id })), tags: product.tags.map((name) => ({ name })), attributes: product.attributes.map((attribute) => ({ name: attribute.name, visible: attribute.visible, variation: product.productType === "variable", options: attribute.values })), images: input.mediaIds?.map((id) => ({ id })), meta_data: [{ key: "_ofissio_import_source", value: "woocommerce_csv" }, { key: "_ofissio_source_id", value: product.sourceId }, ...(input.batchId ? [{ key: "_ofissio_import_batch_id", value: input.batchId }, { key: "_ofissio_import_source_id", value: product.sourceId }] : []), { key: "_ofissio_source_published", value: product.published }], };
}

export function mapImportVariationToWoo(input: { variation: WooCommerceImportProduct }): WooCommerceProductVariationWritePayload {
  return { ...(input.variation.sku ? { sku: input.variation.sku } : {}), regular_price: money(input.variation.regularPrice), sale_price: money(input.variation.salePrice), attributes: input.variation.attributes.flatMap((attribute) => attribute.values.slice(0, 1).map((option) => ({ name: attribute.name, option }))), meta_data: [{ key: "_ofissio_import_identity", value: input.variation.internalKey }, { key: "_ofissio_source_id", value: input.variation.sourceId }] };
}
function money(value: number | null) { return value === null ? undefined : String(value); }
