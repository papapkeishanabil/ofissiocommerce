import type { OfissioProduct } from "../product.types";
import {
  validateProduct3DModel,
  validateProductForCatalog,
} from "../product.validation";

export function validateWooCommerceProductForOfissio(product: OfissioProduct) {
  if (product.source !== "woocommerce") {
    return { ok: false as const, reason: "Produk bukan dari WooCommerce." };
  }
  if (product.status !== "published") {
    return { ok: false as const, reason: "Produk WooCommerce belum published." };
  }
  if (!product.sku.trim()) {
    return { ok: false as const, reason: "Produk WooCommerce tanpa SKU." };
  }
  if (!product.model_3d?.filename || !product.model_3d.filename.toLowerCase().endsWith(".glb")) {
    return { ok: false as const, reason: "Filename GLB WooCommerce tidak valid." };
  }
  const modelValidation = validateProduct3DModel(product);
  if (!modelValidation.ok) return modelValidation;
  const catalogValidation = validateProductForCatalog(product);
  if (!catalogValidation.ok) return catalogValidation;
  return { ok: true as const };
}
