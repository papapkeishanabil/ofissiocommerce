import { formatRupiah } from "@/features/admin/admin.utils";
import type { buildSalesDashboard, salesChange } from "../sales-dashboard";
import { AdminEmptyState } from "./AdminEmptyState";
import { AdminPanel, AdminTableShell, ADMIN_TABLE_CLASS } from "./AdminSurface";

type Dashboard = ReturnType<typeof buildSalesDashboard>;

function Change({ change }: { change: ReturnType<typeof salesChange> | null }) {
  if (!change) return <span className="text-ink-muted">Belum dapat dibandingkan</span>;
  if (change.percent === null) return <span className="text-ink-muted">{change.difference > 0 ? "Ada penjualan baru; periode sebelumnya nol" : "Kedua periode belum ada penjualan"}</span>;
  const direction = change.percent > 0 ? "Naik" : change.percent < 0 ? "Turun" : "Tetap";
  return <span className={`font-semibold ${change.percent < 0 ? "text-rose-700" : change.percent > 0 ? "text-emerald-700" : "text-ink-muted"}`}>{direction} {Math.abs(change.percent).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>;
}

export function AdminSalesDashboard({ dashboard, period }: { dashboard: Dashboard; period: { from: string; to: string } }) {
  const { current, previous, previousPeriod, target } = dashboard;
  const metrics = [
    { label: "Omzet lunas", current: formatRupiah(current.paidValue), previous: formatRupiah(previous.paidValue), change: dashboard.revenueChange },
    { label: "Jumlah order lunas", current: current.paidCount.toLocaleString("id-ID"), previous: previous.paidCount.toLocaleString("id-ID"), change: dashboard.paidOrdersChange },
    { label: "Rata-rata nilai order lunas", current: current.averageOrderValue === null ? "Belum ada order lunas" : formatRupiah(current.averageOrderValue), previous: previous.averageOrderValue === null ? "Belum ada order lunas" : formatRupiah(previous.averageOrderValue), change: dashboard.averageOrderChange },
  ];
  return (
    <>
      <AdminPanel title="Perbandingan penjualan" description={`Periode ${period.from} s.d. ${period.to}, dibandingkan ${previousPeriod.from} s.d. ${previousPeriod.to} dengan jumlah hari yang sama. Berdasarkan tanggal order dibuat (WIB) dan status lunas saat ini, seluruh kategori. Omzet mencakup total tagihan termasuk ongkir; bukan laba atau arus kas berdasarkan tanggal pembayaran.`}>
        <dl className="divide-y divide-line sm:hidden">
          {metrics.map(metric => <div key={metric.label} className="space-y-2 py-4 first:pt-0">
            <dt className="text-sm font-semibold text-ink">{metric.label}</dt>
            <dd className="text-lg font-bold tabular-nums text-ink">{metric.current}</dd>
            <dd className="text-xs text-ink-muted">Sebelumnya: {metric.previous}</dd>
            <dd className="text-sm"><Change change={metric.change} /></dd>
          </div>)}
        </dl>
        <div className="hidden sm:block">
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[640px]`}>
            <thead><tr><th>Indikator</th><th>Periode ini</th><th>Periode sebelumnya</th><th>Perubahan</th></tr></thead>
            <tbody>{metrics.map(metric => <tr key={metric.label}>
              <th scope="row" className="text-left font-semibold text-ink">{metric.label}</th>
              <td className="font-bold tabular-nums text-ink">{metric.current}</td>
              <td className="tabular-nums text-ink-muted">{metric.previous}</td>
              <td><Change change={metric.change} /></td>
            </tr>)}</tbody>
          </table>
        </AdminTableShell>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <h4 className="text-sm font-semibold text-ink">Pencapaian target omzet</h4>
          {target ? <div className="mt-2 space-y-2">
            <p className="text-sm text-ink"><strong className="tabular-nums">{target.percent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</strong> dari target {formatRupiah(target.value)}. {target.remaining > 0 ? `Sisa ${formatRupiah(target.remaining)}.` : "Target tercapai."}</p>
            <progress className="h-2 w-full accent-brand-700" aria-label="Pencapaian target omzet lunas" max={target.value} value={Math.min(current.paidValue, target.value)} />
            <p className="text-xs text-ink-muted">Target hanya berlaku pada laporan ini dan dibawa dalam tautan serta CSV; belum disimpan sebagai target bersama.</p>
          </div> : <p className="mt-2 text-sm text-ink-muted">Isi target omzet opsional pada filter untuk menghitung pencapaiannya. Belum ada target yang ditetapkan.</p>}
        </div>
      </AdminPanel>
      <AdminPanel title="Produk yang penjualannya menurun" description={`Unit dari transaksi lunas dibandingkan ${previousPeriod.from} s.d. ${previousPeriod.to}. Mengikuti filter kategori produk; termasuk produk yang kini tidak terjual. Diurutkan dari penurunan unit terbesar.`}>
        {dashboard.decliningProducts.length > 0 && <p className="mb-3 text-xs text-ink-muted sm:hidden">Geser tabel ke samping untuk melihat selisih unit dan persentase penurunan.</p>}
        {dashboard.decliningProducts.length ? <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[600px]`}>
            <thead><tr><th>Produk / SKU</th><th>Unit sebelumnya</th><th>Unit periode ini</th><th>Selisih unit</th><th>Perubahan</th></tr></thead>
            <tbody>{dashboard.decliningProducts.map(product => <tr key={product.productId}>
              <td><span className="font-semibold text-ink">{product.productName}</span><span className="mt-1 block text-xs text-ink-muted">{product.sku}</span></td>
              <td className="tabular-nums">{product.previousQty}</td><td className="tabular-nums">{product.currentQty}</td>
              <td className="font-semibold tabular-nums text-rose-700">{product.difference}</td><td><Change change={product} /></td>
            </tr>)}</tbody>
          </table>
        </AdminTableShell> : <AdminEmptyState title="Tidak ada penurunan unit yang terdeteksi" description="Produk ditampilkan jika pernah terjual pada periode sebelumnya dan unit lunasnya menurun pada periode ini. Jika kedua periode belum memiliki transaksi, belum ada tren yang dapat dinilai." />}
      </AdminPanel>
    </>
  );
}
