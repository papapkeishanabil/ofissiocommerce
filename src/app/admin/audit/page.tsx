import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { listAdminAuditEvents } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminAuditPage() {
  const events = await listAdminAuditEvents();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          Audit
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Activity view foundation</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Metadata diringkas dan field sensitif disaring. Audit provider penuh masuk fase hardening berikutnya.
        </p>
      </section>
      {events.length === 0 ? (
        <AdminEmptyState title="Audit log belum ada" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft-sm">
          <table className="min-w-[1040px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-ink-muted">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="px-4 py-3">{formatAdminDate(event.createdAt)}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(event.actorType)}>{event.actorType}</AdminBadge>
                    <div className="mt-1 break-all text-xs text-ink-muted">{event.actorId ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 break-all text-xs text-ink-muted">{event.companyId ?? "-"}</td>
                  <td className="px-4 py-3 font-bold text-ink">{event.action}</td>
                  <td className="px-4 py-3">
                    <div>{event.entityType}</div>
                    <div className="break-all text-xs text-ink-muted">{event.entityId ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{event.metadataSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
