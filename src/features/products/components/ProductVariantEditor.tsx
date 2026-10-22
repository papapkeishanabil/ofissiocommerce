"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { isSizeOption, type VariantOption, type ProductVariantInput } from "../product-variants";
import { applyVariantSizeGroup, generateVariantCombinations, variantSizeGroups, variantStockSku, type VariantSizeGroup } from "../variant-sku-generation";
import type { AdminProductImage } from "../woocommerce/woocommerce-product-admin.types";

const INPUT = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";
export function ProductVariantEditor({ options, onOptionsChange, variants, onChange, images, regularPrice, defaultSku, onDefaultChange, disabled, modelCode }: {
  options: VariantOption[]; onOptionsChange: (options: VariantOption[]) => void;
  variants: ProductVariantInput[]; onChange: (rows: ProductVariantInput[]) => void;
  images: AdminProductImage[]; regularPrice: number; defaultSku: string; onDefaultChange: (sku: string) => void; disabled: boolean;
  modelCode?: string;
}) {
  const [error, setError] = useState("");
  const sizeOption = options.find(o => isSizeOption(o.name));
  const groups = variantSizeGroups(options, variants);
  function generate() {
    try {
      const next = generateVariantCombinations(options, variants, regularPrice);
      if (variants.some(row => row.id && !next.some(nextRow => nextRow.id === row.id)) && !window.confirm("Pilihan baru mengubah kombinasi varian yang sudah tersimpan. Stok lama tidak dibagi otomatis ke ukuran baru. Lanjutkan?")) return;
      onChange(next);
      if (!next.some(row => row.sku === defaultSku)) onDefaultChange(next.find(row => row.sku)?.sku ?? "");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Periksa nama dan nilai pilihan varian."); }
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
      {!sizeOption && <button type="button" disabled={options.length >= 8} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-50" onClick={() => onOptionsChange([...options, { name: "Ukuran", values: ["S", "M", "L", "XL", "XXL"] }])}>Tambah pilihan Ukuran</button>}
      <button type="button" className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800" onClick={generate}>Buat / perbarui kombinasi</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!variants.length ? <p className="text-sm text-ink-muted">Belum ada kombinasi. Tambahkan pilihan, lalu buat kombinasi dan hapus yang tidak dijual.</p> : <>
      <label className="block max-w-lg text-sm font-semibold text-ink">Varian yang tampil pertama<select className={`${INPUT} mt-2`} value={defaultSku} onChange={e => onDefaultChange(e.target.value)} required><option value="">Pilih varian setelah mengisi SKU</option>{variants.filter(v => v.sku).map((row, i) => <option key={i} value={row.sku}>{Object.values(row.options).join(" / ")} — {row.sku}</option>)}</select></label>
      {sizeOption ? <section aria-label="Pengisian otomatis SKU ukuran" className="space-y-4">
        <div><h3 className="text-sm font-bold text-ink">Isi sekali per varian, SKU ukuran dibuat otomatis</h3><p className="mt-1 text-xs leading-5 text-ink-muted">Isi SKU varian tanpa ukuran, misalnya KK-006LPD. Sistem menambahkan -S, -M, dan ukuran lainnya. Foto dan harga dapat diterapkan ke seluruh ukuran. Harga quantity tetap mengikuti tier produk.</p></div>
        <div className="divide-y divide-line border-y border-line">{groups.map(group => <SizeGroupEditor key={group.key} group={group} sizeName={sizeOption.name} modelCode={options.length === 1 ? modelCode : undefined} images={images} regularPrice={regularPrice} onApply={input => {
          const next = applyVariantSizeGroup(options, variants, group.key, input);
          const selectedIndex = variants.findIndex(row => row.sku === defaultSku);
          onChange(next);
          onDefaultChange(selectedIndex >= 0 ? next[selectedIndex]?.sku || next.find(row => row.sku)?.sku || "" : next.find(row => row.sku)?.sku || "");
        }} />)}</div>
      </section> : <p className="text-xs leading-5 text-ink-muted">Jika stok dibedakan per ukuran, tambahkan pilihan Ukuran agar SKU stok dapat dibuat otomatis. Tanpa pilihan Ukuran, SKU di bawah dipakai langsung untuk stok.</p>}
      <details open={!sizeOption}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">{sizeOption ? `Rincian SKU per ukuran (${variants.length} kombinasi)` : "SKU, foto, dan harga varian"}</summary>
      <p className="pb-3 text-xs leading-5 text-ink-muted">SKU lengkap tetap dapat disesuaikan di sini jika berbeda dari pola. SKU yang sudah terisi dipertahankan saat mengisi otomatis, kecuali Anda memilih menggantinya.</p>
      <div className="divide-y divide-line border-y border-line">{variants.map((row, index) => <div key={index} className="space-y-3 py-5">
        <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-ink">{Object.values(row.options).join(" / ")}</h4><button type="button" className="min-h-11 min-w-11 rounded-lg text-red-700 hover:bg-red-50" aria-label={`Hapus kombinasi ${Object.values(row.options).join(" / ")}`} onClick={() => { if (row.id && !window.confirm("Varian ini akan dinonaktifkan saat produk disimpan. Lanjutkan?")) return; onChange(variants.filter((_, i) => i !== index)); if (row.sku === defaultSku) onDefaultChange(""); }}><Trash2 size={16} className="mx-auto" aria-hidden="true" /></button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-ink">SKU stok<input className={`${INPUT} mt-2`} value={row.sku} required maxLength={100} pattern="[A-Za-z0-9._\-]+" autoComplete="off" onChange={e => patch(index, { sku: e.target.value })} /></label>
          <VariantPhotoPicker label={`Foto ${Object.values(row.options).join(" / ")}`} value={row.imageSrc} images={images} onChange={imageSrc => patch(index, { imageSrc })} />
          <label className="text-xs font-semibold text-ink">Harga reguler (Rp)<input className={`${INPUT} mt-2`} type="number" required min={1} max={10000000000} value={row.regularPrice} onChange={e => patch(index, { regularPrice: Number(e.target.value) })} /></label>
        </div>
      </div>)}</div>
      </details>
    </>}
  </fieldset>;
}

function SizeGroupEditor({ group, sizeName, modelCode, images, regularPrice, onApply }: {
  group: VariantSizeGroup; sizeName: string; modelCode?: string; images: AdminProductImage[]; regularPrice: number;
  onApply: (input: { skuPrefix: string; imageSrc?: string; regularPrice?: number; replaceSkus?: boolean }) => void;
}) {
  const [prefixDraft, setPrefix] = useState<string>();
  const [photoDraft, setPhoto] = useState<string>();
  const [priceDraft, setPrice] = useState<string>();
  const [replaceSkus, setReplaceSkus] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const first = group.rows[0]!;
  const prefix = prefixDraft ?? (group.skuPrefix || modelCode || "");
  const photo = photoDraft ?? (group.rows.every(row => row.imageSrc === first.imageSrc) ? first.imageSrc : "__keep__");
  const price = priceDraft ?? (group.rows.every(row => row.regularPrice === first.regularPrice) ? String(first.regularPrice || regularPrice || "") : "");
  let preview = "";
  try { if (prefix) preview = group.rows.slice(0, 3).map(row => variantStockSku(prefix, row.options[sizeName]!)).join(", "); } catch { /* Display the validation error when applying. */ }
  function apply() {
    try {
      if (price && !(Number(price) > 0 && Number(price) <= 10_000_000_000)) throw new Error("Isi harga reguler lebih dari 0.");
      if (replaceSkus && group.rows.some(row => row.id && row.sku) && !window.confirm("SKU stok yang sudah tersimpan untuk varian ini akan diganti. Pastikan pola sesuai sistem stok. Lanjutkan?")) return;
      onApply({ skuPrefix: prefix, imageSrc: photo === "__keep__" ? undefined : photo, regularPrice: price ? Number(price) : undefined, replaceSkus });
      setMessage({ error: false, text: `${group.rows.length} ukuran diperbarui.${replaceSkus ? "" : " SKU yang sudah terisi tetap dipertahankan."} Simpan produk untuk menerapkan perubahan.` });
    } catch (cause) { setMessage({ error: true, text: cause instanceof Error ? cause.message : "Pengisian otomatis belum berhasil." }); }
  }
  return <div className="space-y-3 py-5">
    <h4 className="text-sm font-bold text-ink">{group.label} <span className="font-normal text-ink-muted">· {group.rows.length} ukuran</span></h4>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs font-semibold text-ink">SKU varian — {group.label}<input className={`${INPUT} mt-2`} value={prefix} placeholder="KK-006LPD" maxLength={90} autoComplete="off" onChange={event => { setPrefix(event.target.value); setMessage(null); }} /><span className="mt-1 block font-normal leading-5 text-ink-muted">Tanpa akhiran ukuran dan tanpa spasi.</span></label>
      <VariantPhotoPicker label={`Foto semua ukuran — ${group.label}`} value={photo} images={images} allowKeep onChange={setPhoto} />
      <label className="text-xs font-semibold text-ink">Harga semua ukuran (Rp) — {group.label}<input className={`${INPUT} mt-2`} type="number" min={1} max={10000000000} value={price} placeholder="Pertahankan harga per ukuran" onChange={event => setPrice(event.target.value)} /></label>
    </div>
    {preview && <p className="break-words text-xs leading-5 text-ink-muted">Contoh hasil: {preview}{group.rows.length > 3 ? ", …" : ""}</p>}
    <label className="flex min-h-11 items-center gap-3 text-xs text-ink"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand-700)]" checked={replaceSkus} onChange={event => setReplaceSkus(event.target.checked)} />Ganti juga SKU yang sudah terisi pada {group.label}</label>
    <button type="button" className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800" onClick={apply}>Terapkan ke semua ukuran — {group.label}</button>
    {message && <p role={message.error ? "alert" : "status"} className={`text-xs leading-5 ${message.error ? "text-red-700" : "text-ink"}`}>{message.text}</p>}
  </div>;
}

