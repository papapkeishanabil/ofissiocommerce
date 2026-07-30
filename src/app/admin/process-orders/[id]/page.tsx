import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminProcessOrderActions } from "@/features/admin/components/AdminProcessOrderActions";
import { AdminShipmentPanel } from "@/features/admin/components/AdminShipmentPanel";
import { getAdminProcessOrderDetail } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";
import {
  processOrderRouteLabel,
  processOrderStatusLabel,
} from "@/features/process-orders/process-order.config";
import { summarizeSizeMatrix } from "@/features/tracking/tracking-utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProcessOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminProcessOrderDetail(id);
  if (!detail) notFound();
  const { processOrder, sourceOrder, items, tasks, events } = detail;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/process-orders" className="text-sm font-bold text-brand-700">
          ← Back to process orders
        </Link>
        <span className="text-xs font-semibold text-ink-muted">/</span>
        <Link href={`/admin/orders/${processOrder.ofissioOrderId}`} className="text-sm font-bold text-brand-700">
          Related order
        </Link>
      </div>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              {processOrderRouteLabel(processOrder.processRoute)}
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">
              {processOrder.processOrderNumber}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {detail.companyName} · order {detail.relatedOrderNumber} · {formatAdminDate(processOrder.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={adminStatusTone(processOrder.processStatus)}>
              {processOrderStatusLabel(processOrder.processStatus)}
            </AdminBadge>
            <AdminBadge tone={adminStatusTone(processOrder.processRoute)}>
              {processOrder.processRoute}
            </AdminBadge>
          </div>
        </div>

        {processOrder.replenishmentStatus !== "not_required" ? (
          <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
            Replenishment needed — warning internal. Customer UI tetap tidak menampilkan stok habis.
          </p>
        ) : null}

        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-5">
          <Info label="current_stage" value={processOrder.currentStage} />
          <Info label="progress" value={`${processOrder.progress}%`} />
          <Info label="priority" value={processOrder.priority} />
          <Info label="assigned_team" value={processOrder.assignedTeam ?? "-"} />
          <Info label="deadline" value={formatAdminDate(processOrder.deadline)} />
        </dl>
      </section>

      <AdminProcessOrderActions
        processOrderId={processOrder.id}
        processStatus={processOrder.processStatus}
        replenishmentStatus={processOrder.replenishmentStatus}
        tasks={tasks}
      />

      {sourceOrder ? (
        <AdminShipmentPanel
          orderId={sourceOrder.id}
          processOrderId={processOrder.id}
          shipments={detail.shipment ? [detail.shipment] : []}
          events={detail.shipmentEvents}
          createFrom="process-order"
        />
      ) : null}

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h3 className="text-lg font-black text-ink">Task checklist</h3>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-700">
                    {String(task.sortOrder).padStart(2, "0")}
                  </span>
                  <p className="mt-1 font-black text-ink">{task.taskName}</p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">{task.stage}</p>
                </div>
                <AdminBadge tone={adminStatusTone(task.status)}>{task.status}</AdminBadge>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Started: {formatAdminDate(task.startedAt)} · Completed: {formatAdminDate(task.completedAt)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h3 className="text-lg font-black text-ink">Items & customization snapshot</h3>
        {items.length === 0 ? (
          <AdminEmptyState title="Item process order belum tersedia" />
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-ink">{item.productName}</h4>
                    <p className="text-sm text-ink-muted">
                      {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                    </p>
                  </div>
                  <AdminBadge tone={adminStatusTone(item.customization.type)}>
                    {item.customization.type}
                  </AdminBadge>
                </div>
                <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <Info label="size matrix" value={summarizeSizeMatrix(item.sizeMatrix)} />
                  <Info label="placements" value={`${item.customization.placements.length} titik`} />
                  <Info label="model3dUrl" value={item.model3dUrl ?? "-"} />
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h3 className="text-lg font-black text-ink">Event timeline</h3>
        {events.length === 0 ? (
          <AdminEmptyState title="Event belum tersedia" />
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
                  {event.oldStage ?? "-"} → {event.newStage ?? "-"} · {event.oldStatus ?? "-"} → {event.newStatus ?? "-"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h3 className="text-lg font-black text-ink">Source order snapshot</h3>
        {!sourceOrder ? (
          <AdminEmptyState title="Source order tidak ditemukan" />
        ) : (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            <Info label="order id" value={sourceOrder.id} />
            <Info label="quotation id" value={sourceOrder.quotationId ?? "-"} />
            <Info label="woo order" value={sourceOrder.wooOrderId ?? sourceOrder.woocommerceOrderId ?? "-"} />
            <Info label="items" value={`${sourceOrder.items.length} item`} />
          </dl>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-xs font-bold text-ink">
        {value || "-"}
      </dd>
    </div>
  );
}
