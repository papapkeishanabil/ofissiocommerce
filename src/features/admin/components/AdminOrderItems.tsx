import { Download, Eye, ImageOff, Package, Palette, Ruler, Scissors } from "lucide-react";

import type { AdminProductImage } from "@/features/admin/admin-product-images";
import type { AdminOrderArtworkPreview } from "@/features/admin/admin.types";
import { formatRupiah } from "@/features/admin/admin.utils";
import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import { SIZES } from "@/types/industry";
import { embroideryTechniqueLabel, zoneLabel } from "@/types/uniform-3d";

import { AdminBadge } from "./AdminBadge";
import { AdminProductThumb } from "./AdminProductThumb";
import { AdminSectionCard } from "./AdminSectionCard";

interface AdminOrderItemsProps {
  items: ValidatedCheckoutCartItem[];
  productImages: Record<string, AdminProductImage>;
  trackingSnapshots: Record<string, string>;
  artworkPreviews: AdminOrderArtworkPreview[];
}

export function AdminOrderItems({
  items,
  productImages,
  trackingSnapshots,
  artworkPreviews,
}: AdminOrderItemsProps) {
  const previewByFileId = new Map(artworkPreviews.map((preview) => [preview.fileId, preview]));

  return (
    <AdminSectionCard
      icon={Package}
      title="Barang yang harus diproses"
      description="Snapshot final dari order: produk, ukuran, jumlah, harga, dan instruksi custom."
      actions={<AdminBadge tone="brand">{items.length} item</AdminBadge>}
      bodyClassName="space-y-6"
    >
      {items.map((item, itemIndex) => {
        const sizes = orderedSizes(item.sizeMatrix);
        const unitPrice = finiteMoney(
          item.finalUnitPrice,
          finiteMoney(item.regularPrice, finiteMoney(item.priceFrom, 0)),
        );
        const productSubtotal = finiteMoney(
          item.productSubtotal,
          finiteMoney(item.subtotal, unitPrice * finiteMoney(item.totalQty, 0)),
        );
        const customizationTotal = finiteMoney(
          item.customizationTotal,
          finiteMoney(item.embroideryTotal, 0),
        );
        const itemTotal = finiteMoney(
          item.finalEstimatedTotal,
          productSubtotal + customizationTotal,
        );
        return (
          <article key={`${item.productId}-${itemIndex}`} className="space-y-5">
            {itemIndex > 0 ? <hr className="border-line" /> : null}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <AdminProductThumb
                src={trackingSnapshots[item.productId] ?? productImages[item.productId]?.mainImage}
                alt={item.productName}
                size="lg"
                className="h-24 w-24"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-ink">
                      {item.productName}
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      SKU {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                    </p>
                  </div>
                  <AdminBadge tone="brand">{item.fulfillmentType}</AdminBadge>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Harga satuan final" value={formatRupiah(unitPrice)} />
                  <Metric label="Subtotal produk" value={formatRupiah(productSubtotal)} />
                  <Metric label="Biaya custom" value={formatRupiah(customizationTotal)} />
                  <Metric label="Total item" value={formatRupiah(itemTotal)} strong />
                </dl>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <section aria-labelledby={`size-title-${itemIndex}`}>
                <h4 id={`size-title-${itemIndex}`} className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  <Ruler className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  Rincian ukuran
                </h4>
                {sizes.length ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-ink-muted">
                        <tr>
                          <th className="px-4 py-2.5 font-bold">Ukuran</th>
                          <th className="px-4 py-2.5 text-right font-bold">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {sizes.map(([size, qty]) => (
                          <tr key={size}>
                            <td className="px-4 py-2.5 font-bold text-ink">{size}</td>
                            <td className="px-4 py-2.5 text-right text-ink">{qty} pcs</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-line bg-brand-50/60">
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-ink">Total</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-brand-800">
                            {item.totalQty} pcs
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    Rincian ukuran belum tersedia.
                  </p>
                )}
              </section>

              <section aria-labelledby={`custom-title-${itemIndex}`}>
                <h4 id={`custom-title-${itemIndex}`} className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  <Scissors className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  Customization dan artwork
                </h4>
                {item.customization ? (
                  <p className="mt-3 rounded-xl bg-ochre-50 px-4 py-3 text-sm leading-6 text-ochre-900">
                    <span className="font-bold">Instruksi customer:</span> {item.customization}
                  </p>
                ) : null}
                {item.embroideryPlacements.length ? (
                  <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {item.embroideryPlacements.map((placement, placementIndex) => {
                      const preview = previewByFileId.get(placement.logoFileId);
                      return (
                        <div
                          key={`${placement.zone}-${placement.logoFileId}-${placementIndex}`}
                          className="grid gap-4 p-4 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
                        >
                          <ArtworkPreview
                            filename={placement.logoFileName}
                            url={preview?.signedUrl ?? null}
                            mimeType={preview?.mimeType ?? "application/octet-stream"}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-extrabold text-ink">{zoneLabel(placement.zone)}</p>
                              <AdminBadge tone="neutral">
                                {embroideryTechniqueLabel(placement.technique)}
                              </AdminBadge>
                            </div>
                            <p className="mt-1 break-words text-sm font-semibold text-ink-muted">
                              {placement.logoFileName || "Nama file tidak tersedia"}
                            </p>
                            <p className="mt-1 text-xs text-ink-muted">
                              {placement.widthCm} × {placement.heightCm} cm · Rotasi {placement.rotation}°
                            </p>
                            {placement.notes ? (
                              <p className="mt-2 text-sm text-ink-muted">Catatan: {placement.notes}</p>
                            ) : null}
                            {preview?.signedUrl ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <ArtworkAction href={preview.signedUrl} icon={Eye} label="Lihat artwork" />
                                <ArtworkAction href={preview.signedUrl} icon={Download} label="Download" download />
                              </div>
                            ) : (
                              <p className="mt-2 text-xs font-semibold text-amber-800">
                                Preview file belum tersedia. Periksa status upload customer.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-ink-muted">
                    <Palette className="h-5 w-5" aria-hidden="true" />
                    Tidak ada logo atau bordir pada item ini.
                  </div>
                )}
              </section>
            </div>
          </article>
        );
      })}
    </AdminSectionCard>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className={strong ? "mt-0.5 font-extrabold text-brand-800" : "mt-0.5 font-bold text-ink"}>
        {value}
      </dd>
    </div>
  );
}

function ArtworkPreview({ filename, url, mimeType }: { filename: string; url: string | null; mimeType: string }) {
  return (
    <div className="grid aspect-square w-[4.5rem] place-items-center overflow-hidden rounded-xl border border-line bg-slate-50">
      {url && mimeType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Artwork ${filename}`} className="h-full w-full object-contain p-1.5" />
      ) : (
        <ImageOff className="h-5 w-5 text-ink-subtle" aria-hidden="true" />
      )}
    </div>
  );
}

function ArtworkAction({
  href,
  icon: Icon,
  label,
  download = false,
}: {
  href: string;
  icon: typeof Eye;
  label: string;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={download || undefined}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}

function orderedSizes(sizeMatrix: Record<string, number>) {
  const entries = Object.entries(sizeMatrix).filter(([, qty]) => Number(qty) > 0);
  const order = new Map(SIZES.map((size, index) => [size, index]));
  return entries.sort(([left], [right]) => {
    const leftOrder = order.get(left as (typeof SIZES)[number]) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right as (typeof SIZES)[number]) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}

function finiteMoney(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
