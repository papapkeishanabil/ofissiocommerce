// src/components/cart/CartSummary.tsx
// Order summary block — used in cart page and checkout.

"use client";

import { useRouter } from "next/navigation";

import { formatIDR } from "@/types/product";
import { hasCartCustomization } from "@/types/cart";
import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { useGatedAction } from "@/hooks/use-gated-action";
import { ArrowRight, Check, FileText, Receipt, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/Button";
import { PromotionBox } from "@/features/promotions/components/PromotionBox";

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

  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);
  const subtotal = items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0);
  const discountTotal = appliedPromotion?.subtotalAtApply === subtotal ? appliedPromotion.discountTotal : 0;
  const estimatedTax = Math.round(Math.max(0, subtotal - discountTotal) * 0.11); // PPN 11% dummy
  const estimatedShipping = 0; // Phase 4B
  const total = Math.max(0, subtotal - discountTotal) + estimatedTax + estimatedShipping;
  const requiresEmbroideryConsultation = items.some(hasCartCustomization);

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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-white">
          <Receipt className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold text-ink">Ringkasan Pesanan</h2>
      </div>

      <div className="p-5">
        <dl className="space-y-2 text-sm">
          <Row label={`Subtotal (${totalQty} pcs)`} value={formatIDR(subtotal)} />
          {discountTotal > 0 ? <Row label={`Promo ${appliedPromotion?.code}`} value={`- ${formatIDR(discountTotal)}`} /> : null}
          <Row label="PPN 11% (estimasi)" value={formatIDR(estimatedTax)} muted />
          <Row label="Ongkos kirim" value="Dihitung saat checkout" muted italic />
        </dl>

        <PromotionBox
          lines={items.map((item) => ({
            productId: item.productId,
            quantity: item.totalQty,
            subtotal: item.finalEstimatedTotal ?? item.estimatedPrice,
          }))}
          subtotal={subtotal}
        />

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
              {requiresEmbroideryConsultation ? "Ajukan Jadwal & Penawaran Bordir" : "Lanjut ke Checkout"}
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
    <div className="flex items-start justify-between gap-4">
      <dt className={muted ? "text-ink-muted" : "text-ink"}>{label}</dt>
      <dd
        className={
          (muted ? "text-right text-ink-muted " : "text-right font-semibold text-ink ") +
          (italic ? "italic text-xs" : " tabular-nums")
        }
      >
        {value}
      </dd>
    </div>
  );
}
