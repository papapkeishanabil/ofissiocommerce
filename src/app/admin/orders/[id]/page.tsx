import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { getAdminOrderDetail } from "@/features/admin/admin.service";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();
  const { order, tracking } = detail;
  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-sm font-bold text-brand-700">
        ← Back to orders
      </Link>
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              Order detail
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">{tracking?.orderNumber ?? order.id}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {tracking?.companyName ?? order.companyId} · {formatAdminDate(order.createdAt)}
            </p>
          </div>
          <AdminBadge tone={adminStatusTone(order.status)}>{order.status}</AdminBadge>
        </div>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Subtotal</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.itemSubtotal)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Shipping</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.shippingFee)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Tax</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.tax)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Grand total</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <h3 className="text-lg font-black text-ink">Item snapshots</h3>
        {order.items.length === 0 ? (
          <AdminEmptyState title="Item snapshot belum tersedia" />
        ) : (
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <article key={`${order.id}-${item.productId}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-ink">{item.productName}</h4>
                    <p className="text-sm text-ink-muted">
                      {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      model3dUrl: {item.model3dUrl}
                    </p>
                  </div>
                  <AdminBadge tone="brand">{item.fulfillmentType}</AdminBadge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <h3 className="text-lg font-black text-ink">Tracking timeline</h3>
        {!tracking ? (
          <AdminEmptyState title="Tracking belum tersedia" />
        ) : (
          <ol className="mt-4 space-y-2">
            {tracking.productionTimeline.map((stage) => (
              <li key={stage.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <AdminBadge tone={adminStatusTone(stage.state)}>{stage.state}</AdminBadge>
                <div>
                  <p className="font-bold text-ink">{stage.label}</p>
                  <p className="text-sm text-ink-muted">{stage.description ?? stage.updatedByRole ?? "-"}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
