import { ProductThumb } from "@/components/ui/ProductThumb";
import { EmbroiderySummary } from "@/components/configurator/EmbroiderySummary";
import { cartEmbroideryPlacements } from "@/features/products/embroidery-order-review";
import { isColorOption, isSizeOption } from "@/features/products/product-variants";
import { sortProductSizes } from "@/lib/product-size-order";
import type { CartLineItem } from "@/types/cart";
import { formatIDR } from "@/types/product";

export function QuotationReviewItem({ item }: { item: CartLineItem }) {
  const placements = cartEmbroideryPlacements(item);
  const sizes = sortProductSizes(Object.keys(item.sizes).filter(size => (item.sizes[size as keyof typeof item.sizes] ?? 0) > 0));
  const otherOptions = Object.entries(item.selectedOptions ?? {}).filter(([name]) => !isColorOption(name) && !isSizeOption(name));
  const productSubtotal = item.productSubtotal ?? item.subtotal ?? item.estimatedPrice;
  return <li className="min-w-0 py-5 first:pt-0 last:pb-0" aria-label={`Rincian ${item.productName}`}>
    <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
      <ProductThumb src={item.image} alt={item.productName} className="h-16 w-16" />
      <div className="min-w-0">
        <h3 className="text-sm font-bold leading-6 text-ink [overflow-wrap:anywhere]">{item.productName}</h3>
        <p className="mt-1 break-all text-xs text-ink-muted">SKU: {item.sku}</p>
        <p className="mt-1 text-sm text-ink">Warna: {item.color} · {item.totalQty} pcs</p>
        {otherOptions.map(([name, value]) => <p key={name} className="mt-1 text-xs text-ink-muted">{name}: {value}</p>)}
        {!otherOptions.length && item.selectedSleeve && <p className="mt-1 text-xs text-ink-muted">Lengan: {item.selectedSleeve}</p>}
      </div>
      <div className="col-start-2 sm:col-start-3 sm:text-right">
        <p className="text-sm font-bold tabular-nums text-ink">{formatIDR(item.finalEstimatedTotal ?? item.estimatedPrice)}</p>
        <p className="mt-1 text-xs text-ink-muted">Produk + bordir</p>
      </div>
    </div>
    <div className="mt-4 rounded-lg bg-surface-muted p-3 text-xs">
      <p className="font-semibold text-ink">Jumlah per ukuran</p>
      <dl className="mt-2 flex flex-wrap gap-2">{sizes.map(size => <div key={size} className="flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5"><dt className="font-semibold">{size === "OS" ? "Satu ukuran" : size}</dt><dd>{item.sizes[size as keyof typeof item.sizes]} pcs</dd></div>)}</dl>
    </div>
    {placements.length > 0 && <EmbroiderySummary placements={placements} sizes={item.sizes} />}
    {item.customization && <p className="mt-3 whitespace-pre-wrap text-xs leading-6 [overflow-wrap:anywhere]"><strong>Catatan produk:</strong> {item.customization}</p>}
    <dl className="mt-3 space-y-1.5 text-xs">
      <div className="flex justify-between gap-3"><dt>Produk ({item.totalQty} × {formatIDR(item.finalUnitPrice ?? item.unitPrice)})</dt><dd className="shrink-0 font-semibold tabular-nums">{formatIDR(productSubtotal)}</dd></div>
      <div className="flex justify-between gap-3"><dt>Biaya bordir</dt><dd className="shrink-0 font-semibold tabular-nums">{formatIDR(item.embroideryTotal ?? 0)}</dd></div>
    </dl>
    {item.quantityTierApplied && item.quantityTierLabel && <p className="mt-2 text-xs text-ink-muted">Harga quantity: {item.quantityTierLabel}</p>}
    {!!item.missingEmbroideryPricingZones?.length && <p className="mt-2 text-xs font-semibold text-amber-800">Sebagian biaya bordir belum tersedia dan akan dikonfirmasi Ofissio.</p>}
  </li>;
}
