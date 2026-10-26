// src/components/cart/CartPage.tsx

"use client";

import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { ArrowRight, ShoppingCart, Sparkles } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CartPreviewLine } from "./CartPreviewLine";
import { AccountLayout } from "@/features/dashboard/components/AccountLayout";
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
    <AccountLayout active="cart"><div className={styles.page} data-cart-page>
      <header className={styles.header}>
        <div><h1>Keranjang Belanja</h1><p>{unpaid.orders.length > 0 ? `${unpaid.orders.length} pesanan tersimpan dan siap dilanjutkan pembayarannya.` : "Periksa produk dan pesanan Anda sebelum melanjutkan."}</p></div>
        <Link href="/catalog" className={styles.shopLink}>Lanjut belanja <ArrowRight size={16} aria-hidden="true" /></Link>
      </header>
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
      <div className={styles.workspace}><div className={styles.itemsColumn}>
      <section aria-label="Produk dalam keranjang" className={styles.items}>
        <div className={styles.listHeading}><h2>Produk pilihan Anda</h2><span>{items.length} produk · {totalQty} pcs</span></div>
        {items.map(item=><CartPreviewLine key={item.id} item={item} />)}
      </section>
      <section className={styles.note}><label htmlFor="order-note" className="mb-2 block text-sm font-semibold">Catatan pesanan <span className={styles.muted}>(opsional)</span></label><textarea id="order-note" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Tulis catatan untuk pesanan ini..." className="min-h-24 w-full resize-y rounded-lg border border-line bg-white p-3 text-sm" /></section>
      </div><aside className={styles.orderSummary} aria-label="Ringkasan dan promo"><CartSummary showActions /></aside></div>
      <footer className={styles.checkoutBar}>
        <div><p className="text-xl font-bold tabular-nums">{formatIDR(Math.round(estimatedTotal))} <span className="text-xs">/ {totalQty} pcs</span></p><p className="text-[11px] text-ink-muted">{items.length} produk di keranjang, termasuk estimasi PPN</p></div>
        <div className="flex flex-wrap gap-2"><ButtonLink href="/catalog" variant="outline">Lanjutkan Belanja</ButtonLink><Button onClick={continueOrder}>{items.some(hasCartCustomization)?"Ajukan Penawaran Bordir":"Lanjut ke Checkout"}<ArrowRight className="h-4 w-4" /></Button></div>
      </footer>
      </>}
    </div></AccountLayout>
  );
}
