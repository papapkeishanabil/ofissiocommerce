import type { OfissioProduct } from "./product.types";
/** Phase 8 boundary: map WooCommerce custom fields into OfissioProduct. */
export function mapWooCommerceProductToOfissioProduct(_raw: unknown): OfissioProduct { throw new Error("WooCommerce mapper is not configured until Phase 8."); }
export function mapOfissioProductToCartItem(product: OfissioProduct) {
  if (!product.model_3d) throw new Error("Produk tanpa GLB tidak dapat dipetakan ke cart.");
  return { priceFrom: product.priceFrom, moq: product.moq, fulfillmentType: product.fulfillment, transactionMode: product.transaction_mode, model3dId: product.model_3d.id, model3dUrl: product.model_3d.url };
}
