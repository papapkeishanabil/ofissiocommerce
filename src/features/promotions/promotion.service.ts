import "server-only";

import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import type { WooCommerceCoupon, WooCommerceCouponWritePayload } from "@/features/products/woocommerce/woocommerce.types";
import type { PublicPromotion, PublicPromotionDiscountType } from "./promotion.types";
import type { PromotionPayload } from "./promotion.validation";

export interface PromotionCartLine {
  productId: string;
  quantity: number;
  subtotal: number;
}

export async function listPromotions() {
  return woocommerceClient.getCoupons({ per_page: 100 });
}

/**
 * Daftar promo yang aman ditampilkan ke customer: hanya coupon aktif yang
 * belum kadaluarsa, kuotanya belum habis, dan tidak terikat restriksi email
 * (promo semacam itu private). Mentah WooCommerce tidak pernah keluar —
 * hanya field display di PublicPromotion.
 */
export async function listPublicPromotions(): Promise<PublicPromotion[]> {
  const coupons = await woocommerceClient.getCoupons({ per_page: 100 });
  const now = Date.now();
  return coupons
    .filter((coupon) => {
      if (coupon.date_expires && Date.parse(coupon.date_expires) < now) {
        return false;
      }
      if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
        return false;
      }
      // Email-restricted = promo terarah (private), bukan penawaran publik.
      if (coupon.email_restrictions?.length) return false;
      return true;
    })
    .map(toPublicPromotion)
    .sort((a, b) => b.id - a.id);
}

function toPublicPromotion(coupon: WooCommerceCoupon): PublicPromotion {
  const amount = Number(coupon.amount);
  const discountType = (
    coupon.discount_type === "percent" ||
    coupon.discount_type === "fixed_cart" ||
    coupon.discount_type === "fixed_product"
      ? coupon.discount_type
      : "fixed_cart"
  ) as PublicPromotionDiscountType;
  const minimumAmount = Number(coupon.minimum_amount ?? 0);
  const maximumAmountRaw = Number(coupon.maximum_amount ?? 0);
  const restrictionLabel = coupon.product_ids?.length
    ? "Berlaku untuk produk tertentu"
    : coupon.product_categories?.length
      ? "Berlaku untuk kategori tertentu"
      : null;
  const validity = coupon.date_expires
    ? `Berlaku hingga ${new Date(coupon.date_expires).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
    : "Berlaku selama kuota tersedia";
  return {
    id: coupon.id,
    code: coupon.code.toUpperCase(),
    discountType,
    amount,
    description: coupon.description ?? "",
    minimumAmount,
    maximumAmount: maximumAmountRaw > 0 ? maximumAmountRaw : null,
    expiresAt: coupon.date_expires ?? null,
    restrictionLabel,
    displayTitle:
      discountType === "percent"
        ? `Diskon ${Math.min(amount, 100)}%`
        : `Potongan Rp ${amount.toLocaleString("id-ID")}`,
    displaySubtitle: [
      minimumAmount > 0 ? `Min. belanja Rp ${minimumAmount.toLocaleString("id-ID")}` : null,
      validity,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export async function getPromotionDisplay(code: string) {
  const coupon = (await woocommerceClient.getCoupons({ code, per_page: 1 }))[0];
  if (!coupon || coupon.code.toLowerCase() !== code.trim().toLowerCase()) return null;
  if (coupon.date_expires && Date.parse(coupon.date_expires) < Date.now()) return null;
  if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) return null;
  return {
    code: coupon.code.toUpperCase(),
    offer: coupon.discount_type === "percent"
      ? `${Number(coupon.amount)}% OFF`
      : `HEMAT Rp ${Number(coupon.amount).toLocaleString("id-ID")}`,
    validity: coupon.date_expires
      ? `Berlaku sampai ${new Date(coupon.date_expires).toLocaleDateString("id-ID")}`
      : "Berlaku selama kuota tersedia",
  };
}

export async function createPromotion(input: PromotionPayload) {
  return woocommerceClient.createCoupon(toWooCoupon(input));
}

export async function updatePromotion(id: string | number, input: PromotionPayload) {
  return woocommerceClient.updateCoupon(id, toWooCoupon(input));
}

export async function stopPromotion(id: string | number) {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return woocommerceClient.updateCoupon(id, {
    date_expires: yesterday.toISOString().slice(0, 10),
  });
}

export async function validatePromotionCode(input: {
  code: string;
  lines: PromotionCartLine[];
  email?: string | null;
}) {
  const code = input.code.trim().toLowerCase();
  const coupon = (await woocommerceClient.getCoupons({ code, per_page: 1 }))[0];
  if (!coupon || coupon.code.toLowerCase() !== code) return invalid("Kode promo tidak ditemukan.");
  const now = Date.now();
  if (coupon.date_expires && Date.parse(coupon.date_expires) < now) return invalid("Masa berlaku promo sudah berakhir.");
  if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) return invalid("Kuota penggunaan promo sudah habis.");
  if (coupon.email_restrictions?.length && input.email && !coupon.email_restrictions.some((email) => email.toLowerCase() === input.email!.toLowerCase())) return invalid("Promo tidak berlaku untuk email ini.");
  const subtotal = input.lines.reduce((sum, line) => sum + Math.max(0, line.subtotal), 0);
  const minimum = Number(coupon.minimum_amount ?? 0);
  const maximum = Number(coupon.maximum_amount ?? 0);
  if (minimum > 0 && subtotal < minimum) return invalid(`Minimum transaksi promo Rp ${minimum.toLocaleString("id-ID")}.`);
  if (maximum > 0 && subtotal > maximum) return invalid(`Maksimum transaksi promo Rp ${maximum.toLocaleString("id-ID")}.`);
  const restrictedIds = new Set((coupon.product_ids ?? []).map(String));
  const excludedIds = new Set((coupon.excluded_product_ids ?? []).map(String));
  const eligible = input.lines.filter((line) => (!restrictedIds.size || restrictedIds.has(line.productId)) && !excludedIds.has(line.productId));
  if (!eligible.length) return invalid("Produk dalam keranjang tidak termasuk promo ini.");
  const eligibleSubtotal = eligible.reduce((sum, line) => sum + Math.max(0, line.subtotal), 0);
  const amount = Number(coupon.amount);
  const discountTotal = coupon.discount_type === "percent"
    ? Math.round(eligibleSubtotal * Math.min(amount, 100) / 100)
    : coupon.discount_type === "fixed_product"
      ? eligible.reduce((sum, line) => sum + amount * Math.max(0, line.quantity), 0)
      : amount;
  return { valid: true as const, code: coupon.code.toUpperCase(), discountTotal: Math.min(subtotal, Math.max(0, Math.round(discountTotal))), description: coupon.description ?? "" };
}

function invalid(message: string) { return { valid: false as const, message }; }

function toWooCoupon(input: PromotionPayload): WooCommerceCouponWritePayload {
  return {
    code: input.code.toLowerCase(),
    description: input.description,
    discount_type: input.discountType,
    amount: String(input.amount),
    date_expires: input.dateExpires ?? null,
    minimum_amount: String(input.minimumAmount ?? 0),
    maximum_amount: input.maximumAmount ? String(input.maximumAmount) : "",
    usage_limit: input.usageLimit ?? null,
    usage_limit_per_user: input.usageLimitPerUser ?? null,
    individual_use: input.individualUse,
    exclude_sale_items: input.excludeSaleItems,
    product_ids: input.productIds,
    product_categories: input.categoryIds,
  };
}
