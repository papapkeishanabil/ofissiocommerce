"use client";

import { useId } from "react";
import { productColorDisplayLabel } from "@/lib/product-colors";
import { isProductColorActive, sellingColorKey } from "../product-color-selling";

export function ColorSellingStatus({ colors, inactiveColors, disabled, onChange }: {
  colors: string[];
  inactiveColors: string[];
  disabled: boolean;
  onChange: (colors: string[]) => void;
}) {
  const hintId = useId();
  const activeCount = colors.filter(color => isProductColorActive({ inactiveColors }, color)).length;
  return <fieldset disabled={disabled} aria-describedby={hintId} className="min-w-0 space-y-4">
    <legend className="text-base font-bold text-ink">Status penjualan warna</legend>
    <p id={hintId} className="text-sm leading-6 text-ink-muted">Nonaktifkan “Aktif dijual” untuk menyembunyikan warna dari customer pada seluruh ukuran. SKU, foto, stok, dan riwayat tetap tersimpan. Klik Simpan Perubahan untuk menerapkan.</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {colors.map(color => {
        const active = isProductColorActive({ inactiveColors }, color);
        return <label key={color} className={`flex min-h-20 cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 ${active ? "border-line bg-white" : "border-amber-200 bg-amber-50"}`}>
          <span className="min-w-0"><span className="block break-words text-sm font-bold text-ink">{productColorDisplayLabel(color)}</span><span className={`mt-1 block text-xs ${active ? "text-ink-muted" : "text-amber-900"}`}>{active ? "Tersedia untuk customer" : "Nonaktif · seluruh ukuran"}</span></span>
          <span className="flex shrink-0 flex-col items-center gap-1 text-xs font-semibold text-ink">
            <input type="checkbox" role="switch" aria-label={`Aktif dijual — ${productColorDisplayLabel(color)}`} checked={active} className="peer sr-only" onChange={event => {
              const others = inactiveColors.filter(value => sellingColorKey(value) !== sellingColorKey(color));
              onChange(event.target.checked ? others : [...others, color]);
            }} />
            <span aria-hidden="true" className="relative block h-6 w-10 rounded-full border border-line bg-slate-200 before:absolute before:left-1 before:top-1/2 before:h-4 before:w-4 before:-translate-y-1/2 before:rounded-full before:bg-white before:shadow-sm peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:before:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-700" />
            Aktif dijual
          </span>
        </label>;
      })}
    </div>
    <p className="text-xs leading-5 text-ink-muted">{activeCount} dari {colors.length} warna aktif. Jika warna pertama dinonaktifkan, customer otomatis melihat warna aktif berikutnya. Perubahan stok tidak mengubah pengaturan ini.</p>
    {activeCount === 0 && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Semua warna nonaktif. Produk tidak ditampilkan di katalog sampai minimal satu warna diaktifkan kembali.</p>}
  </fieldset>;
}
