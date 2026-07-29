import Link from "next/link";
import {
  Activity,
  FileArchive,
  ListChecks,
  PackageCheck,
} from "lucide-react";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminSummaryCards } from "@/features/admin/components/AdminSummaryCards";
import { getAdminSummary, listAdminOrders, listAdminQuotations } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminDashboardPage() {
  const [summary, quotations, orders] = await Promise.all([
    getAdminSummary(),
    listAdminQuotations(),
    listAdminOrders(),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          Internal workspace
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-ink md:text-4xl">
          Ofissio Admin Foundation
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted md:text-base">
          Ruang kerja internal untuk quotation B2B, upload logo, tracking produksi,
          order operasional, customer company, dan audit activity. Product catalog
          tetap dikelola di WP Admin/WooCommerce.
        </p>
      </section>

      <AdminSummaryCards
        cards={[
          {
            label: "Total quotation",
            value: summary.totalQuotations,
            helper: `${summary.quotationsUnderReview} under review`,
            icon: <ListChecks className="h-5 w-5" aria-hidden="true" />,
          },
          {
            label: "Email/mock logged",
            value: summary.quotationsEmailedOrMocked,
            helper: "Quotation notification foundation",
            icon: <Activity className="h-5 w-5" aria-hidden="true" />,
          },
          {
            label: "Active orders",
            value: summary.activeOrders,
            helper: `${summary.ordersInProduction} in production stage`,
            icon: <PackageCheck className="h-5 w-5" aria-hidden="true" />,
          },
          {
            label: "Uploaded files",
            value: summary.uploadedFiles,
            helper: `${summary.trackingNeedsAttention} tracking need attention`,
            icon: <FileArchive className="h-5 w-5" aria-hidden="true" />,
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-ink">Recent quotations</h3>
            <Link href="/admin/quotations" className="text-sm font-bold text-brand-700">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {quotations.slice(0, 5).length === 0 ? (
              <AdminEmptyState title="Belum ada quotation" />
            ) : (
              quotations.slice(0, 5).map((quotation) => (
                <Link
                  key={quotation.id}
                  href={`/admin/quotations/${quotation.id}`}
                  className="block rounded-2xl border border-line bg-surface-muted p-4 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-ink">{quotation.quotationNumber}</span>
                    <AdminBadge tone={adminStatusTone(quotation.status)}>
                      {quotation.status}
                    </AdminBadge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {quotation.companyName} · {quotation.totalQty} pcs · {formatAdminDate(quotation.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-ink">Recent orders</h3>
            <Link href="/admin/orders" className="text-sm font-bold text-brand-700">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {orders.slice(0, 5).length === 0 ? (
              <AdminEmptyState title="Belum ada order operasional" />
            ) : (
              orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block rounded-2xl border border-line bg-surface-muted p-4 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-ink">{order.orderNumber}</span>
                    <AdminBadge tone={adminStatusTone(order.paymentStatus)}>
                      {order.paymentStatus}
                    </AdminBadge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {order.companyName} · {order.orderStatus} · {formatAdminDate(order.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
