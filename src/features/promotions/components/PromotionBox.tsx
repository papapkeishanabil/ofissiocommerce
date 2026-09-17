// src/features/promotions/components/PromotionBox.tsx
// Kotak kode promo bersama: dipakai ringkasan keranjang (CartSummary) dan
// ringkasan checkout (langkah mana pun). Validasi tetap server-side; hasil
// tersimpan di cart store sehingga kode yang dipakai di satu sisi langsung
// terbawa ke sisi lain.

"use client";

import { useEffect, useState } from "react";
import { TicketPercent, X } from "lucide-react";

import { formatIDR } from "@/types/product";
import { useCartHydrated } from "@/hooks/use-cart";
import { useCartStore } from "@/stores/cart-store";
import { CartPromotionPicker } from "./CartPromotionPicker";
import { PENDING_PROMO_STORAGE_KEY } from "../promotion.types";

export interface PromotionLine {
  productId: string;
  quantity: number;
  subtotal: number;
}

interface PromotionBoxProps {
  /** Baris keranjang untuk payload validasi server-side. */
  lines: PromotionLine[];
  /** Subtotal client saat ini — dipakai untuk menggugurkan kode saat qty berubah. */
  subtotal: number;
}

export function PromotionBox({ lines, subtotal }: PromotionBoxProps) {
  const hydrated = useCartHydrated();
  const appliedPromotion = useCartStore((state) => state.appliedPromotion);
  const setAppliedPromotion = useCartStore((state) => state.setAppliedPromotion);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Subtotal berubah (qty diedit di keranjang/checkout) → kode lama gugur.
  useEffect(() => {
    if (appliedPromotion && appliedPromotion.subtotalAtApply !== subtotal) setAppliedPromotion(null);
  }, [appliedPromotion, setAppliedPromotion, subtotal]);

  /** Validasi kode promo lewat server — dipakai input manual, picker voucher, dan handoff /promo. */
  async function applyPromotionCode(code: string) {
    const trimmed = code.trim();
    if (trimmed.length < 3) return;
    setCheckingPromo(true);
    setPromoMessage(null);
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, lines }),
      });
      const result = (await response.json()) as {
        valid?: boolean;
        code?: string;
        discountTotal?: number;
        message?: string;
      };
      if (!response.ok || !result.valid || !result.code) throw new Error(result.message ?? "Kode promo tidak valid.");
      setAppliedPromotion({ code: result.code, discountTotal: result.discountTotal ?? 0, subtotalAtApply: subtotal });
      setPromoCode("");
    } catch (error) {
      setPromoMessage(error instanceof Error ? error.message : "Kode promo tidak valid.");
    } finally {
      setCheckingPromo(false);
    }
  }

  // Handoff "Pakai voucher" dari /promo: konsumsi sekali setelah cart ter-hidrasi.
  useEffect(() => {
    if (!hydrated) return;
    let code: string | null = null;
    try {
      code = window.sessionStorage.getItem(PENDING_PROMO_STORAGE_KEY);
    } catch {
      return;
    }
    if (!code) return;
    try {
      window.sessionStorage.removeItem(PENDING_PROMO_STORAGE_KEY);
    } catch {
      // biarkan — key akan ditimpa pada handoff berikutnya
    }
    void applyPromotionCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return (
    <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-ink"><TicketPercent className="h-4 w-4 text-brand-700" />Kode promo</div>
      {appliedPromotion ? <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><span>{appliedPromotion.code}, hemat {formatIDR(appliedPromotion.discountTotal)}</span><button type="button" onClick={() => setAppliedPromotion(null)} aria-label="Hapus kode promo"><X className="h-4 w-4" /></button></div> : <div className="mt-2 flex gap-2"><input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="Masukkan kode" className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-xs uppercase outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-100" /><button type="button" disabled={checkingPromo || promoCode.trim().length < 3} onClick={() => void applyPromotionCode(promoCode)} className="h-10 rounded-lg bg-brand-700 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-50">{checkingPromo ? "Cek..." : "Gunakan"}</button></div>}
      {promoMessage ? <p className="mt-2 text-[11px] text-red-600">{promoMessage}</p> : null}
      <CartPromotionPicker
        subtotal={subtotal}
        appliedCode={appliedPromotion?.code ?? null}
        checking={checkingPromo}
        onApply={(code) => void applyPromotionCode(code)}
      />
    </div>
  );
}
