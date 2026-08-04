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

  // SSR-safe: render skeleton until hydration complete
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
        <div className="h-24 w-full animate-pulse rounded-3xl bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
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
      <section className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-6 shadow-glow-brand lg:px-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="type-eyebrow text-brand-200">Keranjang</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white lg:text-[1.75rem]">
              Tinjau pilihan Anda
            </h1>
            <p className="mt-1.5 text-sm text-brand-100">
              {items.length} produk · edit quantity per ukuran kapan saja.
            </p>
          </div>
          <ButtonLink
            href="/catalog"
            className="border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            Tambah produk
          </ButtonLink>
        </div>
      </section>

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
