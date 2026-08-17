// src/components/cart/CartSummary.tsx
// Order summary block — used in cart page and checkout.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatIDR } from "@/types/product";
import { hasCartCustomization } from "@/types/cart";
import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { useGatedAction } from "@/hooks/use-gated-action";
import { ArrowRight, Check, FileText, Receipt, ShieldCheck, TicketPercent, X } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/Button";
import { CartPromotionPicker } from "@/features/promotions/components/CartPromotionPicker";
import { PENDING_PROMO_STORAGE_KEY } from "@/features/promotions/promotion.types";

interface CartSummaryProps {
  /** show checkout + request-quote CTAs (cart page). default false */
  showActions?: boolean;
}

export function CartSummary({ showActions = false }: CartSummaryProps) {
  const router = useRouter();
  const { attempt } = useGatedAction();
  const { isAuthenticated } = useAuth();
  const items = useCartItems();
  const hydrated = useCartHydrated();
  const appliedPromotion = useCartStore((state) => state.appliedPromotion);
  const setAppliedPromotion = useCartStore((state) => state.setAppliedPromotion);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);
  const subtotal = items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0);
  const discountTotal = appliedPromotion?.subtotalAtApply === subtotal ? appliedPromotion.discountTotal : 0;
  const estimatedTax = Math.round(Math.max(0, subtotal - discountTotal) * 0.11); // PPN 11% dummy
  const estimatedShipping = 0; // Phase 4B
  const total = Math.max(0, subtotal - discountTotal) + estimatedTax + estimatedShipping;
  const requiresEmbroideryConsultation = items.some(hasCartCustomization);

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
        body: JSON.stringify({
          code: trimmed,
          lines: items.map((item) => ({
            productId: item.productId,
            quantity: item.totalQty,
            subtotal: item.finalEstimatedTotal ?? item.estimatedPrice,
          })),
        }),
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

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  function handleCheckout() {
    if (requiresEmbroideryConsultation) {
      handleQuote();
      return;
    }
    if (attempt("checkout")) router.push("/checkout");
  }
  function handleQuote() {
    if (attempt("request_quote")) router.push("/quote");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm">
      <div className="flex items-center gap-2.5 border-b border-line bg-surface-muted px-5 py-3.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-white">
          <Receipt className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold text-ink">Ringkasan</h2>
      </div>

      <div className="p-5">
        <dl className="space-y-2 text-sm">
          <Row label={`Subtotal (${totalQty} pcs)`} value={formatIDR(subtotal)} />
          {discountTotal > 0 ? <Row label={`Promo ${appliedPromotion?.code}`} value={`- ${formatIDR(discountTotal)}`} /> : null}
          <Row label="PPN 11% (estimasi)" value={formatIDR(estimatedTax)} muted />
          <Row label="Ongkos kirim" value="Dihitung saat checkout" muted italic />
        </dl>

        <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink"><TicketPercent className="h-4 w-4 text-brand-700" />Kode promo</div>
          {appliedPromotion ? <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><span>{appliedPromotion.code} · hemat {formatIDR(appliedPromotion.discountTotal)}</span><button type="button" onClick={() => setAppliedPromotion(null)} aria-label="Hapus kode promo"><X className="h-4 w-4" /></button></div> : <div className="mt-2 flex gap-2"><input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="Masukkan kode" className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-xs uppercase outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-100" /><button type="button" disabled={checkingPromo || promoCode.trim().length < 3} onClick={() => void applyPromotionCode(promoCode)} className="h-10 rounded-lg bg-brand-700 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-50">{checkingPromo ? "Cek..." : "Gunakan"}</button></div>}
          {promoMessage ? <p className="mt-2 text-[11px] text-red-600">{promoMessage}</p> : null}
          <CartPromotionPicker
            subtotal={subtotal}
            appliedCode={appliedPromotion?.code ?? null}
            checking={checkingPromo}
            onApply={(code) => void applyPromotionCode(code)}
          />
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <span className="text-sm font-semibold text-ink">Estimasi total</span>
          <div className="text-right leading-none">
            <span className="text-2xl font-extrabold tracking-tight text-ink-strong tabular-nums">
              {formatIDR(total)}
            </span>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 text-[11px] leading-5 text-ink-muted">
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            Harga volume otomatis sesuai jumlah pesanan
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            Produksi 100% in-house oleh Ofissio
          </li>
        </ul>

        {showActions && (
          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={handleCheckout}>
              {requiresEmbroideryConsultation ? "Ajukan Jadwal & Penawaran Bordir" : "Checkout"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!requiresEmbroideryConsultation ? (
              <Button className="w-full" variant="outline" onClick={handleQuote}>
                <FileText className="h-4 w-4" />
                Request Quotation
              </Button>
            ) : null}
            {requiresEmbroideryConsultation ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-[11px] leading-4 text-amber-800">
                Tim Ofissio akan mengonfirmasi biaya bordir, tanggal selesai, dan perkiraan barang tiba sebelum pembayaran.
              </p>
            ) : null}
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              {requiresEmbroideryConsultation
                ? isAuthenticated
                  ? "Akun customer terverifikasi. Permintaan siap diajukan."
                  : "Permintaan jadwal dan penawaran memerlukan akun customer."
                : "Checkout & quotation butuh login. Anda akan diminta masuk bila belum."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  italic,
}: {
  label: string;
  value: string;
  muted?: boolean;
  italic?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-ink-muted" : "text-ink"}>{label}</dt>
      <dd
        className={
          (muted ? "text-ink-muted " : "font-semibold text-ink ") +
          (italic ? "italic text-xs" : " tabular-nums")
        }
      >
        {value}
      </dd>
    </div>
  );
}