function VariantPhotoPicker({ label, value, images, allowKeep, onChange }: {
  label: string; value: string; images: AdminProductImage[]; allowKeep?: boolean; onChange: (src: string) => void;
}) {
  const selectedSrc = value === "__keep__" ? "" : value || images[0]?.src;
  return <div className="min-w-0 space-y-2">
    <label className="block text-xs font-semibold text-ink">{label}
      <select className={`${INPUT} mt-2`} value={value} onChange={event => onChange(event.target.value)}>
        {allowKeep && <option value="__keep__">Pertahankan foto per ukuran</option>}
        <option value="">Gunakan foto utama</option>
        {value && value !== "__keep__" && !images.some(image => image.src === value) && <option value={value}>Foto di luar galeri</option>}
        {images.map((image, index) => <option key={image.src} value={image.src}>Foto {index + 1} — {image.name || "Foto produk"}</option>)}
      </select>
    </label>
    {selectedSrc && <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- Admin previews include uploaded blob URLs and external gallery images. */}
      <img src={selectedSrc} alt={`Pratinjau ${label}`} width={80} height={80} className="h-20 w-20 rounded-lg bg-slate-50 object-contain" loading="lazy" decoding="async" />
      <p className="text-xs leading-5 text-ink-muted">{value ? "Foto yang dipilih" : "Menggunakan foto utama"}</p>
    </div>}
    {images.length ? <div role="group" aria-label={`Pilihan ${label}`} className="flex max-h-60 flex-wrap gap-2 overflow-y-auto p-1">
      {images.map((image, index) => <button key={image.src} type="button" aria-label={`Pilih foto ${index + 1} untuk ${label}`} aria-pressed={value === image.src} title={image.name || `Foto ${index + 1}`} onClick={() => onChange(image.src)} className={`min-h-11 w-16 rounded-lg border-2 p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${value === image.src ? "border-brand-700 bg-blue-50" : "border-line bg-white hover:border-brand-700"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Gallery thumbnails must support local upload previews. */}
        <img src={image.src} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-full object-contain" />
        <span className="block text-xs text-ink">Foto {index + 1}</span>
      </button>)}
    </div> : <p className="text-xs text-ink-muted">Tambahkan foto di bagian Foto Produk untuk memilih foto varian.</p>}
  </div>;
}
