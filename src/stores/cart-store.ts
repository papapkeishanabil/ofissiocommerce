// src/stores/cart-store.ts
// Client-side cart with localStorage persistence.
// Phase 4 will replace this with a server-persisted CartSession scoped by
// company_id; for now we keep the contract stable so components don't change.

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Product } from "@/types/product";
import {
  type CartLineItem,
  emptySizeMatrix,
  lineItemId,
  sumSizeMatrix,
} from "@/types/cart";
import type { SizeMatrix } from "@/types/industry";

interface CartState {
  items: CartLineItem[];
  hydrated: boolean;
  /** Marks store as hydrated after rehydration (avoids SSR mismatch). */
  setHydrated: () => void;
  add: (input: {
    product: Product;
    color: string;
    sizes: SizeMatrix;
    customization?: string | null;
  }) => { ok: boolean; reason?: string; lineId?: string };
  updateLineSizes: (lineId: string, sizes: SizeMatrix) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  totalQty: () => number;
  totalEstimatedPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      add: ({ product, color, sizes, customization = null }) => {
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
        const unitPrice = product.priceFrom;
        const estimatedPrice = unitPrice * totalQty;

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
          next[idx] = {
            ...cur,
            sizes: mergedSizes,
            totalQty: mergedQty,
            estimatedPrice: cur.unitPrice * mergedQty,
            customization: customization ?? cur.customization,
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
          color,
          sizes,
          totalQty,
          unitPrice,
          estimatedPrice,
          customization,
        };
        set({ items: [...existing, line] });
        return { ok: true, lineId: id };
      },

      updateLineSizes: (lineId, sizes) =>
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== lineId) return it;
            const totalQty = sumSizeMatrix(sizes);
            return {
              ...it,
              sizes,
              totalQty,
              estimatedPrice: it.unitPrice * totalQty,
            };
          }),
        })),

      removeLine: (lineId) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== lineId) })),

      clear: () => set({ items: [] }),

      totalQty: () => get().items.reduce((acc, it) => acc + it.totalQty, 0),

      totalEstimatedPrice: () =>
        get().items.reduce((acc, it) => acc + it.estimatedPrice, 0),
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
