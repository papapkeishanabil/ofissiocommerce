// src/components/product/SizeQuantityMatrix.tsx
// Per-size quantity input with live total + MOQ validation.

"use client";

import { useId } from "react";

import { SIZES, type Size, type SizeMatrix } from "@/types/industry";
import { sumSizeMatrix } from "@/types/cart";
import { toNonNegInt } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Minus, Plus } from "lucide-react";

interface SizeQuantityMatrixProps {
  value: SizeMatrix;
  onChange: (next: SizeMatrix) => void;
  moq: number;
  /** show size chart inline (chest/length) */
  sizeChart?: { size: Size; chest: number; length: number }[];
  disabled?: boolean;
}

export function SizeQuantityMatrix({
  value,
  onChange,
  moq,
  sizeChart,
  disabled,
}: SizeQuantityMatrixProps) {
  const total = sumSizeMatrix(value);
  const meetsMoq = total >= moq;
  const listId = useId();

  function setSize(s: Size, qty: number) {
    onChange({ ...value, [s]: toNonNegInt(qty) });
  }

  function bump(s: Size, delta: number) {
    setSize(s, (value[s] ?? 0) + delta);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Atur quantity per ukuran</h3>
        <span className="text-[11px] text-ink-muted">MOQ: {moq} pcs</span>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="list">
        {SIZES.map((s) => {
          const chart = sizeChart?.find((c) => c.size === s);
          const qty = value[s] ?? 0;
          return (
            <li key={s} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-bold text-ink">{s}</span>
                {chart && (chart.chest > 0 || chart.length > 0) && (
                  <span className="text-[10px] text-ink-muted">
                    {chart.chest > 0 ? `${chart.chest}cm` : "—"} ×{" "}
                    {chart.length > 0 ? `${chart.length}cm` : "—"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Kurangi ${s}`}
                  onClick={() => bump(s, -1)}
                  disabled={disabled || qty <= 0}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink hover:bg-slate-100 disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <label htmlFor={`${listId}-${s}`} className="sr-only">
                  Quantity ukuran {s}
                </label>
                <input
                  id={`${listId}-${s}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={qty === 0 ? "" : qty}
                  placeholder="0"
                  onChange={(e) => setSize(s, e.target.value)}
                  disabled={disabled}
                  className="h-8 w-full min-w-0 rounded-md border border-line bg-surface text-center text-sm font-semibold text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  aria-label={`Tambah ${s}`}
                  onClick={() => bump(s, 1)}
                  disabled={disabled}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink hover:bg-slate-100 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Total + MOQ validation */}
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Total qty
          </span>
          <span className="text-lg font-bold text-ink">{total} pcs</span>
        </div>
        {total === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <AlertTriangle className="h-4 w-4" />
            Pilih jumlah per ukuran untuk memesan.
          </p>
        ) : meetsMoq ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            MOQ terpenuhi ({total} / {moq})
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Kurang {moq - total} pcs lagi untuk mencapai MOQ.
          </p>
        )}
      </div>
    </div>
  );
}
