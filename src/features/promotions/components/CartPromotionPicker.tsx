// src/features/promotions/components/CartPromotionPicker.tsx
// Daftar voucher publik di dalam ringkasan keranjang. Single-select: klik
// voucher menjalankan validasi server-side lewat handler induk (CartSummary)
// — diskon final tidak pernah dihitung di client.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TicketPercent } from "lucide-react";

import type { PublicPromotion } from "../promotion.types";

const MAX_VISIBLE = 3;

interface CartPromotionPickerProps {
  subtotal: number;
  appliedCode: string | null;
  checking: boolean;
  onApply: (code: string) => void;
}

export function CartPromotionPicker({
  subtotal,
  appliedCode,
  checking,
  onApply,
}: CartPromotionPickerProps) {
  const [promotions, setPromotions] = useState<PublicPromotion[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/promotions", { cache: "no-store" });
        const data = (await response.json()) as {
          ok?: boolean;
          promotions?: PublicPromotion[];
        };
        if (!cancelled && response.ok && data.ok) {
          setPromotions(data.promotions ?? []);
        } else if (!cancelled) {
          setPromotions([]);
        }
      } catch {
        if (!cancelled) setPromotions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (promotions === null || promotions.length === 0) return null;
  const visible = promotions.slice(0, MAX_VISIBLE);
  const hidden = promotions.length - visible.length;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
        <TicketPercent className="h-3.5 w-3.5" aria-hidden="true" />
        Voucher tersedia
      </p>
      <ul className="mt-2 space-y-1.5">
        {visible.map((promo) => {
          const selected = appliedCode === promo.code;
          const belowMinimum = promo.minimumAmount > subtotal;
          const reason = belowMinimum
            ? `Min. belanja Rp ${promo.minimumAmount.toLocaleString("id-ID")}`
            : promo.restrictionLabel;
          const disabled = belowMinimum || checking;
          return (
            <li key={promo.id}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onApply(promo.code)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                  selected
                    ? "border-brand-600 bg-brand-50"
                    : disabled
                      ? "cursor-not-allowed border-line bg-surface-muted opacity-60"
                      : "border-line bg-white hover:border-brand-300 hover:bg-brand-50/40"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                    selected ? "border-brand-700" : "border-line-strong"
                  }`}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-brand-700" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink">
                    {promo.displayTitle}
                    <span className="ml-1.5 font-mono text-[11px] font-semibold tracking-wider text-brand-700">
                      {promo.code}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                    {belowMinimum ? (
                      <span className="font-semibold text-amber-700">{reason}</span>
                    ) : (
                      (reason ?? promo.displaySubtitle)
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-center text-[11px] font-semibold text-brand-700">
        <Link href="/promo" className="rounded px-1 py-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          {hidden > 0 ? `Lihat semua promo (${hidden} lagi)` : "Lihat semua promo"}
        </Link>
      </p>
    </div>
  );
}
