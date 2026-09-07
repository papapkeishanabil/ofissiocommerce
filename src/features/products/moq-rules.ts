// src/features/products/moq-rules.ts
// Aturan MOQ baris keranjang: MOQ produk (pembelian) + batas keras bordir.
// Pure — SATU logika yang dipakai client (cart-store, ProductDetail) dan
// server (checkout-cart.service), sehingga checkout, retry pembayaran, dan
// quotation memblokir dengan pesan yang sama persis.

import { DEFAULT_MOQ_SETTINGS } from "@/features/moq-settings/moq-settings.types";

// Keyword teks customization yang menandakan permintaan bordir. Sengaja TIDAK
// memuat "logo" — "logo sablon/DTF" bukan bordir (false positive).
const BORDIR_KEYWORDS = ["bordir", "embro"] as const;

export function hasBordirKeyword(text?: string | null): boolean {
  const normalized = (text ?? "").toLowerCase();
  if (!normalized.trim()) return false;
  return BORDIR_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/** Baris ini meminta bordir? (placement 3D, placement tersimpan, atau teks.) */
export function hasEmbroideryRequest(input: {
  embroideryPlacements?: readonly unknown[];
  uniform3DPlacements?: readonly unknown[];
  customization?: string | null;
}): boolean {
  return (
    (input.uniform3DPlacements?.length ?? 0) > 0 ||
    (input.embroideryPlacements?.length ?? 0) > 0 ||
    hasBordirKeyword(input.customization)
  );
}

export interface LineMoqIssue {
  code: "PRODUCT_MOQ" | "EMBROIDERY_MOQ";
  reason: string;
  requiredQty: number;
  shortfall: number;
}

/**
 * Validasi MOQ satu baris: `null` = lolos.
 * Floor = max(moq produk, bordir ? batas bordir : 0) — MOQ produk yang lebih
 * ketat tetap menang (mis. produk moq 20 + bordir 8 + qty 5 → PRODUCT_MOQ).
 */
export function resolveLineMoqIssue(input: {
  productMoq: number;
  totalQty: number;
  hasEmbroidery: boolean;
  embroideryMoq?: number;
}): LineMoqIssue | null {
  const productMoq = Math.max(1, Math.trunc(input.productMoq) || 1);
  const embroideryMoq = Math.max(
    1,
    Math.trunc(input.embroideryMoq ?? DEFAULT_MOQ_SETTINGS.embroidery) || 1,
  );
  const totalQty = Math.trunc(input.totalQty);
  const floor = input.hasEmbroidery ? Math.max(productMoq, embroideryMoq) : productMoq;
  if (totalQty >= floor) return null;

  if (input.hasEmbroidery && embroideryMoq > productMoq) {
    return {
      code: "EMBROIDERY_MOQ",
      reason: `Bordir memerlukan minimal ${embroideryMoq} pcs (saat ini ${totalQty}). Hapus bordir atau tambahkan jumlah.`,
      requiredQty: embroideryMoq,
      shortfall: embroideryMoq - totalQty,
    };
  }
  return {
    code: "PRODUCT_MOQ",
    reason: `MOQ ${productMoq} pcs belum terpenuhi (saat ini ${totalQty}).`,
    requiredQty: productMoq,
    shortfall: productMoq - totalQty,
  };
}
