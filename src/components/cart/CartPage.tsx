// src/components/cart/CartPage.tsx

"use client";

import { useCartItems, useCartHydrated } from "@/hooks/use-cart";
import { useOfistantStore } from "@/stores/ofistant-store";
import { ShoppingCart, Sparkles } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { CartLineItemView } from "./CartLineItemView";
import { CartSummary } from "./CartSummary";

export function CartPage() {
  const items = useCartItems();
  const hydrated = useCartHydrated();
  const resetToWelcome = useOfistantStore((s) => s.resetToWelcome);

  // SSR-safe: render skeleton until hydration complete
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
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
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
          <ShoppingCart className="h-8 w-8 text-slate-400" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">
          Keranjang masih kosong
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Telusuri katalog dan tambahkan produk. Keranjang tersimpan otomatis di
          browser ini.
        </p>
        <ButtonLink href="/catalog" className="mt-5" size="lg">
          Mulai belanja
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink lg:text-3xl">Keranjang</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {items.length} produk · edit quantity per ukuran kapan saja.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="space-y-3">
          {items.map((it) => (
            <CartLineItemView key={it.id} item={it} />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <ButtonLink href="/catalog" variant="ghost" onClick={() => resetToWelcome()}>
              <Sparkles className="h-4 w-4" />
              Lanjut eksplor produk
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Kembali ke beranda
            </ButtonLink>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CartSummary showCheckout />
        </aside>
      </div>
    </div>
  );
}
