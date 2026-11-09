import Link from "next/link";
import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { Download } from "lucide-react";
import { AdminSalesDashboard } from "@/features/admin/components/AdminSalesDashboard";
import { parseSalesTarget, salesPeriodRange } from "@/features/admin/sales-dashboard";

import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import {
  formatSalesMonthLabel,
  getSalesReport,
  type SalesAgingBucket,
  type SalesReceivableLinkStatus,
} from "@/features/admin/sales-report.service";
import { AdminBadge } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  ADMIN_ACTION_LINK_CLASS,
  AdminPageHeader,
  AdminPanel,
  ADMIN_TABLE_CLASS,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";

const MAX_ORDER_ROWS = 30;

const ORDER_STATUS_LABELS: Record<string, string> = {
  waiting_payment: "Menunggu bayar",
  payment_received: "Lunas",
  deposit_paid: "DP diterima, belum lunas",
  payment_failed: "Gagal bayar",
  cancelled: "Dibatalkan",
};

const AGING_LABELS: Record<SalesAgingBucket, string> = {
  "0-30": "0–30 hari",
  "31-60": "31–60 hari",
  "60+": "60+ hari",
};

const LINK_STATUS_LABELS: Record<SalesReceivableLinkStatus, { label: string; tone: "brand" | "warning" | "danger" }> = {
  aktif: { label: "Link aktif", tone: "brand" },
  expired: { label: "Perlu link baru", tone: "danger" },
  belum_dibuat: { label: "Belum ada link", tone: "warning" },
};

