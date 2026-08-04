import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminShipmentPanel } from "@/features/admin/components/AdminShipmentPanel";
import { getAdminShipmentDetail, requireInternalAdminServer } from "@/features/admin/admin.service";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import {
  shipmentProviderLabel,
  shipmentStatusLabel,
} from "@/features/shipments/shipment.config";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminShipmentDetailPage({ params }: PageProps) {
  await requireInternalAdminServer("admin:shipment:view");
  const { id } = await params;
  const detail = await getAdminShipmentDetail(id);
  if (!detail) notFound();
  const { shipment, order, events } = detail;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/shipments" className="text-sm font-bold text-brand-700">
          ← Back to shipments
        </Link>
        <span className="text-xs font-semibold text-ink-muted">/</span>
        <Link href={`/admin/orders/${shipment.orderId}`} className="text-sm font-bold text-brand-700">
          Related order
        </Link>
      </div>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              Shipment detail
            </p>
            <h1 className="mt-1 text-2xl font-black text-ink">
              {shipment.shipmentNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Order {order?.orderNumber ?? shipment.orderId} · {formatAdminDate(shipment.createdAt)}
            </p>
          </div>
          <AdminBadge tone={adminStatusTone(shipment.status)}>
            {shipmentStatusLabel(shipment.status)}
          </AdminBadge>
        </div>

        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          <Info label="Provider" value={shipmentProviderLabel(shipment.provider)} />
          <Info label="Service" value={shipment.service} />
          <Info label="Resi" value={shipment.trackingNumber ?? "-"} />
          <Info label="Shipping cost" value={formatRupiah(shipment.shippingCost)} />
        </dl>
      </section>

      <AdminShipmentPanel
        orderId={shipment.orderId}
        processOrderId={shipment.processOrderId}
        shipments={[shipment]}
        events={events}
      />

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h2 className="text-lg font-black text-ink">Shipment event timeline</h2>
        {events.length === 0 ? (
          <AdminEmptyState title="Event shipment belum tersedia" />
        ) : (
          <ol className="mt-4 space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-ink">{event.eventType}</p>
                    <p className="mt-1 text-sm text-ink-muted">{event.note ?? "-"}</p>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted">
                    {formatAdminDate(event.createdAt)}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs text-ink-muted">
                  {event.oldStatus ?? "-"} → {event.newStatus ?? "-"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value || "-"}</dd>
    </div>
  );
}
