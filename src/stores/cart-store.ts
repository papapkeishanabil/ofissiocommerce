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
import { calculateEmbroideryPricing, normalizeEmbroideryZoneId, type EmbroideryPricing, type EmbroideryPricingZoneId } from "@/features/products/embroidery-pricing";

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
    globalEmbroideryPricing?: EmbroideryPricing;
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

      add: ({ product, color, sizes, customization = null, uniform3DConfig = null, globalEmbroideryPricing }) => {
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
        const embroideryPrice = calculateEmbroideryPricing({
          totalQty,
          selectedZones: uniform3DConfig?.placements.map((placement) => placement.zone) ?? [],
          productSupportedZones: product.embroidery_zones,
          globalEmbroideryPricing: globalEmbroideryPricing ?? EMPTY_EMBROIDERY_PRICING,
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
          const effective3DConfig = uniform3DConfig ?? cur.uniform3DConfig;
          const mergedEmbroideryPrice = calculateEmbroideryPricing({
            totalQty: mergedQty,
            selectedZones: effective3DConfig?.placements.map((placement) => placement.zone) ?? cur.selectedEmbroideryZones ?? [],
            productSupportedZones: product.embroidery_zones,
            globalEmbroideryPricing: globalEmbroideryPricing ?? cur.embroideryPricingSnapshot ?? EMPTY_EMBROIDERY_PRICING,
          });
          next[idx] = {
            ...cur,
            sizes: mergedSizes,
            totalQty: mergedQty,
            unitPrice: mergedPrice.unitPrice,
            estimatedPrice: mergedPrice.subtotal + mergedEmbroideryPrice.total,
            regularPrice: cur.regularPrice ?? product.priceFrom,
            finalUnitPrice: mergedPrice.unitPrice,
            quantityTierLabel: mergedPrice.tierLabel,
            quantityPricingBasis: product.quantityPricing?.basis ?? cur.quantityPricingBasis ?? "total_order_qty",
            quantityPricingMode: product.quantityPricing?.mode ?? cur.quantityPricingMode ?? "fixed_unit_price",
            quantityTierApplied: mergedPrice.tierApplied,
            subtotal: mergedPrice.subtotal,
            productSubtotal: mergedPrice.subtotal,
            quantityPricing: product.quantityPricing ?? cur.quantityPricing,
            selectedEmbroideryZones: mergedEmbroideryPrice.lines.map((line) => line.zoneId).concat(mergedEmbroideryPrice.missingPricingZones, mergedEmbroideryPrice.unsupportedZones),
            embroideryPricingSnapshot: globalEmbroideryPricing ?? cur.embroideryPricingSnapshot ?? EMPTY_EMBROIDERY_PRICING,
            productSupportedEmbroideryZones: normalizeZones(product.embroidery_zones),
            embroideryLines: mergedEmbroideryPrice.lines,
            embroideryTotal: mergedEmbroideryPrice.total,
            missingEmbroideryPricingZones: mergedEmbroideryPrice.missingPricingZones.concat(mergedEmbroideryPrice.unsupportedZones),
            customizationTotal: mergedEmbroideryPrice.total,
            finalEstimatedTotal: mergedPrice.subtotal + mergedEmbroideryPrice.total,
            customization: customization ?? cur.customization,
            uniform3DConfig: effective3DConfig,
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
          estimatedPrice: calculatedPrice.subtotal + embroideryPrice.total,
          regularPrice: product.priceFrom,
          finalUnitPrice: calculatedPrice.unitPrice,
          quantityTierLabel: calculatedPrice.tierLabel,
          quantityPricingBasis: product.quantityPricing?.basis ?? "total_order_qty",
          quantityPricingMode: product.quantityPricing?.mode ?? "fixed_unit_price",
          quantityTierApplied: calculatedPrice.tierApplied,
          subtotal: calculatedPrice.subtotal,
          productSubtotal: calculatedPrice.subtotal,
          quantityPricing: product.quantityPricing,
          selectedEmbroideryZones: embroideryPrice.lines.map((line) => line.zoneId).concat(embroideryPrice.missingPricingZones, embroideryPrice.unsupportedZones),
          embroideryPricingSnapshot: globalEmbroideryPricing ?? EMPTY_EMBROIDERY_PRICING,
          productSupportedEmbroideryZones: normalizeZones(product.embroidery_zones),
          embroideryLines: embroideryPrice.lines,
          embroideryTotal: embroideryPrice.total,
          missingEmbroideryPricingZones: embroideryPrice.missingPricingZones.concat(embroideryPrice.unsupportedZones),
          customizationTotal: embroideryPrice.total,
          finalEstimatedTotal: calculatedPrice.subtotal + embroideryPrice.total,
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
            const embroideryPrice = calculateEmbroideryPricing({
              totalQty,
              selectedZones: it.embroideryPlacements?.map((placement) => placement.zone) ?? it.selectedEmbroideryZones ?? [],
              productSupportedZones: it.productSupportedEmbroideryZones ?? it.selectedEmbroideryZones,
              globalEmbroideryPricing: it.embroideryPricingSnapshot,
            });
            return {
              ...it,
              sizes,
              totalQty,
              unitPrice: calculatedPrice.unitPrice,
              estimatedPrice: calculatedPrice.subtotal + embroideryPrice.total,
              finalUnitPrice: calculatedPrice.unitPrice,
              quantityTierLabel: calculatedPrice.tierLabel,
              quantityTierApplied: calculatedPrice.tierApplied,
              quantityPricingBasis: it.quantityPricing?.basis ?? it.quantityPricingBasis ?? "total_order_qty",
              quantityPricingMode: it.quantityPricing?.mode ?? it.quantityPricingMode ?? "fixed_unit_price",
              subtotal: calculatedPrice.subtotal,
              productSubtotal: calculatedPrice.subtotal,
              selectedEmbroideryZones: embroideryPrice.lines.map((line) => line.zoneId).concat(embroideryPrice.missingPricingZones, embroideryPrice.unsupportedZones),
              embroideryLines: embroideryPrice.lines,
              embroideryTotal: embroideryPrice.total,
              missingEmbroideryPricingZones: embroideryPrice.missingPricingZones.concat(embroideryPrice.unsupportedZones),
              customizationTotal: embroideryPrice.total,
              finalEstimatedTotal: calculatedPrice.subtotal + embroideryPrice.total,
            };
          }),
        })),

      removeLine: (lineId) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== lineId) })),

      clear: () => set({ items: [] }),

      totalQty: () => get().items.reduce((acc, it) => acc + it.totalQty, 0),

      totalEstimatedPrice: () =>
        get().items.reduce((acc, it) => acc + (it.finalEstimatedTotal ?? it.estimatedPrice), 0),

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

function normalizeZones(zones: readonly unknown[]): EmbroideryPricingZoneId[] {
  return zones.map(normalizeEmbroideryZoneId).filter((zone): zone is EmbroideryPricingZoneId => zone != null);
}

const EMPTY_EMBROIDERY_PRICING: EmbroideryPricing = { enabled: false, mode: "flat_per_piece", zones: [] };
