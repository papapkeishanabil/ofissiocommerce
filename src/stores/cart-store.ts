// src/stores/cart-store.ts
// Client-side cart with localStorage persistence.
// Phase 4 will replace this with a server-persisted CartSession scoped by
// company_id; for now we keep the contract stable so components don't change.

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type CartLineItem,
  emptySizeMatrix,
  lineItemId,
  sumSizeMatrix,
} from "@/types/cart";
import type { SizeMatrix } from "@/types/industry";
import { validateProductForCart } from "@/features/products/product.validation";
import type { OfissioProduct } from "@/features/products/product.types";
import { mapOfissioProductToCartItem } from "@/features/products/product.mapper";
import { calculateQuantityTierPrice } from "@/features/products/quantity-pricing";

interface CartState {
  items: CartLineItem[];
  hydrated: boolean;
  /** Marks store as hydrated after rehydration (avoids SSR mismatch). */
  setHydrated: () => void;
  add: (input: {
    product: OfissioProduct;
    color: string;
    sizes: SizeMatrix;
    customization?: string | null;
    uniform3DConfig?: import("@/types/uniform-3d").Uniform3DConfig | null;
  }) => { ok: boolean; reason?: string; lineId?: string };
  updateLineSizes: (lineId: string, sizes: SizeMatrix) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  totalQty: () => number;
  totalEstimatedPrice: () => number;
  /** Returns a snapshot of the current cart (for checkout/quote conversion). */
  snapshot: () => CartLineItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      add: ({ product, color, sizes, customization = null, uniform3DConfig = null }) => {
        const validation = validateProductForCart(product);
        if (!validation.ok) return { ok: false, reason: validation.reason };
        const totalQty = sumSizeMatrix(sizes);
        if (totalQty <= 0) {
          return { ok: false, reason: "Quantitas belum diisi." };
        }
        if (totalQty < product.moq) {
          return {
            ok: false,
            reason: `MOQ ${product.moq} pcs belum terpenuhi (saat ini ${totalQty}).`,
          };
        }
        const id = lineItemId(product.id, color);
        const calculatedPrice = calculateQuantityTierPrice({
          regularPrice: product.priceFrom,
          totalQty,
          quantityPricing: product.quantityPricing,
        });

        const existing = get().items;
        const idx = existing.findIndex((it) => it.id === id);

        if (idx >= 0) {
          // Merge sizes for the same product+color line.
          const next = [...existing];
          const cur = next[idx]!;
          const mergedSizes: SizeMatrix = { ...emptySizeMatrix() };
          (Object.keys(mergedSizes) as (keyof SizeMatrix)[]).forEach((k) => {
            mergedSizes[k] = (cur.sizes[k] ?? 0) + (sizes[k] ?? 0);
          });
          const mergedQty = sumSizeMatrix(mergedSizes);
          const mergedPrice = calculateQuantityTierPrice({
            regularPrice: cur.regularPrice ?? product.priceFrom,
            totalQty: mergedQty,
            quantityPricing: product.quantityPricing ?? cur.quantityPricing,
          });
          next[idx] = {
            ...cur,
            sizes: mergedSizes,
            totalQty: mergedQty,
            unitPrice: mergedPrice.unitPrice,
            estimatedPrice: mergedPrice.subtotal,
            regularPrice: cur.regularPrice ?? product.priceFrom,
            finalUnitPrice: mergedPrice.unitPrice,
            quantityTierLabel: mergedPrice.tierLabel,
            quantityPricingBasis: product.quantityPricing?.basis ?? cur.quantityPricingBasis ?? "total_order_qty",
            quantityPricingMode: product.quantityPricing?.mode ?? cur.quantityPricingMode ?? "fixed_unit_price",
            quantityTierApplied: mergedPrice.tierApplied,
            subtotal: mergedPrice.subtotal,
            quantityPricing: product.quantityPricing ?? cur.quantityPricing,
            customization: customization ?? cur.customization,
            uniform3DConfig: uniform3DConfig ?? cur.uniform3DConfig,
            embroideryPlacements:
              uniform3DConfig?.placements ?? cur.embroideryPlacements,
          };
          set({ items: next });
          return { ok: true, lineId: id };
        }

        const line: CartLineItem = {
          id,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          sku: product.sku,
          ...mapOfissioProductToCartItem(product),
          color,
          sizes,
          totalQty,
          unitPrice: calculatedPrice.unitPrice,
          estimatedPrice: calculatedPrice.subtotal,
          regularPrice: product.priceFrom,
          finalUnitPrice: calculatedPrice.unitPrice,
          quantityTierLabel: calculatedPrice.tierLabel,
          quantityPricingBasis: product.quantityPricing?.basis ?? "total_order_qty",
          quantityPricingMode: product.quantityPricing?.mode ?? "fixed_unit_price",
          quantityTierApplied: calculatedPrice.tierApplied,
          subtotal: calculatedPrice.subtotal,
          quantityPricing: product.quantityPricing,
          customization,
          uniform3DConfig: uniform3DConfig ?? undefined,
          embroideryPlacements: uniform3DConfig?.placements,
        };
        set({ items: [...existing, line] });
        return { ok: true, lineId: id };
      },

      updateLineSizes: (lineId, sizes) =>
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== lineId) return it;
            const totalQty = sumSizeMatrix(sizes);
            const calculatedPrice = calculateQuantityTierPrice({
              regularPrice: it.regularPrice ?? it.priceFrom ?? it.unitPrice,
              totalQty,
              quantityPricing: it.quantityPricing,
            });
            return {
              ...it,
              sizes,
              totalQty,
              unitPrice: calculatedPrice.unitPrice,
              estimatedPrice: calculatedPrice.subtotal,
              finalUnitPrice: calculatedPrice.unitPrice,
              quantityTierLabel: calculatedPrice.tierLabel,
              quantityTierApplied: calculatedPrice.tierApplied,
              quantityPricingBasis: it.quantityPricing?.basis ?? it.quantityPricingBasis ?? "total_order_qty",
              quantityPricingMode: it.quantityPricing?.mode ?? it.quantityPricingMode ?? "fixed_unit_price",
              subtotal: calculatedPrice.subtotal,
            };
          }),
        })),

      removeLine: (lineId) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== lineId) })),

      clear: () => set({ items: [] }),

      totalQty: () => get().items.reduce((acc, it) => acc + it.totalQty, 0),

      totalEstimatedPrice: () =>
        get().items.reduce((acc, it) => acc + it.estimatedPrice, 0),

      snapshot: () => [...get().items],
    }),
    {
      name: "ofissio-cart-v1",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      // Only persist the data, not the methods.
      partialize: ({ items }) => ({ items }),
    },
  ),
);
