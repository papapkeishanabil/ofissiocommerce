// src/components/cart/CartPage.tsx

"use client";

import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { ArrowRight, Check, ShoppingCart, Sparkles } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CartPreviewLine } from "./CartPreviewLine";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useCartStore } from "@/stores/cart-store";
import { formatIDR } from "@/types/product";
import { hasCartCustomization } from "@/types/cart";
import { useGatedAction } from "@/hooks/use-gated-action";
import { useRouter } from "next/navigation";
import { CartSummary } from "./CartSummary";

export function CartPage() {
  const items = useCartItems();
  const hydrated = useCartHydrated();
  const router = useRouter();
  const { attempt } = useGatedAction();
  const note = useCartStore(s => s.orderNote);
  const setNote = useCartStore(s => s.setOrderNote);
  const promotion = useCartStore(s => s.appliedPromotion);
  const subtotal = items.reduce((sum,item)=>sum+(item.finalEstimatedTotal??item.estimatedPrice),0);
  const discount = promotion?.subtotalAtApply===subtotal ? promotion.discountTotal : 0;
  const netSubtotal = Math.max(0,subtotal-discount);
  const estimatedTotal = netSubtotal + Math.round(netSubtotal * 0.11);
  function continueOrder() {
    const quote=items.some(hasCartCustomization);
    if(attempt(quote?"request_quote":"checkout")) router.push(quote?"/quote":"/checkout");
  }
  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);

  // SSR-safe: render skeleton until hydration complete
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[1680px] px-4 py-8 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-muted" />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface-muted" />
          <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-2xl place-items-center px-4 py-16 text-center lg:px-8">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShoppingCart className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">Keranjang masih kosong</h1>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          Telusuri katalog dan tambahkan produk sesuai kebutuhan tim Anda.
        </p>
        <ButtonLink href="/catalog" className="mt-5" size="lg">
          Mulai belanja
        </ButtonLink>
        <ButtonLink href="/custom-request" variant="outline" size="sm" className="mt-3">
          <Sparkles className="h-4 w-4" />
          Ajukan Seragam Full Custom
        </ButtonLink>
        <p className="mt-4 text-xs text-ink-subtle">
          Keranjang tersimpan otomatis di browser ini.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[1680px] flex-col px-4 lg:px-8">
      <div className="commerce-breadcrumb-row flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{label:"Beranda",href:"/"},{label:"Keranjang"}]} />
        <ol aria-label="Tahapan belanja" className="flex items-center gap-3 text-xs text-ink-muted">
          {["Produk","Keranjang","Checkout"].map((label,i)=><li key={label} aria-current={i===1?"step":undefined} className="flex items-center gap-2">
            {i>0 && <span className="mr-1 h-px w-5 bg-line sm:w-12" />}
            <span className={"grid h-5 w-5 place-items-center rounded-full " + (i<2?"bg-ochre-600 text-white":"border border-line")}>{i===0?<Check className="h-3 w-3"/>:i+1}</span>
            <span className={i===1?"font-semibold text-ink":""}>{label}</span>
          </li>)}
        </ol>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Keranjang Belanja</h1>
      <p className="mt-1 text-sm text-ink-muted">Periksa kembali produk dan quantity sebelum melanjutkan.</p>
      <section aria-label="Produk dalam keranjang" className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        <div aria-hidden="true" className="hidden grid-cols-[2fr_1.1fr_1.5fr_1.7fr] gap-4 border-b border-line bg-surface-muted px-4 py-3 text-xs font-semibold text-ink-muted md:grid"><span>Produk</span><span>Warna</span><span>Ukuran &amp; Jumlah</span><span>Total</span></div>
        {items.map(item=><CartPreviewLine key={item.id} item={item} />)}
      </section>
      <div className="mb-5 mt-4 grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <div><label htmlFor="order-note" className="mb-2 block text-xs font-semibold">Catatan (opsional)</label><textarea id="order-note" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Tulis catatan untuk pesanan ini..." className="min-h-24 w-full resize-y rounded-lg border border-line bg-white p-3 text-sm" /></div>
        <div><div className="flex items-center justify-between gap-4 rounded-lg border border-ochre-100 bg-ochre-50/40 p-4"><span className="text-sm font-semibold">Subtotal ({totalQty} pcs)</span><strong className="text-xl tabular-nums">{formatIDR(subtotal)}</strong></div>
        <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold">Rincian biaya, promo &amp; quotation</summary><div className="mt-2"><CartSummary /><Button className="mt-2 w-full" variant="outline" onClick={()=>{if(attempt("request_quote")) router.push("/quote");}}>Request Quotation</Button></div></details></div>
      </div>
      <footer className="sticky bottom-0 z-20 -mx-4 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 lg:-mx-8 lg:px-8">
        <div><p className="text-xl font-bold tabular-nums">{formatIDR(Math.round(estimatedTotal))} <span className="text-xs">/ {totalQty} pcs</span></p><p className="text-[11px] text-ink-muted">{items.length} produk di keranjang, termasuk estimasi PPN</p></div>
        <div className="flex flex-wrap gap-2"><ButtonLink href="/catalog" variant="outline">Lanjutkan Belanja</ButtonLink><Button onClick={continueOrder}>{items.some(hasCartCustomization)?"Ajukan Penawaran Bordir":"Lanjut ke Checkout"}<ArrowRight className="h-4 w-4" /></Button></div>
      </footer>
    </div>
  );
}
