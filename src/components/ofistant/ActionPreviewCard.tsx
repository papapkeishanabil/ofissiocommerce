// src/components/ofistant/ActionPreviewCard.tsx
// Renders the inline preview of an action that needs user confirmation
// (today: ADD_TO_CART). The user can confirm or cancel.

"use client";

import { formatIDR } from "@/types/product";
import { SIZES } from "@/types/industry";
import { CheckCircle2, ShoppingBag, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { AddToCartAction } from "@/lib/ofistant/ofistant.actions";

interface ActionPreviewCardProps {
  action: AddToCartAction;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ActionPreviewCard({
  action,
  onConfirm,
  onCancel,
  busy,
}: ActionPreviewCardProps) {
  const p = action.payload;
  const totalQty = SIZES.reduce(
    (a, s) => a + (p.sizeMatrix[s] ?? 0),
    0,
  );

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-brand-800">
          <ShoppingBag className="h-3.5 w-3.5" />
          Pratinjau penambahan ke keranjang
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Batal"
          className="grid h-6 w-6 place-items-center rounded text-ink-muted hover:bg-white/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 rounded-lg bg-surface p-2.5 text-xs">
        <p className="font-semibold text-ink">{p.productName}</p>
        <p className="text-ink-muted">Warna: {p.color}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {SIZES.filter((s) => (p.sizeMatrix[s] ?? 0) > 0).map((s) => (
            <span
              key={s}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink"
            >
              {s}: {p.sizeMatrix[s]}
            </span>
          ))}
        </div>
        <p className="mt-1.5 font-semibold text-ink">
          Total {totalQty} pcs
        </p>
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={onConfirm}
          disabled={busy}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {busy ? "Menambahkan…" : "Konfirmasi"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
      </div>

      <p className="mt-1.5 text-[10px] leading-snug text-ink-muted">
        Harga final & MOQ divalidasi ulang saat checkout. Estimasi dihitung dari
        harga “mulai dari” {formatIDR(0)}.
      </p>
    </div>
  );
}
