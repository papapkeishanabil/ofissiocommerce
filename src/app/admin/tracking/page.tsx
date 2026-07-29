import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { listAdminTracking } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminTrackingPage() {
  const tracking = await listAdminTracking();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          Tracking foundation
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Production tracking overview</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Read-only Phase 16. Update current status/progress masuk Phase 17/18.
        </p>
      </section>
      {tracking.length === 0 ? (
        <AdminEmptyState title="Tracking belum ada" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tracking.map((item) => (
            <article key={item.id} className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-ink">{item.orderNumber}</h3>
                  <p className="text-sm text-ink-muted">{item.companyName}</p>
                </div>
                <AdminBadge tone={adminStatusTone(item.currentStatus)}>{item.currentStatus}</AdminBadge>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                  <span>Progress</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-muted">Next: {item.nextStep ?? "-"}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-ink-muted">{formatAdminDate(item.updatedAt)}</span>
                <Link href={`/admin/orders/${item.id}`} className="text-sm font-bold text-brand-700">
                  View order
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
