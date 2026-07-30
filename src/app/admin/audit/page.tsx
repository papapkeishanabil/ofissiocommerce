import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminAuditEvents } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminAuditPage() {
  const events = await listAdminAuditEvents();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit"
        title="Activity view foundation"
        description="Metadata diringkas dan field sensitif disaring. Audit provider penuh masuk fase hardening berikutnya."
      />
      {events.length === 0 ? (
        <AdminEmptyState title="Audit log belum ada" />
      ) : (
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[1040px]`}>
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
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
        </AdminTableShell>
      )}
    </div>
  );
}
