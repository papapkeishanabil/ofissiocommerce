import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminProcessRouteBadge } from "@/features/admin/components/AdminProcessRouteBadge";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminProcessOrders } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminProcessOrdersPage() {
  const processOrders = await listAdminProcessOrders();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Process orders"
        title="Fulfillment, Customization & SPK foundation"
        description="Dokumen kerja internal yang dibuat dari Sales Order/WooCommerce Order tanpa input ulang. Route menentukan checklist dan progress customer-friendly."
      />

      {processOrders.length === 0 ? (
        <AdminEmptyState title="Belum ada process order" />
      ) : (
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[1180px]`}>
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3">Process Order</th>
                <th className="px-4 py-3">Related Order</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Replenishment</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {processOrders.map((processOrder) => (
                <tr key={processOrder.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-black text-ink">{processOrder.processOrderNumber}</p>
                    <p className="font-mono text-xs text-ink-muted">{processOrder.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{processOrder.orderNumber}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      Woo: {processOrder.wooOrderId ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{processOrder.companyName}</td>
                  <td className="px-4 py-3">
                    <AdminProcessRouteBadge
                      route={processOrder.processRoute}
                      showDescription
                    />
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(processOrder.processStatus)}>
                      {processOrder.processStatus}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3">
                    {processOrder.replenishmentStatus === "not_required" ? (
                      <span className="text-ink-muted">not required</span>
                    ) : (
                      <AdminBadge tone="warning">Replenishment needed</AdminBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{processOrder.currentStage}</td>
                  <td className="px-4 py-3">{processOrder.progress}%</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(processOrder.priority)}>
                      {processOrder.priority}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3">{formatAdminDate(processOrder.deadline)}</td>
                  <td className="px-4 py-3">{formatAdminDate(processOrder.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/process-orders/${processOrder.id}`}
                      className="font-bold text-brand-700"
                    >
                      View Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </div>
  );
}
