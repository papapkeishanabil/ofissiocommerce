import "server-only";

import { productServerService } from "@/features/products/product.server-service";

export interface AdminProductImage {
  mainImage: string | null;
}

/**
 * Resolve catalog main images for line-item products so admin detail pages can
 * show product photos. Tries id first, then slug (mock/dev orders sometimes
 * carry a tracking productId that differs from the catalog id, while the slug
 * still matches). Custom/brief items resolve to null (placeholder).
 */
export async function resolveAdminProductImages(
  items: Array<{ productId?: string | null; productSlug?: string | null }>,
): Promise<Record<string, AdminProductImage>> {
  const unique: Array<{ productId: string; productSlug?: string | null }> = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = item.productId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push({ productId: id, productSlug: item.productSlug ?? null });
  }

  const entries = await Promise.all(
    unique.map(async ({ productId, productSlug }) => {
      let mainImage: string | null = null;
      try {
        const byId = await productServerService.getProductById(productId);
        mainImage = byId?.mainImage ?? null;
        if (!mainImage && productSlug) {
          const bySlug = await productServerService.getProductBySlug(productSlug);
          mainImage = bySlug?.mainImage ?? null;
        }
      } catch {
        mainImage = null;
      }
      return [productId, { mainImage }] as const;
    }),
  );
  return Object.fromEntries(entries);
}
