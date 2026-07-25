// src/components/shell/CartButton.tsx
// Lightweight cart badge button used in headers/footers.

"use client";

import Link from "next/link";

import { useCartCount, useCartHydrated } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";

interface CartButtonProps {
  className?: string;
  label?: string;
}

export function CartButton({ className, label = "Keranjang" }: CartButtonProps) {
  const count = useCartCount();
  const hydrated = useCartHydrated();

  return (
    <Link
      href="/cart"
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-slate-100",
        className,
      )}
      aria-label="Lihat keranjang"
    >
      <ShoppingCart className="h-5 w-5" />
      <span>{label}</span>
      {hydrated && count > 0 && (
        <span
          aria-hidden
          className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
