// src/components/cart/CartSummary.tsx
// Order summary block — used in cart page and checkout.

"use client";

import { useRouter } from "next/navigation";

import { formatIDR } from "@/types/product";
import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { useGatedAction } from "@/hooks/use-gated-action";
import { ArrowRight, Check, FileText, Receipt, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface CartSummaryProps {
  /** show checkout + request-quote CTAs (cart page). default false */
  showActions?: boolean;
}

export function CartSummary({ showActions = false }: CartSummaryProps) {
  const router = useRouter();
  const { attempt } = useGatedAction();
  const items = useCartItems();
  const hydrated = useCartHydrated();

  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);
  const subtotal = items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0);
  const estimatedTax = Math.round(subtotal * 0.11); // PPN 11% dummy
  const estimatedShipping = 0; // Phase 4B
  const total = subtotal + estimatedTax + estimatedShipping;

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  function handleCheckout() {
    if (attempt("checkout")) router.push("/checkout");
  }
  function handleQuote() {
    if (attempt("request_quote")) router.push("/quote");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm">
      <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-brand-50 to-transparent px-5 py-3.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-white">
          <Receipt className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold text-ink">Ringkasan</h2>
      </div>

      <div className="p-5">
        <dl className="space-y-2 text-sm">
          <Row label={`Subtotal (${totalQty} pcs)`} value={formatIDR(subtotal)} />
          <Row label="PPN 11% (estimasi)" value={formatIDR(estimatedTax)} muted />
          <Row label="Ongkos kirim" value="Dihitung saat checkout" muted italic />
        </dl>

        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <span className="text-sm font-semibold text-ink">Estimasi total</span>
          <div className="text-right leading-none">
            <span className="text-xl font-extrabold tracking-tight text-ink-strong">
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
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button className="w-full" variant="outline" onClick={handleQuote}>
              <FileText className="h-4 w-4" />
              Request Quotation
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              Checkout &amp; quotation butuh login. Anda akan diminta masuk bila
              belum.
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
          (italic ? "italic text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
