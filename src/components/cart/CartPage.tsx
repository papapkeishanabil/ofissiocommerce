// src/components/cart/CartPage.tsx

"use client";

import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { ArrowRight, ShoppingCart, Sparkles } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CartPreviewLine } from "./CartPreviewLine";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useCartStore } from "@/stores/cart-store";
import { formatIDR } from "@/types/product";
import { hasCartCustomization } from "@/types/cart";
import { useGatedAction } from "@/hooks/use-gated-action";
import { useRouter } from "next/navigation";
import { CartSummary } from "./CartSummary";
import { UnpaidOrders } from "./UnpaidOrders";
import { useState } from "react";
import Link from "next/link";
import { useUnpaidOrders } from "@/hooks/use-unpaid-orders";
import styles from "./CartPage.module.css";

export function CartPage() {
  const items = useCartItems();
  const unpaid = useUnpaidOrders();
  const [chosenView, setChosenView] = useState<"cart" | "pending" | null>(null);
  const view = chosenView ?? (items.length === 0 && unpaid.orders.length > 0 ? "pending" : "cart");
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

  return (
    <div className={styles.page}><div className={styles.container}>
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Keranjang" }]} />
      <div className={styles.intro}>
        <div><h1>Selesaikan pesanan Anda</h1><p>{unpaid.orders.length > 0 ? `${unpaid.orders.length} pesanan tersimpan dan siap dilanjutkan pembayarannya.` : "Periksa produk dan pesanan Anda sebelum melanjutkan."}</p></div>
        <Link href="/catalog" className={styles.shopLink}>Lanjut belanja <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <nav aria-label="Tampilan keranjang" className={styles.tabs}>
        <button type="button" className={styles.tab} aria-pressed={view === "cart"} onClick={() => setChosenView("cart")}>Keranjang <span className={styles.count}>{items.length}</span></button>
        <button type="button" className={styles.tab} aria-pressed={view === "pending"} onClick={() => setChosenView("pending")}>Menunggu pembayaran <span className={styles.count}>{unpaid.loading ? "…" : unpaid.error ? "—" : unpaid.orders.length}</span></button>
      </nav>
      {unpaid.error && <div role="status" className={styles.notice}>Pesanan belum dapat dimuat. Periksa pesanan Anda sebelum checkout kembali. <Link href="/dashboard?view=orders" className="underline">Lihat pesanan saya</Link></div>}
      {unpaid.loading && <p role="status" className={styles.muted}>Memeriksa pesanan yang belum dibayar…</p>}
      {view === "pending" ? (unpaid.loading || unpaid.error ? null : unpaid.authenticated ? <UnpaidOrders key={unpaid.scope} orders={unpaid.orders} cartCount={items.length} onShowCart={() => setChosenView("cart")} /> : <div className={styles.notice}>Masuk ke akun Anda untuk melihat pesanan yang belum dibayar. <Link href="/dashboard" className="underline">Masuk ke akun</Link></div>) : items.length === 0 ? (
        <section className={styles.empty} aria-label="Keranjang kosong">
          <ShoppingCart size={30} aria-hidden="true" /><h2>Keranjang Anda masih kosong</h2>
          <p className={styles.muted}>Temukan seragam kerja yang sesuai dengan kebutuhan tim Anda.</p>
          <Link href="/catalog" className={styles.primary}>Mulai belanja <ArrowRight size={16} aria-hidden="true" /></Link>
          <ButtonLink href="/custom-request" variant="outline" size="sm"><Sparkles className="h-4 w-4" />Ajukan Seragam Full Custom</ButtonLink>
        </section>
      ) : <>
      <section aria-label="Produk dalam keranjang" className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        <div aria-hidden="true" className="hidden grid-cols-[2fr_1.1fr_1.5fr_1.7fr] gap-4 border-b border-line bg-surface-muted px-4 py-3 text-xs font-semibold text-ink-muted md:grid"><span>Produk</span><span>Warna</span><span>Ukuran &amp; Jumlah</span><span>Total</span></div>
        {items.map(item=><CartPreviewLine key={item.id} item={item} />)}
      </section>
      <div className="mb-5 mt-4 grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <div><label htmlFor="order-note" className="mb-2 block text-xs font-semibold">Catatan (opsional)</label><textarea id="order-note" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Tulis catatan untuk pesanan ini..." className="min-h-24 w-full resize-y rounded-lg border border-line bg-white p-3 text-sm" /></div>
        <div><div className="flex items-center justify-between gap-4 rounded-lg border border-ochre-100 bg-ochre-50/40 p-4"><span className="text-sm font-semibold">Subtotal ({totalQty} pcs)</span><strong className="text-xl tabular-nums">{formatIDR(subtotal)}</strong></div>
        <details open className="mt-3"><summary className="cursor-pointer text-xs font-semibold">Rincian biaya, promo &amp; quotation</summary><div className="mt-2"><CartSummary /><Button className="mt-2 w-full" variant="outline" onClick={()=>{if(attempt("request_quote")) router.push("/quote");}}>Request Quotation</Button></div></details></div>
      </div>
      <footer className="sticky bottom-0 z-20 -mx-4 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 lg:-mx-8 lg:px-8">
        <div><p className="text-xl font-bold tabular-nums">{formatIDR(Math.round(estimatedTotal))} <span className="text-xs">/ {totalQty} pcs</span></p><p className="text-[11px] text-ink-muted">{items.length} produk di keranjang, termasuk estimasi PPN</p></div>
        <div className="flex flex-wrap gap-2"><ButtonLink href="/catalog" variant="outline">Lanjutkan Belanja</ButtonLink><Button onClick={continueOrder}>{items.some(hasCartCustomization)?"Ajukan Penawaran Bordir":"Lanjut ke Checkout"}<ArrowRight className="h-4 w-4" /></Button></div>
      </footer>
      </>}
    </div></div>
  );
}
