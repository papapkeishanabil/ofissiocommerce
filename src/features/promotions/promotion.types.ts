// src/features/promotions/promotion.types.ts
// Public-facing promotion contract. Shared by the public API route and the
// customer UI (promo page + cart voucher picker). Deliberately narrow: never
// mirror the raw WooCommerce coupon — only fields that are safe to display.

export type PublicPromotionDiscountType =
  | "percent"
  | "fixed_cart"
  | "fixed_product";

export interface PublicPromotion {
  id: number;
  code: string;
  discountType: PublicPromotionDiscountType;
  amount: number;
  description: string;
  minimumAmount: number;
  maximumAmount: number | null;
  expiresAt: string | null;
  /** Label restriksi yang aman (cth: "Berlaku untuk produk tertentu"). */
  restrictionLabel: string | null;
  displayTitle: string;
  displaySubtitle: string;
}

export const PROMOTION_TYPE_BADGE: Record<
  PublicPromotionDiscountType,
  string
> = {
  percent: "Diskon %",
  fixed_cart: "Potongan Harga",
  fixed_product: "Produk Tertentu",
};

/**
 * Handoff "Pakai Sekarang" dari halaman /promo ke picker di keranjang:
 * kode disimpan sementara di sessionStorage, divalidasi server-side saat
 * CartSummary mount, lalu key dihapus (sekali pakai).
 */
export const PENDING_PROMO_STORAGE_KEY = "ofissio:pending-promo";
