import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { listAdminTracking } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminTrackingPage() {
  const tracking = await listAdminTracking();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Tracking foundation"
        title="Production tracking overview"
        description="Read-only operational tracking untuk customer-friendly timeline dan status internal admin."
      />
      {tracking.length === 0 ? (
        <AdminEmptyState title="Tracking belum ada" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tracking.map((item) => (
            <article key={item.id} className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03] transition hover:-translate-y-1 hover:shadow-soft-lg">
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
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-300" style={{ width: `${item.progress}%` }} />
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
