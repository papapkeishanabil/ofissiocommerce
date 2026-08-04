import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { listAdminShipments, requireInternalAdminServer } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";
import {
  shipmentProviderLabel,
  shipmentStatusLabel,
} from "@/features/shipments/shipment.config";

export default async function AdminShipmentsPage() {
  await requireInternalAdminServer("admin:shipment:view");
  const shipments = await listAdminShipments();

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">
          Shipping workbench
        </p>
        <h1 className="mt-1 text-2xl font-black text-ink">Shipments</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Foundation pengiriman manual: buat shipment dari order/process order,
          input resi, update status, lalu customer tracking ikut berubah.
        </p>
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-ink">Daftar shipment</h2>
          <AdminBadge tone="brand">{shipments.length} shipment</AdminBadge>
        </div>

        {shipments.length === 0 ? (
          <AdminEmptyState title="Shipment belum tersedia" />
        ) : (
          <div className="mt-4 overflow-hidden rounded-3xl border border-line">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
              <span>Shipment</span>
              <span>Order</span>
              <span>Provider</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>
            <div className="divide-y divide-line">
              {shipments.map((shipment) => (
                <article
                  key={shipment.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-[1.4fr_1fr_1fr_1fr_120px]"
                >
                  <div>
                    <p className="font-black text-ink">{shipment.shipmentNumber}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Updated {formatAdminDate(shipment.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-ink">{shipment.orderNumber}</p>
                    <p className="mt-1 text-xs text-ink-muted">{shipment.companyName}</p>
                  </div>
                  <div>
                    <p className="font-bold text-ink">
                      {shipmentProviderLabel(shipment.provider)}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {shipment.trackingNumber ?? "Resi belum ada"}
                    </p>
                  </div>
                  <div>
                    <AdminBadge tone={adminStatusTone(shipment.status)}>
                      {shipmentStatusLabel(shipment.status)}
                    </AdminBadge>
                    <p className="mt-1 text-xs text-ink-muted">{shipment.progress}%</p>
                  </div>
                  <Link
                    href={`/admin/shipments/${shipment.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand-900 px-3 text-xs font-black text-white"
                  >
                    Detail
                  </Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
