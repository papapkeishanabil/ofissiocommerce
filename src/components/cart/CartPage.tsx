// src/components/cart/CartPage.tsx

"use client";

import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { ArrowLeft, ShoppingCart, Sparkles } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { CartLineItemView } from "./CartLineItemView";
import { CartSummary } from "./CartSummary";

export function CartPage() {
  const items = useCartItems();
  const hydrated = useCartHydrated();
  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);

  // SSR-safe: render skeleton until hydration complete
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-muted" />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Tinjau pilihan Anda
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {items.length} produk · {totalQty} pcs · edit quantity per ukuran
            kapan saja.
          </p>
        </div>
        <ButtonLink href="/catalog" variant="outline" size="sm">
          <Sparkles className="h-4 w-4" />
          Tambah produk
        </ButtonLink>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="space-y-3">
          {items.map((it, index) => (
            <CartLineItemView key={it.id} item={it} index={index} />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <ButtonLink href="/catalog" variant="ghost" size="sm">
              <Sparkles className="h-4 w-4" />
              Lanjut eksplor produk
            </ButtonLink>
            <ButtonLink href="/" variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </ButtonLink>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CartSummary showActions />
        </aside>
      </div>
    </div>
  );
}
