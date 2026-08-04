import Link from "next/link";
import { PackagePlus } from "lucide-react";

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
          {orders.some((order) => order.isNew) ? (
            <div className="flex flex-col gap-2 border-b border-brand-200 bg-brand-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 font-semibold text-brand-950">
                <PackagePlus className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                Order baru yang belum dibuka diprioritaskan di urutan teratas.
              </p>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-800 ring-1 ring-brand-200">
                {orders.filter((order) => order.isNew).length} order baru
              </span>
            </div>
          ) : null}
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
                <tr
                  key={order.id}
                  className={order.isNew ? "align-top bg-brand-50/70" : "align-top"}
                  aria-label={order.isNew ? `${order.orderNumber}, order baru dan belum dibuka` : undefined}
                >
                  <td
                    className={`px-4 py-3 font-bold text-ink ${order.isNew ? "border-l-4 border-l-brand-600" : ""}`}
                  >
                    {order.orderNumber}
                    {order.isNew ? (
                      <span className="mt-1.5 flex w-fit items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-800 ring-1 ring-brand-200">
                        <PackagePlus className="h-3 w-3" aria-hidden="true" />
                        Order baru
                      </span>
                    ) : null}
                  </td>
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
                      {order.isNew ? "Buka order" : "View Detail"}
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
