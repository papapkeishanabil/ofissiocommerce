// src/components/cart/CartDrawer.tsx
// Optional slide-over drawer for quick cart preview.
// Mounted globally in Phase 1 but triggered by header cart button → /cart page.
// Kept for future use (e.g., Ofistant "Lihat keranjang" can open this as a peek).

"use client";

import { useEffect } from "react";

import { useCartItems } from "@/hooks/use-cart";
import { formatIDR } from "@/types/product";
import { X } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const items = useCartItems();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const total = items.reduce((a, it) => a + it.estimatedPrice, 0);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Pratinjau keranjang">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
      />
      <div className="absolute right-0 top-0 flex h-dvh w-full max-w-md flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-bold text-ink">Pratinjau keranjang</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              Keranjang kosong.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="rounded-lg border border-line p-3 text-sm"
                >
                  <p className="font-semibold text-ink">{it.productName}</p>
                  <p className="text-[11px] text-ink-muted">
                    {it.color} · {it.totalQty} pcs
                  </p>
                  <p className="mt-1 text-xs font-bold">
                    {formatIDR(it.estimatedPrice)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Estimasi total</span>
            <span className="font-bold text-ink">{formatIDR(total)}</span>
          </div>
          <ButtonLink href="/cart" className="mt-3 w-full">
            Lihat keranjang penuh
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
