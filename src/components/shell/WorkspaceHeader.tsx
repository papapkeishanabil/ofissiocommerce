// src/components/shell/WorkspaceHeader.tsx
// Top bar of the commerce workspace: brand + cart access (easy on mobile).

import Link from "next/link";

import { useCartCount, useCartHydrated } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";

export function WorkspaceHeader() {
  const count = useCartCount();
  const hydrated = useCartHydrated();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight text-ink"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
          O
        </span>
        <span className="text-base">
          Ofissio<span className="text-brand-600">.</span>
        </span>
      </Link>

      <Link
        href="/cart"
        className="relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-slate-100"
        aria-label="Lihat keranjang"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden sm:inline">Keranjang</span>
        {hydrated && count > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </header>
  );
}
