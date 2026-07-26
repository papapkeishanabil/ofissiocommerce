// src/components/cart/CartLineItemView.tsx

"use client";

import { useRouter } from "next/navigation";

import type { CartLineItem } from "@/types/cart";
import { formatIDR } from "@/types/product";
import { SIZES } from "@/types/industry";
import { useCartStore } from "@/stores/cart-store";
import { toNonNegInt } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface CartLineItemViewProps {
  item: CartLineItem;
}

export function CartLineItemView({ item }: CartLineItemViewProps) {
  const router = useRouter();
  const updateLineSizes = useCartStore((s) => s.updateLineSizes);
  const removeLine = useCartStore((s) => s.removeLine);

  function setSize(size: (typeof SIZES)[number], qty: unknown) {
    updateLineSizes(item.id, {
      ...item.sizes,
      [size]: toNonNegInt(qty),
    });
  }

  function bump(size: (typeof SIZES)[number], delta: number) {
    setSize(size, (item.sizes[size] ?? 0) + delta);
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/product/${item.productSlug}`)}
            className="block text-left text-sm font-bold text-ink hover:text-brand-700"
          >
            {item.productName}
          </button>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {item.sku}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">Warna: {item.color}</Badge>
            <Badge tone="neutral">{item.totalQty} pcs</Badge>
            {item.customization && (
              <Badge tone="amber" className="max-w-[200px] truncate">
                {item.customization}
              </Badge>
            )}
            {item.uniform3DConfig && item.uniform3DConfig.placements.length > 0 && (
              <Badge tone="success">
                {item.uniform3DConfig.placements.length} bordir ·{" "}
                {item.uniform3DConfig.placements
                  .map((p) => p.zone.replace(/_/g, " "))
                  .join(", ")}
              </Badge>
            )}
          </div>
          {item.uniform3DConfig &&
            item.uniform3DConfig.placements.length > 0 &&
            item.uniform3DConfig.snapshots.front && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-2.5 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.uniform3DConfig.snapshots.front}
                  alt="Pratinjau bordir"
                  className="h-9 w-9 rounded border border-line object-cover"
                />
                <span className="text-[10px] text-ink-muted">
                  Logo:{" "}
                  {item.uniform3DConfig.placements[0]?.logoFileName ?? "—"}
                </span>
              </div>
            )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-ink">
            {formatIDR(item.estimatedPrice)}
          </p>
          <p className="text-[11px] text-ink-muted">
            {formatIDR(item.unitPrice)} / pcs
          </p>
        </div>
      </div>

      {/* Per-size editor (compact) */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {SIZES.map((s) => {
          const qty = item.sizes[s] ?? 0;
          return (
            <div
              key={s}
              className="flex flex-col items-center rounded-lg border border-line py-1.5"
            >
              <span className="text-[10px] font-semibold uppercase text-ink-muted">
                {s}
              </span>
              <div className="mt-1 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={`Kurangi ${s}`}
                  onClick={() => bump(s, -1)}
                  disabled={qty <= 0}
                  className="grid h-5 w-5 place-items-center rounded border border-line text-ink hover:bg-slate-100 disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={qty === 0 ? "" : qty}
                  placeholder="0"
                  onChange={(e) => setSize(s, e.target.value)}
                  aria-label={`Qty ${s}`}
                  className="h-5 w-8 rounded border border-line bg-surface text-center text-[11px] font-semibold focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Tambah ${s}`}
                  onClick={() => bump(s, 1)}
                  className="grid h-5 w-5 place-items-center rounded border border-line text-ink hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <p className="text-[11px] text-ink-muted">
          Edit qty per ukuran langsung di atas.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => removeLine(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Hapus
        </Button>
      </div>
    </article>
  );
}
