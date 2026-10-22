"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { combinationKey, type VariantOption, type ProductVariantInput } from "../product-variants";
import type { AdminProductImage } from "../woocommerce/woocommerce-product-admin.types";

const INPUT = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";
export function ProductVariantEditor({ options, onOptionsChange, variants, onChange, images, regularPrice, defaultSku, onDefaultChange, disabled }: {
  options: VariantOption[]; onOptionsChange: (options: VariantOption[]) => void;
  variants: ProductVariantInput[]; onChange: (rows: ProductVariantInput[]) => void;
  images: AdminProductImage[]; regularPrice: number; defaultSku: string; onDefaultChange: (sku: string) => void; disabled: boolean;
}) {
  const [error, setError] = useState("");
  function generate() {
    if (!options.length || options.some(o => !o.name.trim() || !o.values.length)) { setError("Isi nama dan nilai setiap pilihan terlebih dahulu."); return; }
    const count = options.reduce((n, o) => n * o.values.length, 1);
    if (count > 1000) { setError("Maksimal 1.000 kombinasi. Kurangi pilihan atau tambahkan hanya kombinasi yang dijual."); return; }
    let combinations: Record<string, string>[] = [{}];
    for (const option of options) combinations = combinations.flatMap(row => option.values.map(value => ({ ...row, [option.name.trim()]: value })));
    const next = combinations.map(values => variants.find(row => combinationKey(options, row.options) === combinationKey(options, values)) ?? { options: values, sku: "", imageSrc: "", regularPrice });
    if (variants.some(row => !next.includes(row)) && !window.confirm("Kombinasi yang tidak sesuai pilihan baru akan dihapus saat disimpan. Lanjutkan?")) return;
    onChange(next); setError("");
  }
  function patch(index: number, patch: Partial<ProductVariantInput>) {
    const old = variants[index];
    onChange(variants.map((row, i) => i === index ? { ...row, ...patch } : row));
    if (patch.sku != null && old?.sku === defaultSku) onDefaultChange(patch.sku);
  }
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <legend className="text-sm font-semibold text-ink">Gunakan SKU dan foto per varian</legend>
    <p className="text-xs leading-5 text-ink-muted">Tentukan pilihan seperti Warna, Lengan, Saku, atau Ukuran. Setiap kombinasi yang dijual memiliki SKU stok sendiri. Foto boleh digunakan bersama; kosongkan untuk memakai foto utama. Stok mengikuti WooCommerce/Ginee.</p>
    <div className="space-y-3">
      {options.map((option, index) => <div key={index} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
        <label className="text-xs font-semibold text-ink">Nama pilihan {index + 1}<input className={`${INPUT} mt-2`} value={option.name} required maxLength={60} placeholder="Contoh: Lengan" onChange={e => onOptionsChange(options.map((o, i) => i === index ? { ...o, name: e.target.value } : o))} /></label>
        <label className="text-xs font-semibold text-ink">Nilai pilihan, pisahkan dengan koma<input className={`${INPUT} mt-2`} value={option.values.join(",")} required placeholder="Pendek, Panjang" onChange={e => onOptionsChange(options.map((o, i) => i === index ? { ...o, values: e.target.value.split(",") } : o))} onBlur={() => onOptionsChange(options.map(o => ({ name: o.name.trim(), values: o.values.map(v => v.trim()).filter(Boolean) })))} /></label>
        <button type="button" className="min-h-11 min-w-11 rounded-lg text-red-700 hover:bg-red-50 sm:mt-6" aria-label={`Hapus pilihan ${option.name || index + 1}`} onClick={() => onOptionsChange(options.filter((_, i) => i !== index))}><Trash2 className="mx-auto h-4 w-4" aria-hidden="true" /></button>
      </div>)}
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={options.length >= 8} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-50" onClick={() => onOptionsChange([...options, { name: "", values: [] }])}><Plus size={16} aria-hidden="true" />Tambah pilihan</button>
      <button type="button" className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800" onClick={generate}>Buat / perbarui kombinasi</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!variants.length ? <p className="text-sm text-ink-muted">Belum ada kombinasi. Tambahkan pilihan, lalu buat kombinasi dan hapus yang tidak dijual.</p> : <>
      <label className="block max-w-lg text-sm font-semibold text-ink">Varian yang tampil pertama<select className={`${INPUT} mt-2`} value={defaultSku} onChange={e => onDefaultChange(e.target.value)} required><option value="">Pilih varian setelah mengisi SKU</option>{variants.filter(v => v.sku).map((row, i) => <option key={i} value={row.sku}>{Object.values(row.options).join(" / ")} — {row.sku}</option>)}</select></label>
      <p className="text-xs text-ink-muted">Isi SKU persis seperti sistem stok, termasuk tanda hubung dan underscore. Harga quantity, bila aktif, mengikuti tier produk.</p>
      <div className="divide-y divide-line border-y border-line">{variants.map((row, index) => <div key={index} className="space-y-3 py-5">
        <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-ink">{Object.values(row.options).join(" / ")}</h4><button type="button" className="min-h-11 min-w-11 rounded-lg text-red-700 hover:bg-red-50" aria-label={`Hapus kombinasi ${Object.values(row.options).join(" / ")}`} onClick={() => { if (row.id && !window.confirm("Varian ini akan dinonaktifkan saat produk disimpan. Lanjutkan?")) return; onChange(variants.filter((_, i) => i !== index)); if (row.sku === defaultSku) onDefaultChange(""); }}><Trash2 size={16} className="mx-auto" aria-hidden="true" /></button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-ink">SKU stok<input className={`${INPUT} mt-2`} value={row.sku} required maxLength={100} pattern="[A-Za-z0-9._\-]+" autoComplete="off" onChange={e => patch(index, { sku: e.target.value })} /></label>
          <label className="text-xs font-semibold text-ink">Foto<select className={`${INPUT} mt-2`} value={row.imageSrc} onChange={e => patch(index, { imageSrc: e.target.value })}><option value="">Gunakan foto utama</option>{images.map((image, i) => <option key={image.src} value={image.src}>Foto {i + 1} — {image.name || "Foto produk"}</option>)}</select></label>
          <label className="text-xs font-semibold text-ink">Harga reguler (Rp)<input className={`${INPUT} mt-2`} type="number" required min={1} max={10000000000} value={row.regularPrice} onChange={e => patch(index, { regularPrice: Number(e.target.value) })} /></label>
        </div>
      </div>)}</div>
    </>}
  </fieldset>;
}
