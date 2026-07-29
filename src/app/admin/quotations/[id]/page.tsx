import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminQuotationStatusActions } from "@/features/admin/components/AdminQuotationStatusActions";
import { getAdminQuotationDetail } from "@/features/admin/admin.service";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuotationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminQuotationDetail(id);
  if (!detail) notFound();
  const { quotation, logoPreviews } = detail;

  return (
    <div className="space-y-5">
      <Link href="/admin/quotations" className="text-sm font-bold text-brand-700">
        ← Back to quotations
      </Link>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              Quotation detail
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">{quotation.quotationNumber}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {quotation.companyName} · {formatAdminDate(quotation.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={adminStatusTone(quotation.status)}>{quotation.status}</AdminBadge>
            <AdminBadge tone={adminStatusTone(quotation.emailStatus)}>{quotation.emailStatus}</AdminBadge>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">PIC</dt>
            <dd className="mt-1 font-semibold text-ink">{quotation.picName}</dd>
            <dd className="text-ink-muted">{quotation.picEmail ?? "-"}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Qty / Items</dt>
            <dd className="mt-1 font-semibold text-ink">{quotation.totalQty} pcs · {quotation.items.length} item</dd>
            <dd className="text-ink-muted">{quotation.embroideryPointCount} titik bordir</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Estimasi subtotal</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(quotation.subtotalEstimate)}</dd>
            <dd className="text-ink-muted">Harga final Phase 17</dd>
          </div>
        </dl>

        {quotation.customerNotes ? (
          <div className="mt-4 rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-bold text-ink">Customer notes</p>
            <p className="mt-1 text-ink-muted">{quotation.customerNotes}</p>
          </div>
        ) : null}
      </section>

      <AdminQuotationStatusActions quotationId={quotation.id} currentStatus={quotation.status} />

      <section className="space-y-4">
        <h3 className="text-lg font-black text-ink">Items, size matrix, 3D, dan bordir</h3>
        {quotation.items.length === 0 ? (
          <AdminEmptyState title="Item quotation belum tersedia" />
        ) : (
          quotation.items.map((item) => (
            <article key={`${quotation.id}-${item.productId}-${item.selectedColor}`} className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-ink">{item.productName}</h4>
                  <p className="text-sm text-ink-muted">
                    SKU {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                  </p>
                </div>
                <AdminBadge tone="brand">{item.fulfillmentType}</AdminBadge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Size matrix</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm sm:grid-cols-6">
                    {Object.entries(item.sizeMatrix).map(([size, qty]) => (
                      <div key={size} className="rounded-xl bg-white p-3 text-center ring-1 ring-line">
                        <p className="font-black text-ink">{size}</p>
                        <p className="text-ink-muted">{qty} pcs</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">3D model</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">model3dId</dt>
                      <dd className="font-mono text-xs font-bold text-ink">{item.model3dId}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">model3dUrl</dt>
                      <dd className="font-mono text-xs font-bold text-ink">{item.model3dUrl}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Embroidery placements</p>
                {item.embroideryPlacements.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">Belum ada placement bordir.</p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {item.embroideryPlacements.map((placement) => {
                      const preview = logoPreviews.find((logo) => logo.fileId === placement.logoFileId);
                      return (
                        <div key={`${placement.zone}-${placement.logoFileId}`} className="rounded-2xl bg-slate-50 p-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-line">
                              {preview?.signedUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview.signedUrl} alt="" className="max-h-full max-w-full object-contain" />
                              ) : (
                                <span className="px-2 text-center text-[10px] font-bold text-ink-muted">Preview unavailable</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-ink">{placement.zone}</p>
                              <p className="break-all font-mono text-xs text-ink-muted">logoFileId: {placement.logoFileId}</p>
                              <p className="text-xs text-ink-muted">
                                {placement.widthCm}×{placement.heightCm} cm · {placement.rotation}° · {placement.technique}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
