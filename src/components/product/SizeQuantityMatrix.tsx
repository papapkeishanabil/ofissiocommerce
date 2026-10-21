// src/components/product/SizeQuantityMatrix.tsx
// Per-size quantity input with live total + MOQ validation.

"use client";

import { useEffect, useId, useState } from "react";
import type { ProductSizeStock } from "@/features/stock-monitoring/product-size-stock.types";

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
  /** Batas keras bordir (master MOQ); tampil hanya saat line meminta bordir. */
  embroideryMoq?: number;
  /** Line ini meminta bordir (placement 3D atau note ber-keyword bordir). */
  hasEmbroidery?: boolean;
  productId?: string;
  color?: string;
  selectedSleeve?: string;
  availableSizes?: string[];
}

export function SizeQuantityMatrix({
  value,
  onChange,
  moq,
  sizeChart,
  disabled,
  embroideryMoq,
  hasEmbroidery,
  productId,
  color,
  selectedSleeve,
  availableSizes,
}: SizeQuantityMatrixProps) {
  const stockKey = productId && color ? JSON.stringify([productId, color, selectedSleeve]) : "";
  const [stockState, setStockState] = useState<{ key: string; stock: ProductSizeStock | null }>({ key: "", stock: null });
  useEffect(() => {
    if (!productId || !color) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    fetch(`/api/products/${encodeURIComponent(productId)}/size-stock?color=${encodeURIComponent(color)}${selectedSleeve ? `&sleeve=${encodeURIComponent(selectedSleeve)}` : ""}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Stock unavailable");
        const result = await response.json() as { ok: boolean; stock: ProductSizeStock };
        if (!result.ok || !Array.isArray(result.stock?.rows)) throw new Error("Invalid stock response");
        if (!controller.signal.aborted) setStockState({ key: stockKey, stock: result.stock });
      })
      .catch(() => { if (!disposed) setStockState({ key: stockKey, stock: null }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [productId, color, selectedSleeve, stockKey]);
  const stockLoading = !!stockKey && stockState.key !== stockKey;
  const currentStock = stockState.key === stockKey ? stockState.stock : null;
  const total = sumSizeMatrix(value);
  const meetsMoq = total >= moq;
  const effectiveFloor = hasEmbroidery && embroideryMoq != null
    ? Math.max(moq, embroideryMoq)
    : moq;
  const meetsFloor = total >= effectiveFloor;
  const listId = useId();

  function setSize(s: Size, qty: unknown) {
    onChange({ ...value, [s]: toNonNegInt(qty) });
  }

  function bump(s: Size, delta: number) {
    setSize(s, (value[s] ?? 0) + delta);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold text-ink">Atur quantity per ukuran</h3>
        <span className="text-[11px] text-ink-muted">MOQ: {moq} pcs</span>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2" role="list">
        {SIZES.filter(s => availableSizes ? availableSizes.some(size => size.toUpperCase().replace(/^XXL$/, "2XL") === s) : !["XS", "4XL", "5XL"].includes(s)).map((s) => {
          const sizeLabel = s === "2XL" ? "XXL" : s;
          const chart = sizeChart?.find((c) => c.size === s);
          const qty = value[s] ?? 0;
          const stock = currentStock?.rows.find(row => row.size.toUpperCase().replace(/^XXL$/, "2XL").replace(/^XXXL$/, "3XL") === s);
          const available = stock?.availableQty;
          return (
            <li key={s} className="min-w-0 rounded-lg border border-line bg-surface p-2">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-ink">{sizeLabel}</span>
                {chart && (chart.chest > 0 || chart.length > 0) && (
                  <span className="text-[10px] text-ink-muted">
                    {chart.chest > 0 ? `${chart.chest}cm` : "—"} ×{" "}
                    {chart.length > 0 ? `${chart.length}cm` : "—"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] items-center rounded-md border border-line bg-surface focus-within:border-ochre-600">
                <button
                  type="button"
                  aria-label={`Kurangi ${sizeLabel}`}
                  onClick={() => bump(s, -1)}
                  disabled={disabled || qty <= 0}
                  className="grid h-8 w-7 place-items-center rounded-l-md text-ink hover:bg-surface-muted disabled:opacity-40 pointer-coarse:h-11"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <label htmlFor={`${listId}-${s}`} className="sr-only">
                  Quantity ukuran {sizeLabel}
                </label>
                <input
                  id={`${listId}-${s}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-describedby={stockKey ? `${listId}-${s}-stock` : undefined}
                  step={1}
                  value={qty === 0 ? "" : qty}
                  placeholder="0"
                  onChange={(e) => setSize(s, e.target.value)}
                  disabled={disabled}
                  className="h-8 w-full min-w-0 appearance-textfield border-x border-line bg-transparent px-0.5 text-center text-sm font-semibold tabular-nums text-ink focus:outline-none disabled:bg-slate-50 pointer-coarse:h-11 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label={`Tambah ${sizeLabel}`}
                  onClick={() => bump(s, 1)}
                  disabled={disabled}
                  className="grid h-8 w-7 place-items-center rounded-r-md text-ink hover:bg-surface-muted disabled:opacity-40 pointer-coarse:h-11"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {stockKey ? <p id={`${listId}-${s}-stock`} className={`mt-1.5 text-[11px] leading-snug ${available === 0 ? "font-semibold text-red-700" : "text-ink-muted"}`} title={stock?.sku} aria-live="polite">
                {stockLoading ? "Memeriksa stok…" : available == null ? "Stok belum tersedia" : available === 0 ? "Stok habis" : `Stok: ${available.toLocaleString("id-ID")} pcs`}
                {available != null && qty > available ? <span className="mt-1 block text-amber-700">Jumlah melebihi stok tersedia.</span> : null}
              </p> : null}
            </li>
          );
        })}
      </ul>

      {/* Total + MOQ validation */}
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-muted px-3 py-3 [&_svg]:shrink-0">
        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Total qty
          </span>
          <span className="text-lg font-bold tabular-nums text-ink" aria-live="polite">{total} pcs</span>
        </div>
        {total === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <AlertTriangle className="h-4 w-4" />
            Pilih jumlah per ukuran untuk memesan.
          </p>
        ) : hasEmbroidery && embroideryMoq != null && embroideryMoq > moq && total < embroideryMoq ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Bordir minimal {embroideryMoq} pcs. Tambah {embroideryMoq - total} pcs lagi.
          </p>
        ) : meetsFloor ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            MOQ terpenuhi ({total} / {effectiveFloor})
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Kurang {effectiveFloor - total} pcs lagi untuk mencapai MOQ.
          </p>
        )}
      </div>
    </div>
  );
}
