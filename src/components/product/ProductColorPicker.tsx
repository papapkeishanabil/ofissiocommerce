"use client";
/* eslint-disable @next/next/no-img-element -- Thumbnail URLs come from dynamic WordPress media hosts. */

import { CheckCircle2 } from "lucide-react";
import { productColorDisplayLabel, productColorSwatchStyle, productFabricColor } from "@/lib/product-colors";
import { selectedColorVariant } from "@/features/products/color-variants";
import { isColorOption, isSizeOption } from "@/features/products/product-variants";
import type { OfissioProduct } from "@/features/products/product.types";

export function ProductColorPicker({ product, color, onChange, selectedOptions }: {
  product: OfissioProduct;
  color: string;
  onChange: (color: string) => void;
  selectedOptions?: Record<string, string>;
}) {
  const generic = product.productKind === "variable";
  const colorOption = generic ? product.variantOptions?.find(option => isColorOption(option.name)) : undefined;
  const colors = colorOption?.values ?? product.colors;
  const currentVariant = generic ? undefined : selectedColorVariant(product, color);
  return <>
    <div className="mt-3 space-y-3">
      <p className="text-xs font-bold text-brand-900">Warna: <span>{productColorDisplayLabel(color)}</span></p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan warna">
        {colors.map((value) => {
          const active = value === color;
          const label = productColorDisplayLabel(value);
          const imageSrc = generic && colorOption
            ? product.productVariants?.find(row => row.imageSrc && row.options[colorOption.name] === value &&
              (product.variantOptions ?? []).every(option => isColorOption(option.name) || isSizeOption(option.name) ||
                !selectedOptions?.[option.name] || row.options[option.name] === selectedOptions[option.name]))?.imageSrc
            : selectedColorVariant(product, value)?.imageSrc;
          const saved = productFabricColor(product, value);
          const swatch = saved ? { backgroundColor: saved } : productColorSwatchStyle(value);
          return <button
            key={value} type="button" onClick={() => onChange(value)}
            aria-label={`Pilih warna ${label}`} aria-pressed={active} title={label}
            className={
              "relative inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 " +
              (active ? "border-brand-900 ring-2 ring-brand-900 ring-offset-2" : "border-line hover:border-brand-500")
            }
          >
            {imageSrc ? <img src={imageSrc} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded object-cover" /> : <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-line" style={swatch} />}
            <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
            {active ? <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full fill-brand-900 text-white ring-2 ring-white" strokeWidth={3} aria-hidden="true" /> : null}
          </button>;
        })}
      </div>
    </div>
    {currentVariant ? <p className="mt-2 text-xs text-ink-muted" aria-live="polite">SKU: {currentVariant.sku}</p> : null}
  </>;
}
