// src/components/cart/CartLineItemView.tsx

"use client";

import { useRouter } from "next/navigation";

import { hasCartCustomization, type CartLineItem } from "@/types/cart";
import { formatIDR } from "@/types/product";
import { SIZES } from "@/types/industry";
import { useCartStore } from "@/stores/cart-store";
import { cn, toNonNegInt } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductThumb } from "@/components/ui/ProductThumb";
import { calculateQuantityTierPrice } from "@/features/products/quantity-pricing";
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import { productColorDisplayLabel, productColorSwatchStyle } from "@/lib/product-colors";

interface CartLineItemViewProps {
  item: CartLineItem;
  index?: number;
}

export function CartLineItemView({ item, index = 0 }: CartLineItemViewProps) {
  const router = useRouter();
  const updateLineSizes = useCartStore((s) => s.updateLineSizes);
  const removeLine = useCartStore((s) => s.removeLine);
  const pricing = calculateQuantityTierPrice({
    regularPrice: item.regularPrice ?? item.priceFrom ?? item.unitPrice,
    totalQty: item.totalQty,
    quantityPricing: item.quantityPricing,
  });
  const processingInfo = resolveOrderProcessingInfo({
    processRoute: item.processRoute,
    fulfillmentType: item.fulfillmentType,
    leadTimeDays: item.leadTimeDays,
    hasEmbroidery: hasCartCustomization(item),
  });

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
    <article
      style={{ animationDelay: `${index * 60}ms` }}
      className="animate-fade-in-up rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:p-5"
    >
      <div className="flex items-start gap-3">
        <ProductThumb
          src={item.image}
          alt={item.productName}
          className="h-20 w-20 sm:h-24 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => router.push(`/product/${item.productSlug}`)}
                className="block text-left text-base font-bold leading-snug text-ink hover:text-brand-700"
              >
                {item.productName}
              </button>
              <p className="mt-0.5 font-mono text-[11px] text-ink-subtle">{item.sku}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-extrabold tracking-tight text-ink tabular-nums">
                {formatIDR(item.finalEstimatedTotal ?? item.estimatedPrice)}
              </p>
              <p className="text-[11px] text-ink-muted tabular-nums">
                {formatIDR(item.finalUnitPrice ?? item.unitPrice)} / pcs
              </p>
              {(item.quantityTierApplied ?? pricing.tierApplied) &&
              (item.quantityTierLabel ?? pricing.tierLabel) ? (
                <p className="mt-1 text-[10px] font-bold text-brand-700">
                  Tier: {item.quantityTierLabel ?? pricing.tierLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.color !== "Default" && <span className="inline-flex items-center gap-2 text-sm text-ink">
              <span className="h-4 w-4 rounded-full border border-black/10" style={productColorSwatchStyle(item.color)} aria-hidden="true" />
              {productColorDisplayLabel(item.color)}
            </span>}
            <Badge tone="neutral">{item.totalQty} pcs</Badge>
            {item.selectedSleeve && <Badge tone="neutral">{item.selectedSleeve}</Badge>}
            {Object.entries(item.selectedOptions ?? {}).filter(([name]) => !/^(warna|color)$/i.test(name)).map(([name, value]) => <Badge key={name} tone="neutral">{name}: {value}</Badge>)}
            {item.customization && (
              <Badge tone="amber" className="max-w-[200px] truncate">
                {item.customization}
              </Badge>
            )}
            {item.uniform3DConfig && item.uniform3DConfig.placements.length > 0 && (
              <Badge tone="success">
                {item.uniform3DConfig.placements.length} bordir,{" "}
                {item.uniform3DConfig.placements
                  .map((p) => p.zone.replace(/_/g, " "))
                  .join(", ")}
              </Badge>
            )}
            <Badge tone={processingInfo.kind === "ready_stock" ? "success" : "amber"}>
              {processingInfo.label}: {processingInfo.value}
            </Badge>
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
      </div>

      {(item.embroideryLines?.length ?? 0) > 0 ? (
        <div className="mt-3 space-y-2 rounded-xl border border-ochre-100 bg-ochre-50 p-3">
          <div className="flex justify-between text-[11px]"><span className="font-semibold text-ink-muted">Subtotal produk</span><strong className="tabular-nums">{formatIDR(item.productSubtotal ?? item.subtotal)}</strong></div>
          {item.embroideryLines.map((line) => (
            <div key={line.zoneId} className="flex flex-wrap items-start justify-between gap-3 text-[11px]">
              <div><p className="font-semibold text-ink">{line.label}</p><p className="text-ink-muted tabular-nums">{line.quantity} pcs × {formatIDR(line.unitPrice)}{line.setupFeeApplied ? ` + setup ${formatIDR(line.setupFee)}` : ""}</p></div>
              <strong className="tabular-nums">{formatIDR(line.subtotal)}</strong>
            </div>
          ))}
          <div className="flex justify-between border-t border-ochre-300 pt-2 text-xs font-bold text-ochre-700"><span>Total bordir</span><span className="tabular-nums">{formatIDR(item.embroideryTotal)}</span></div>
        </div>
      ) : null}
      {(item.missingEmbroideryPricingZones?.length ?? 0) > 0 ? <p className="mt-3 rounded-lg bg-ochre-50 px-3 py-2 text-[11px] font-semibold text-ochre-700">Harga bordir untuk zona ini perlu dikonfirmasi admin.</p> : null}

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
        {SIZES.filter((size) => (item.sizes[size] ?? 0) > 0).map((size) => (
          <div key={size} className="flex gap-2"><dt className="font-semibold">{size === "OS" ? "Jumlah" : size}</dt><dd className="text-ink-muted">{item.sizes[size]} pcs</dd></div>
        ))}
      </dl>
      <details className="mt-3">
      <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-ink">Ubah jumlah per ukuran</summary>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
        {SIZES.filter(s => item.availableSizes ? item.availableSizes.some(size => size.toUpperCase().replace(/^XXL$/, "2XL") === s) : !["OS", "XS", "4XL", "5XL"].includes(s) || (item.sizes[s] ?? 0) > 0).map((s) => {
          const qty = item.sizes[s] ?? 0;
          const active = qty > 0;
          return (
            <div
              key={s}
              className={cn(
                "flex flex-col items-center rounded-xl border py-2 transition-colors",
                active ? "border-ochre-600 bg-ochre-50" : "border-line bg-surface",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  active ? "text-brand-700" : "text-ink-subtle",
                )}
              >
                {s === "OS" ? "Jumlah" : s}
              </span>
              <div className="mt-1.5 flex w-full items-center justify-center gap-1 px-1">
                <button
                  type="button"
                  aria-label={`Kurangi ${s}`}
                  onClick={() => bump(s, -1)}
                  disabled={qty <= 0}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface-muted active:scale-95 disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={qty === 0 ? "" : qty}
                  placeholder="0"
                  onChange={(e) => setSize(s, e.target.value)}
                  aria-label={`Qty ${s}`}
                  className="h-9 w-10 min-w-0 rounded-lg border border-line bg-surface text-center text-sm font-bold tabular-nums focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Tambah ${s}`}
                  onClick={() => bump(s, 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </details>

      {pricing.nextTier ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
          Tambah {pricing.nextTier.qtyToNextTier} pcs lagi untuk harga {formatIDR(pricing.nextTier.potentialUnitPrice)} / pcs.
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <p className="text-[11px] text-ink-muted">
          {item.totalQty} pcs dalam pilihan ini.
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
