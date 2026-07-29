import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { listAdminOrders } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          Admin orders
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Operational order foundation</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Read-only untuk Phase 16. Update produksi penuh masuk Phase 17/18.
        </p>
      </section>
      {orders.length === 0 ? (
        <AdminEmptyState title="Belum ada order" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft-sm">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-ink-muted">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order status</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Woo</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-3 font-bold text-ink">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-ink-muted">{order.companyName}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(order.paymentStatus)}>{order.paymentStatus}</AdminBadge>
                  </td>
                  <td className="px-4 py-3">{order.orderStatus}</td>
                  <td className="px-4 py-3">{order.trackingStatus}</td>
                  <td className="px-4 py-3">{order.progress}%</td>
                  <td className="px-4 py-3">{order.wooOrderId ?? "-"}</td>
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
        </div>
      )}
    </div>
  );
}
