"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, Box } from "lucide-react";
import { hasCartCustomization, type CartLineItem } from "@/types/cart";
import { SIZES } from "@/types/industry";
import { formatIDR } from "@/types/product";
import { productColorDisplayLabel, productColorSwatchStyle } from "@/lib/product-colors";
import { useCartStore } from "@/stores/cart-store";
import { ProductThumb } from "@/components/ui/ProductThumb";
import { SizeQuantityMatrix } from "@/components/product/SizeQuantityMatrix";
import { EmbroiderySummary } from "@/components/configurator/EmbroiderySummary";
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import styles from "./CartPage.module.css";

export function CartPreviewLine({ item }: { item: CartLineItem }) {
  const [editing, setEditing] = useState(false);
  const update = useCartStore(s => s.updateLineSizes);
  const remove = useCartStore(s => s.removeLine);
  const processingInfo = resolveOrderProcessingInfo({ processRoute: item.processRoute, fulfillmentType: item.fulfillmentType, leadTimeDays: item.leadTimeDays, hasEmbroidery: hasCartCustomization(item) });
  return <article className="border-t border-line first:border-t-0">
    <div className={styles.lineBody}>
      <div className={styles.lineProduct}>
        <ProductThumb src={item.image} alt={item.productName} className="h-16 w-16 shrink-0" />
        <div><Link href={`/product/${item.productSlug}`} className="text-sm font-bold hover:underline">{item.productName}</Link><p className="mt-1 text-xs text-ink-muted">{item.uniform3DConfig ? "Studio Bordir" : item.sku}</p><p className="mt-1 text-xs font-semibold text-ink-muted">{processingInfo.label}: {processingInfo.value}</p>{item.customization && <p className="mt-1 text-xs text-ink-muted">{item.customization}</p>}</div>
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold"><span className="h-6 w-6 shrink-0 rounded-full border-2 border-white ring-1 ring-ochre-600" style={productColorSwatchStyle(item.color)} aria-hidden="true" />{productColorDisplayLabel(item.color)}{item.selectedSleeve && <span>{item.selectedSleeve}</span>}</div>
      <dl className="grid max-w-40 gap-1 text-xs">{SIZES.filter(s=>(item.sizes[s]??0)>0).map(s=><div key={s} className="flex justify-between gap-8"><dt className="font-semibold">{s}</dt><dd>{item.sizes[s]} pcs</dd></div>)}</dl>
      <div className={styles.linePrice}><p className="text-lg font-bold tabular-nums">{formatIDR(item.finalEstimatedTotal??item.estimatedPrice)}</p><p className="text-xs text-ink-muted">{formatIDR(item.finalUnitPrice??item.unitPrice)} / pcs</p><p className="text-xs text-ink-muted">{item.totalQty} pcs</p>{item.embroideryTotal>0 && <p className="mt-1 text-xs">Termasuk bordir {formatIDR(item.embroideryTotal)}</p>}</div>
    </div>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line px-4 py-1 text-xs font-semibold">
      <button className="inline-flex min-h-9 items-center gap-2" onClick={()=>setEditing(!editing)} aria-expanded={editing}><Pencil className="h-3.5 w-3.5" />{editing?"Selesai":"Ubah jumlah"}</button>
      <button className="inline-flex min-h-9 items-center gap-2 text-ink-muted hover:text-red-600" onClick={()=>remove(item.id)}><Trash2 className="h-3.5 w-3.5" />Hapus</button>
      {item.canAddEmbroidery && item.model3dId && item.model3dUrl && <Link className="inline-flex min-h-9 items-center gap-2 md:border-l md:border-line md:pl-6" href={`/product/${item.productSlug}?studio=1&line=${encodeURIComponent(item.id)}`}><Box className="h-4 w-4" />Tambah Bordir</Link>}
    </div>
    {editing && <div className="border-t border-line p-4"><SizeQuantityMatrix value={item.sizes} onChange={sizes=>update(item.id,sizes)} moq={item.moq??1} /></div>}
    <div className="px-4"><EmbroiderySummary placements={item.embroideryPlacements} sizes={item.sizes} /></div>
    {(item.missingEmbroideryPricingZones?.length??0)>0 && <p className="px-4 pb-3 text-xs text-ochre-700">Harga bordir perlu dikonfirmasi admin.</p>}
  </article>;
}
