import Link from "next/link";
import {
  Activity,
  FileArchive,
  ListChecks,
  PackageCheck,
} from "lucide-react";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminPanel, AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { AdminSummaryCards } from "@/features/admin/components/AdminSummaryCards";
import { getAdminSummary, listAdminOrders, listAdminQuotations } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";

export default async function AdminDashboardPage() {
  const [summary, quotations, orders, embroideryPricing] = await Promise.all([
    getAdminSummary(),
    listAdminQuotations(),
    listAdminOrders(),
    getGlobalEmbroideryPricing(),
  ]);

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Internal workspace"
        title="Ofissio Admin Foundation"
        description="Ruang kerja internal untuk quotation B2B, upload logo, tracking produksi, order operasional, customer company, dan audit activity. Product catalog tetap dikelola di WP Admin/WooCommerce."
      >
        <div className="flex flex-wrap gap-2">
          <AdminBadge tone="success">Supabase connected</AdminBadge>
          <AdminBadge tone="brand">Process order ready</AdminBadge>
          <AdminBadge tone="warning">WooCommerce staging optional</AdminBadge>
        </div>
      </AdminPageHeader>

      {!embroideryPricing.schemaReady || embroideryPricing.zones.length < 6 ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <span>Master Harga Bordir belum siap di Supabase. Transaksi tidak akan mengarang harga zona yang hilang.</span>
          <Link href="/admin/pricing/embroidery" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-900 px-4 font-black text-white">Periksa master</Link>
        </div>
      ) : null}

      <AdminSummaryCards
        cards={[
          {
            label: "Total quotation",
            value: summary.totalQuotations,
            helper: `${summary.quotationsUnderReview} under review · ${summary.quotationsQuoted} quoted · ${summary.quotationsAccepted} accepted`,
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
        <AdminPanel
          title="Recent quotations"
          actions={
            <Link href="/admin/quotations" className="text-sm font-black text-brand-700">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {quotations.slice(0, 5).length === 0 ? (
              <AdminEmptyState title="Belum ada quotation" />
            ) : (
              quotations.slice(0, 5).map((quotation) => (
                <Link
                  key={quotation.id}
                  href={`/admin/quotations/${quotation.id}`}
                  className="group block rounded-2xl border border-line/80 bg-surface-muted/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-soft-sm"
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
        </AdminPanel>

        <AdminPanel
          title="Recent orders"
          actions={
            <Link href="/admin/orders" className="text-sm font-black text-brand-700">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {orders.slice(0, 5).length === 0 ? (
              <AdminEmptyState title="Belum ada order operasional" />
            ) : (
              orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="group block rounded-2xl border border-line/80 bg-surface-muted/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-soft-sm"
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
        </AdminPanel>
      </div>
    </div>
  );
}
