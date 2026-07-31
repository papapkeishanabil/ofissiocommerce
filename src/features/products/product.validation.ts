import type { OfissioProduct } from "./product.types";
import {
  getProductReadiness,
  isValidGlbReference,
} from "./woocommerce/woocommerce-product-readiness";
export type ProductValidation = { ok: true } | { ok: false; reason: string };
export function validateProduct3DModel(product: Pick<OfissioProduct, "model_3d" | "has_3d_model" | "status">): ProductValidation {
  const model = product.model_3d;
  if (
    !product.has_3d_model ||
    !model?.id ||
    !model.url ||
    !model.version ||
    !model.source ||
    !model.filename ||
    !model.is_required ||
    model.file_type !== "glb" ||
    !isValidGlbReference(model.url) ||
    !model.filename.toLowerCase().endsWith(".glb")
  ) return { ok: false, reason: "Model GLB produk tidak valid." };
  return { ok: true };
}
export function validateProductForCatalog(product: OfissioProduct): ProductValidation {
  if (product.source === "woocommerce") {
    const readiness = getProductReadiness(product);
    return readiness.isVisibleInOfissio
      ? { ok: true }
      : {
          ok: false,
          reason:
            readiness.blockingIssues[0]?.label ??
            "Produk belum siap untuk katalog Ofissio.",
        };
  }
  if (product.status !== "published") return { ok: false, reason: "Produk belum published." };
  if (!product.sku.trim()) return { ok: false, reason: "SKU wajib." };
  if (!(product.categorySlugs?.length || product.category?.trim())) {
    return { ok: false, reason: "Kategori produk belum dipilih." };
  }
  if (!(product.industrySlugs?.length || product.industries.length)) {
    return { ok: false, reason: "Industri belum dipilih." };
  }
  if (product.priceFrom <= 0) return { ok: false, reason: "Harga produk wajib." };
  if (product.moq <= 0 || !product.lead_time.trim()) {
    return { ok: false, reason: "MOQ dan lead time wajib." };
  }
  if (!product.fulfillment || !product.transaction_mode) {
    return { ok: false, reason: "Fulfillment dan transaction mode wajib." };
  }
  return validateProduct3DModel(product);
}
export function validateProductForCart(product: OfissioProduct): ProductValidation {
  const catalog = validateProductForCatalog(product);
  if (!catalog.ok) return catalog;
  if (!product.sku || product.moq <= 0 || product.priceFrom <= 0 || !product.fulfillment || !product.transaction_mode) return { ok: false, reason: "Data produk belum lengkap untuk keranjang." };
  return { ok: true };
}

export function validateProduct(product: OfissioProduct): ProductValidation {
  if (!product.name.trim()) return { ok: false, reason: "Nama produk wajib." };
  if (!product.sku.trim()) return { ok: false, reason: "SKU wajib." };
  if (!product.slug.trim()) return { ok: false, reason: "Slug wajib." };
  if (product.moq <= 0) return { ok: false, reason: "MOQ harus positif." };
  if (product.priceFrom <= 0) return { ok: false, reason: "Harga harus positif." };
  if (!product.category) return { ok: false, reason: "Kategori produk belum dipilih." };
  if (!product.industries.length) return { ok: false, reason: "Industri belum dipilih." };
  if (!product.available_sizes.length || !product.available_colors.length) return { ok: false, reason: "Ukuran dan warna wajib." };
  if (product.has_3d_model && !product.model_3d) return { ok: false, reason: "Metadata model 3D wajib." };
  if (product.status === "published") return validateProductForCatalog(product);
  return { ok: true };
}

export function validateUniqueMockProducts(products: OfissioProduct[]): ProductValidation {
  const skus = new Set<string>();
  const slugs = new Set<string>();
  for (const product of products) {
    const validation = validateProduct(product);
    if (!validation.ok) return validation;
    const sku = product.sku.toLowerCase();
    const slug = product.slug.toLowerCase();
    if (skus.has(sku)) return { ok: false, reason: `SKU duplikat: ${product.sku}` };
    if (slugs.has(slug)) return { ok: false, reason: `Slug duplikat: ${product.slug}` };
    skus.add(sku);
    slugs.add(slug);
  }
  return { ok: true };
}
