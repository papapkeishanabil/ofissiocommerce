"use client";
/* eslint-disable @next/next/no-img-element -- Admin previews include local blob URLs before upload. */

import type { ColorVariantInput } from "../color-variants";
import type { AdminProductImage } from "../woocommerce/woocommerce-product-admin.types";
import { productColorDisplayLabel, fabricColorForName } from "@/lib/product-colors";

const INPUT = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ColorVariantEditor({ enabled, onEnabledChange, variants, onChange, defaultColor, onDefaultColorChange, images, disabled }: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  variants: ColorVariantInput[];
  onChange: (variant: ColorVariantInput) => void;
  defaultColor: string;
  onDefaultColorChange: (color: string) => void;
  images: AdminProductImage[];
  disabled: boolean;
}) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <legend className="sr-only">Varian warna produk</legend>
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold text-ink">
      <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-brand-700)]" />
      <span>Gunakan SKU dan foto per warna<span className="mt-1 block text-xs font-normal leading-5 text-ink-muted">Pembeli memilih warna dalam satu halaman produk. Harga dan pilihan ukuran mengikuti produk induk.</span></span>
    </label>
    {enabled ? <>
      {!variants.length ? <p className="text-sm text-ink-muted">Pilih warna pada bagian Katalog dan atribut terlebih dahulu.</p> : <>
        <label className="block max-w-sm text-sm font-semibold text-ink">Warna yang tampil pertama
          <select className={`${INPUT} mt-2`} aria-label="Warna yang tampil pertama" value={defaultColor} onChange={(event) => onDefaultColorChange(event.target.value)} required>
            {variants.map((variant) => <option key={variant.color} value={variant.color}>{productColorDisplayLabel(variant.color)}</option>)}
          </select>
        </label>
        <p className="text-xs leading-5 text-ink-muted">Unggah foto di bagian Foto Produk, lalu pasangkan foto ke setiap warna di bawah. Kosongkan stok jika tidak dilacak. Stok per warna merupakan gabungan seluruh ukuran.</p>
        <div className="divide-y divide-line border-y border-line">
          {variants.map((variant) => <div key={variant.color} className="grid min-w-0 gap-4 py-5 md:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_minmax(100px,0.65fr)] md:items-start">
            <div>
              {variant.imageSrc ? <img src={variant.imageSrc} alt={`Preview ${productColorDisplayLabel(variant.color)}`} width={80} height={80} loading="lazy" decoding="async" className="h-20 w-20 rounded-lg bg-slate-50 object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-lg bg-slate-50 text-xs text-ink-muted">Belum ada foto</div>}
              <p className="mt-2 text-sm font-bold text-ink">{productColorDisplayLabel(variant.color)}</p>
            </div>
            <label className="min-w-0 text-xs font-semibold text-ink">SKU {productColorDisplayLabel(variant.color)}
              <input className={`${INPUT} mt-2`} value={variant.sku} onChange={(event) => onChange({ ...variant, sku: event.target.value })} required maxLength={100} pattern="[A-Za-z0-9._\-]+" autoComplete="off" placeholder="FRM-Hitam" />
            </label>
            <label className="min-w-0 text-xs font-semibold text-ink">Foto {productColorDisplayLabel(variant.color)}
              <select className={`${INPUT} mt-2`} aria-label={`Foto ${productColorDisplayLabel(variant.color)}`} value={variant.imageSrc} onChange={(event) => onChange({ ...variant, imageSrc: event.target.value })} required>
                <option value="">Pilih foto dari galeri</option>
                {variant.imageSrc && !images.some((image) => image.src === variant.imageSrc) ? <option value={variant.imageSrc} disabled>Foto dihapus — pilih pengganti</option> : null}
                {images.map((image, index) => <option key={image.src} value={image.src}>Foto {index + 1} — {image.name || "Foto produk"}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-xs font-semibold text-ink">Stok {productColorDisplayLabel(variant.color)}
              <input className={`${INPUT} mt-2`} type="number" min={0} step={1} max={1_000_000_000} value={variant.stockQuantity ?? ""} onChange={(event) => onChange({ ...variant, stockQuantity: event.target.value === "" ? null : Number(event.target.value) })} placeholder="Tidak dilacak" />
            </label>
            <label className="min-w-0 text-xs font-semibold text-ink md:col-start-2 md:col-span-3">Warna kain 3D {productColorDisplayLabel(variant.color)}
              <span className="mt-2 flex items-center gap-3">
                <input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" value={variant.fabricColor ?? fabricColorForName(variant.color)} onChange={(event) => onChange({ ...variant, fabricColor: event.target.value })} />
                <span className="text-xs font-normal leading-5 text-ink-muted">Sesuaikan dengan foto produk. Berlaku untuk model 3D yang sudah disiapkan dengan area kain.</span>
              </span>
            </label>
          </div>)}
        </div>
      </>}
    </> : null}
  </fieldset>;
}
