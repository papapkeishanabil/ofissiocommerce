import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminOrders } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin orders"
        title="Operational order foundation"
        description="Sales order dan WooCommerce order masuk sebagai commerce order; admin menentukan apakah order diproses sebagai fulfillment, customization, atau production."
      />
      {orders.length === 0 ? (
        <AdminEmptyState title="Belum ada order" />
      ) : (
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[1180px]`}>
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order status</th>
                <th className="px-4 py-3">Process route</th>
                <th className="px-4 py-3">Process status</th>
                <th className="px-4 py-3">Replenishment</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Woo</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-3 font-bold text-ink">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-ink-muted">{order.companyName}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(order.paymentStatus)}>{order.paymentStatus}</AdminBadge>
                  </td>
                  <td className="px-4 py-3">{order.orderStatus}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <AdminBadge tone={adminStatusTone(order.processRoute)}>
                        {order.processRoute}
                      </AdminBadge>
                      <p className="text-xs text-ink-muted">
                        {order.hasCustomization ? order.customizationType : "standard product"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(order.processStatus)}>
                      {order.processStatus}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3">
                    {order.replenishmentStatus === "not_required" ? (
                      <span className="text-ink-muted">not required</span>
                    ) : (
                      <AdminBadge tone="warning">Replenishment needed</AdminBadge>
                    )}
                  </td>
                  <td className="px-4 py-3">{order.trackingStatus}</td>
                  <td className="px-4 py-3">{order.progress}%</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <AdminBadge tone={adminStatusTone(order.wooSyncStatus)}>
                        {order.wooSyncStatus}
                      </AdminBadge>
                      <p className="font-mono text-xs text-ink-muted">
                        {order.wooOrderId ?? "-"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatAdminDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-bold text-brand-700">
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
