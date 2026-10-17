"use client";
/* eslint-disable @next/next/no-img-element -- Thumbnail URLs come from dynamic WordPress media hosts. */

import { CheckCircle2 } from "lucide-react";
import { productColorDisplayLabel, productColorSwatchStyle } from "@/lib/product-colors";
import { selectedColorVariant } from "@/features/products/color-variants";
import type { OfissioProduct } from "@/features/products/product.types";

export function ProductColorPicker({ product, color, onChange }: { product: OfissioProduct; color: string; onChange: (color: string) => void }) {
  const currentVariant = selectedColorVariant(product, color);
  return <>
    <div className="mt-3 space-y-3">
      <p className="text-xs font-bold text-brand-900">Warna: <span>{productColorDisplayLabel(color)}</span></p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan warna">
        {product.colors.map((value) => {
          const active = value === color;
          const label = productColorDisplayLabel(value);
          const variant = selectedColorVariant(product, value);
          return <button
            key={value} type="button" onClick={() => onChange(value)}
            aria-label={`Pilih warna ${label}`} aria-pressed={active} title={label}
            className={
              (product.colorVariantsEnabled ? "relative inline-flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 " : "relative h-9 w-9 rounded-full border transition pointer-coarse:h-10 pointer-coarse:w-10 ") +
              (active ? "border-brand-900 ring-2 ring-brand-900 ring-offset-2" : "border-line hover:border-brand-500")
            }
            style={product.colorVariantsEnabled ? undefined : productColorSwatchStyle(value)}
          >
            {product.colorVariantsEnabled ? <>
              {variant?.imageSrc ? <img src={variant.imageSrc} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded object-cover" /> : <span className="h-6 w-6 rounded-full border border-line" style={productColorSwatchStyle(value)} />}
              <span>{label}</span>
            </> : null}
            {active ? <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full fill-brand-900 text-white ring-2 ring-white" strokeWidth={3} aria-hidden="true" /> : null}
          </button>;
        })}
      </div>
    </div>
    {currentVariant ? <p className="mt-2 text-xs text-ink-muted" aria-live="polite">SKU: {currentVariant.sku}</p> : null}
  </>;
}
