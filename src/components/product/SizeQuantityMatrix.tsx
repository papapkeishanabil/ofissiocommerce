// src/components/product/SizeQuantityMatrix.tsx
// Per-size quantity input with live total + MOQ validation.

"use client";

import { useEffect, useId, useState } from "react";
import type { ProductSizeStock } from "@/features/stock-monitoring/product-size-stock.types";

import { SIZES, type Size, type SizeMatrix } from "@/types/industry";
import { sumSizeMatrix } from "@/types/cart";
import { toNonNegInt } from "@/lib/utils";
import orderStyles from "./ProductOrderFields.module.css";
import { AlertTriangle, CheckCircle2, Info, Minus, Plus } from "lucide-react";

interface SizeQuantityMatrixProps {
  emphasized?: boolean;
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
  selectedOptions?: Record<string, string>;
  availableSizes?: string[];
}

export function SizeQuantityMatrix({
  value,
  emphasized = false,
  onChange,
  moq,
  sizeChart,
  disabled,
  embroideryMoq,
  hasEmbroidery,
  productId,
  color,
  selectedSleeve,
  selectedOptions,
  availableSizes,
}: SizeQuantityMatrixProps) {
  const optionsQuery = JSON.stringify(Object.fromEntries(Object.entries(selectedOptions ?? {}).sort(([a], [b]) => a.localeCompare(b))));
  const stockKey = productId && color ? JSON.stringify([productId, color, selectedSleeve, optionsQuery]) : "";
  const [stockState, setStockState] = useState<{ key: string; stock: ProductSizeStock | null }>({ key: "", stock: null });
  useEffect(() => {
    if (!productId || !color) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    fetch(`/api/products/${encodeURIComponent(productId)}/size-stock?color=${encodeURIComponent(color)}${selectedSleeve ? `&sleeve=${encodeURIComponent(selectedSleeve)}` : ""}&options=${encodeURIComponent(optionsQuery)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Stock unavailable");
        const result = await response.json() as { ok: boolean; stock: ProductSizeStock };
        if (!result.ok || !Array.isArray(result.stock?.rows)) throw new Error("Invalid stock response");
        if (!controller.signal.aborted) setStockState({ key: stockKey, stock: result.stock });
      })
      .catch(() => { if (!disposed) setStockState({ key: stockKey, stock: null }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [productId, color, selectedSleeve, stockKey, optionsQuery]);
  const stockLoading = !!stockKey && stockState.key !== stockKey;
  const currentStock = stockState.key === stockKey ? stockState.stock : null;
  const total = sumSizeMatrix(value);
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
    <div className={emphasized ? `${orderStyles.quantityPanel} space-y-3` : "space-y-3"}>
      <div data-part="quantity-heading" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div>
          <h3 className="text-sm font-bold text-ink">{availableSizes?.length === 1 && availableSizes[0] === "OS" ? "Jumlah produk" : emphasized ? "Pilih ukuran & jumlah" : "Atur quantity per ukuran"}</h3>
          {emphasized && <><p className={orderStyles.intro}>{availableSizes?.length === 1 && availableSizes[0] === "OS" ? "Masukkan jumlah produk yang ingin dipesan." : "Isi jumlah pada setiap ukuran yang ingin dipesan."}</p><span className={orderStyles.minimum}>Min. pemesanan {effectiveFloor} pcs</span></>}
        </div>
        {!emphasized && <span className="text-[11px] text-ink-muted">MOQ: {moq} pcs</span>}
      </div>

      <ul data-part="size-list" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2" role="list">
        {SIZES.filter(s => availableSizes ? availableSizes.some(size => size.toUpperCase().replace(/^XXL$/, "2XL") === s) : !["OS", "XS", "4XL", "5XL"].includes(s)).map((s) => {
          const sizeLabel = s === "OS" ? "Jumlah" : s === "2XL" ? "XXL" : s;
          const chart = sizeChart?.find((c) => c.size === s);
          const qty = value[s] ?? 0;
          const stock = currentStock?.rows.find(row => row.size.toUpperCase().replace(/^XXL$/, "2XL").replace(/^XXXL$/, "3XL") === s);
          const available = stock?.availableQty;
          return (
            <li key={s} data-part="size-card" data-selected={qty > 0} className="min-w-0 rounded-lg border border-line bg-surface p-2">
              <div data-part="size-heading" className="mb-1 flex items-baseline justify-between">
                <span data-part="size-name" className="text-xs font-bold text-ink">{sizeLabel}{emphasized && qty > 0 && <CheckCircle2 aria-label="Ukuran terisi" />}</span>
                {chart && (chart.chest > 0 || chart.length > 0) && (
                  <span data-part="size-measurements" className="text-[10px] text-ink-muted">
                    {chart.chest > 0 ? `${chart.chest}cm` : "—"} ×{" "}
                    {chart.length > 0 ? `${chart.length}cm` : "—"}
                  </span>
                )}
              </div>
              <div data-part="stepper" className="grid grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] items-center rounded-md border border-line bg-surface focus-within:border-ochre-600">
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
                  {s === "OS" ? "Jumlah produk" : `Quantity ukuran ${sizeLabel}`}
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
      <div data-part="quantity-total" data-state={total === 0 ? "empty" : meetsFloor ? "ready" : "warning"} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-muted px-3 py-3 [&_svg]:shrink-0">
        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
          <span data-part="total-label" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Total qty
          </span>
          <span data-part="total-value" className="text-lg font-bold tabular-nums text-ink" aria-live="polite">{total.toLocaleString("id-ID")} <small>pcs</small></span>
        </div>
        {total === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Info className="h-4 w-4" />
            {availableSizes?.length === 1 && availableSizes[0] === "OS" ? "Masukkan jumlah untuk melanjutkan pesanan." : "Isi jumlah di atas untuk melanjutkan pesanan."}
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