function todayIsoDate() {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

function firstDayOfMonthIsoDate() {
  return `${todayIsoDate().slice(0, 7)}-01`;
}

function normalizePeriod(searchParams: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const from = /^\d{4}-\d{2}-\d{2}$/.test(pick("from") ?? "") ? pick("from")! : firstDayOfMonthIsoDate();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(pick("to") ?? "") ? pick("to")! : todayIsoDate();
  return { from, to, category: pick("category") || undefined, target: parseSalesTarget(pick("target")) };
}

export default async function AdminSalesReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireInternalAdminServer("admin:order:view");
  let period: ReturnType<typeof normalizePeriod>;
  try {
    period = normalizePeriod((await searchParams) ?? {});
    if (!salesPeriodRange(period)) throw new Error("Pilih tanggal yang valid. Tanggal akhir harus setelah atau sama dengan tanggal awal.");
  } catch (error) {
    return <AdminPanel title="Filter laporan tidak valid" description={error instanceof Error ? error.message : "Periksa tanggal dan target omzet."}><Link href="/admin/reports" className={ADMIN_ACTION_LINK_CLASS}>Kembali ke laporan bulan ini</Link></AdminPanel>;
  }
  const [report, taxonomy] = await Promise.all([getSalesReport(period), getPublicCatalogTaxonomy()]);
  const { summary } = report;
  const maxMonthValue = Math.max(...report.months.map((month) => month.bookedValue), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sales reporting"
        title="Dashboard & Laporan Penjualan"
        description="Pantau transaksi, bandingkan penjualan, dan temukan produk yang perlu ditindaklanjuti. Order batal dan gagal bayar tidak dihitung sebagai penjualan."
        actions={
          <Link
            href={`/api/admin/reports/sales/export?from=${period.from}&to=${period.to}&category=${encodeURIComponent(period.category ?? "")}&target=${period.target ?? ""}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Ekspor CSV
          </Link>
        }
      >
        <form
          method="get"
          className="flex flex-wrap items-end gap-3"
          aria-label="Filter periode laporan"
        >
          <label className="text-xs font-semibold text-ink-muted">
            <span className="mb-1 block">Dari tanggal</span>
            <input
              type="date"
              name="from"
              defaultValue={period.from}
              className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
          </label>
          <label className="text-xs font-semibold text-ink-muted">
            <span className="mb-1 block">Sampai tanggal</span>
            <input
              type="date"
              name="to"
              defaultValue={period.to}
              className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
          </label>
          <label className="text-xs font-semibold text-ink-muted">
            <span className="mb-1 block">Kategori produk terlaris</span>
            <select name="category" defaultValue={period.category ?? ""} className="min-h-10 max-w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              <option value="">Semua kategori</option>
              {taxonomy.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-muted">
            <span className="mb-1 block">Target omzet periode ini (Rp, opsional)</span>
            <input type="number" name="target" min="1" max={Number.MAX_SAFE_INTEGER} step="1" defaultValue={period.target} placeholder="Contoh: 50000000" aria-describedby="sales-target-help" className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />
            <span id="sales-target-help" className="mt-1 block font-normal">Per laporan; belum disimpan sebagai target bersama.</span>
          </label>
          <button
            type="submit"
            className="min-h-10 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Terapkan
          </button>
        </form>
      </AdminPageHeader>

      <dl aria-label="Ringkasan penjualan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Omzet lunas" value={formatRupiah(summary.paidValue)} helper={changeLabel(report.dashboard.revenueChange)} featured />
        <Metric label="Order lunas" value={String(summary.paidCount)} helper={changeLabel(report.dashboard.paidOrdersChange)} />
        <Metric label="Unit produk terjual" value={String(report.dashboard.current.paidUnits)} helper={`${changeLabel(report.dashboard.paidUnitsChange)}; produk katalog, semua kategori`} />
        <Metric label="Rata-rata order lunas" value={report.dashboard.current.averageOrderValue === null ? "Belum tersedia" : formatRupiah(report.dashboard.current.averageOrderValue)} helper={report.dashboard.averageOrderChange ? changeLabel(report.dashboard.averageOrderChange) : "Belum ada dasar perbandingan"} />
        <Metric label="Nilai pesanan valid" value={formatRupiah(summary.bookedValue)} helper={`${summary.bookedCount} order, termasuk yang belum lunas`} />
        <Metric label="Piutang berjalan" value={formatRupiah(report.receivableOutstanding.value)} helper={`${report.receivableOutstanding.count} order belum dibayar, semua periode`} tone="text-amber-700" />
      </dl>
      <p className="text-xs text-ink-muted">Periode {period.from} s.d. {period.to}. {summary.orderCount} total order; {summary.waitingCount} menunggu pembayaran; {summary.cancelledCount + summary.failedCount} batal/gagal ({(summary.cancelRate * 100).toFixed(1)}%). Perbandingan terhadap periode sebelumnya dengan jumlah hari yang sama.</p>

      <AdminSalesDashboard dashboard={report.dashboard} period={period} />

      <AdminPanel
        title="Piutang & tindak lanjut"
        description="Order valid yang belum dibayar, terurut dari yang paling lama. Link pembayaran yang sudah expired perlu dikirim ulang dari detail order."
      >
        <div className="mb-4 grid gap-2.5 sm:grid-cols-3">
          {report.receivables.buckets.map((bucket) => (
            <div
              key={bucket.bucket}
              className="flex items-center justify-between rounded-xl border border-line bg-slate-50/80 px-4 py-3"
            >
              <div>
                <p className="text-xs font-semibold text-ink-muted">
                  Aging {AGING_LABELS[bucket.bucket]}
                </p>
                <p className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">
                  {formatRupiah(bucket.value)}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink-muted ring-1 ring-line">
                {bucket.count} order
              </span>
            </div>
          ))}
        </div>
        {report.receivables.rows.length ? (
          <AdminTableShell>
            <table className={`${ADMIN_TABLE_CLASS} min-w-[920px]`}>
              <thead>
                <tr>
                  <th>Tanggal order</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Umur</th>
                  <th>Link pembayaran</th>
                  <th>Nilai</th>
                  <th className="text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {report.receivables.rows.map((row) => {
                  const link = LINK_STATUS_LABELS[row.linkStatus];
                  return (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap text-ink-muted">
                        {formatAdminDate(row.createdAt)}
                      </td>
                      <td className="font-bold text-ink">{row.orderNumber}</td>
                      <td className="text-ink-muted">{row.companyName}</td>
                      <td>
                        <span className="font-semibold tabular-nums text-ink">
                          {row.ageDays} hari
                        </span>{" "}
                        <AdminBadge
                          tone={
                            row.bucket === "60+" ? "danger" : row.bucket === "31-60" ? "warning" : "neutral"
                          }
                        >
                          {AGING_LABELS[row.bucket]}
                        </AdminBadge>
                      </td>
                      <td>
                        <AdminBadge tone={link.tone}>{link.label}</AdminBadge>
                      </td>
                      <td className="font-bold tabular-nums text-ink">
                        {formatRupiah(row.total)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/orders/${row.id}`}
                          className={`${ADMIN_ACTION_LINK_CLASS} border border-line bg-white text-brand-700 hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-brand-600`}
                        >
                          Buka order
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminTableShell>
        ) : (
          <AdminEmptyState
            title="Tidak ada piutang berjalan"
            description="Semua order valid sudah lunas atau belum ada order menunggu pembayaran."
          />
        )}
      </AdminPanel>

      <AdminPanel
        title="Tren 12 bulan terakhir"
        description="Nilai booked per bulan berdasarkan tanggal order dibuat. Angka lunas dan piutang mengikuti status terkini tiap order."
      >
        <AdminTableShell>
          <table className={ADMIN_TABLE_CLASS}>
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="w-[36%]">Nilai booked</th>
                <th>Lunas</th>
                <th>Piutang</th>
              </tr>
            </thead>
            <tbody>
              {report.months.map((month) => (
                <tr key={month.month}>
                  <td className="font-semibold text-ink">{formatSalesMonthLabel(month.month)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-2 min-w-1 rounded-full bg-brand-700"
                        style={{
                          width: `${Math.max((month.bookedValue / maxMonthValue) * 100, month.bookedValue > 0 ? 2 : 0)}%`,
                        }}
                      />
                      <span className="whitespace-nowrap font-bold tabular-nums text-ink">
                        {formatRupiah(month.bookedValue)}
                      </span>
                    </div>
                  </td>
                  <td className="tabular-nums text-ink-muted">{formatRupiah(month.paidValue)}</td>
                  <td className="tabular-nums text-ink-muted">
                    {formatRupiah(month.receivableValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Customer teratas" description="Berdasarkan nilai booked pada periode terpilih.">
          {report.topCustomers.length ? (
            <AdminTableShell>
              <table className={ADMIN_TABLE_CLASS}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Booked</th>
                    <th>Lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCustomers.map((customer) => (
                    <tr key={customer.companyId}>
                      <td className="font-semibold text-ink">{customer.companyName}</td>
                      <td className="tabular-nums text-ink-muted">{customer.orderCount}</td>
                      <td className="font-bold tabular-nums text-ink">
                        {formatRupiah(customer.bookedValue)}
                      </td>
                      <td className="tabular-nums text-ink-muted">
                        {formatRupiah(customer.paidValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableShell>
          ) : (
            <AdminEmptyState title="Belum ada customer dengan order valid pada periode ini" />
          )}
        </AdminPanel>

        <AdminPanel
          title="Produk terlaris — transaksi lunas"
          description="Urutan berdasarkan unit dari order lunas, sesuai tanggal order dibuat (WIB) dan kategori produk saat ini. Filter kategori hanya berlaku pada tabel produk dan ekspornya. Nilai produk sebelum diskon order, tanpa ongkir. Ofistant memakai perhitungan yang sama untuk seluruh periode."
        >
          {report.topProducts.length ? (
            <AdminTableShell>
              <table className={ADMIN_TABLE_CLASS}>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Unit lunas</th>
                    <th>Jumlah order</th>
                    <th>Nilai produk lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((product) => (
                    <tr key={product.productId}>
                      <td className="font-semibold text-ink">{product.productName}</td>
                      <td className="text-xs text-ink-muted">{product.sku}</td>
                      <td className="tabular-nums text-ink-muted">{product.qty}</td>
                      <td className="tabular-nums text-ink-muted">{product.orderCount}</td>
                      <td className="font-bold tabular-nums text-ink">
                        {formatRupiah(product.paidValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableShell>
          ) : (
            <AdminEmptyState title="Belum ada produk dari transaksi lunas untuk filter ini" />
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title={`Rincian order periode (${report.orders.length})`}
        description={`Menampilkan maksimal ${MAX_ORDER_ROWS} order terbaru. Gunakan ekspor CSV untuk daftar lengkap.`}
      >
        {report.orders.length ? (
          <AdminTableShell>
            <table className={`${ADMIN_TABLE_CLASS} min-w-[860px]`}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Nilai</th>
                  <th className="text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {report.orders.slice(0, MAX_ORDER_ROWS).map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap text-ink-muted">
                      {formatAdminDate(order.createdAt)}
                    </td>
                    <td className="font-bold text-ink">{order.orderNumber}</td>
                    <td className="text-ink-muted">{order.companyName}</td>
                    <td>
                      <AdminBadge
                        tone={
                          order.paid ? "success" : order.booked ? "warning" : "danger"
                        }
                      >
                        {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
                      </AdminBadge>
                    </td>
                    <td className="font-bold tabular-nums text-ink">{formatRupiah(order.total)}</td>
                    <td className="text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className={`${ADMIN_ACTION_LINK_CLASS} border border-line bg-white text-brand-700 hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-brand-600`}
                      >
                        Buka order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        ) : (
          <AdminEmptyState title="Tidak ada order pada periode ini" />
        )}
      </AdminPanel>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  tone,
  featured = false,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: string;
  featured?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-xl p-4 shadow-[0_7px_22px_rgba(24,36,59,0.06)] ${featured ? "bg-brand-900 text-white" : "bg-white"}`}>
      <dt className={`text-xs font-medium ${featured ? "text-blue-100" : "text-ink-muted"}`}>{label}</dt>
      <dd className={`mt-1.5 text-xl font-extrabold tabular-nums ${featured ? "text-white" : tone ?? "text-ink"}`}>
        {value}
      </dd>
      <p className={`mt-2 text-xs leading-5 ${featured ? "text-blue-100" : "text-ink-subtle"}`}>{helper}</p>
    </div>
  );
}

function changeLabel(change: { percent: number | null; difference: number }) {
  if (change.percent === null) return change.difference > 0 ? "Ada penjualan baru; periode sebelumnya nol" : "Kedua periode belum ada penjualan";
  return `${change.percent > 0 ? "Naik" : change.percent < 0 ? "Turun" : "Tetap"} ${Math.abs(change.percent).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dibanding periode sebelumnya`;
}
