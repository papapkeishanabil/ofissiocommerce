import { AlertTriangle, Boxes } from "lucide-react";

import { AdminBadge } from "@/features/admin/components/AdminBadge";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";

import type { WooSizeStockMatrix } from "../stock-monitoring.types";
import { AdminReplenishmentButton } from "./AdminReplenishmentButton";
import { AdminStockStatusBadge } from "./AdminStockStatusBadge";

export function AdminProductStockPanel({
  matrix,
  canRequest,
}: {
  matrix: WooSizeStockMatrix;
  canRequest: boolean;
}) {
  return (
    <AdminSectionCard
      icon={Boxes}
      title="Stok ready-stock WooCommerce"
      description="Data internal per SKU ukuran dari WooCommerce Ofissio. Customer tidak melihat stok dan Ofissio tidak mengubah jumlah stok."
      actions={<AdminBadge tone="neutral">ADMIN ONLY</AdminBadge>}
      bodyClassName="space-y-4"
    >
      {matrix.hasVariationSkuWarning ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="font-semibold">
            Produk belum memiliki SKU stok per ukuran. Stok tidak dapat dipantau akurat.
          </p>
        </div>
      ) : null}

      {!matrix.enabled ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-ink-muted">
          Stock monitoring sedang dinonaktifkan dari konfigurasi server.
        </p>
      ) : matrix.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm font-semibold text-ink-muted">
          SKU {matrix.parentSku || "produk"} belum ditemukan pada WooCommerce.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
            <table className="min-w-[58rem] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.1em] text-ink-muted">
                <tr>
                  {[
                    "Stock SKU", "Ukuran", "Stok", "Woo status", "Manage stock",
                    "Minimum", "Shortage", "Status", "Tindakan",
                  ].map((label) => <th key={label} className="px-3 py-3 font-bold">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matrix.rows.map((row) => (
                  <tr key={`${row.wooCommerceVariationId ?? "parent"}-${row.stockSku}`} className="align-top">
                    <td className="px-3 py-3 font-extrabold text-brand-800">{row.stockSku || "—"}</td>
                    <td className="px-3 py-3 font-semibold">{row.sizeLabel ?? "—"}</td>
                    <td className="px-3 py-3 font-extrabold">{quantity(row.stockQuantity)}</td>
                    <td className="px-3 py-3">{row.stockStatus}</td>
                    <td className="px-3 py-3">{row.manageStock ? "Ya" : "Tidak"}</td>
                    <td className="px-3 py-3">{row.minimumThreshold}</td>
                    <td className="px-3 py-3 font-extrabold text-red-700">{quantity(row.shortageToMinimum)}</td>
                    <td className="px-3 py-3"><AdminStockStatusBadge status={row.status} /></td>
                    <td className="px-3 py-3">
                      {canRequest && (row.shortageToMinimum ?? 0) > 0 ? (
                        <AdminReplenishmentButton
                          parentSku={row.parentSku}
                          stockSku={row.stockSku}
                          reason="low_stock"
                        />
                      ) : <span className="text-ink-subtle">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {matrix.rows.map((row) => (
              <article key={`${row.wooCommerceVariationId ?? "parent"}-${row.stockSku}`} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-extrabold text-brand-800">{row.stockSku}</p><p className="text-sm text-ink-muted">Ukuran {row.sizeLabel ?? "—"}</p></div>
                  <AdminStockStatusBadge status={row.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Stok" value={quantity(row.stockQuantity)} />
                  <Metric label="Minimum" value={String(row.minimumThreshold)} />
                  <Metric label="Shortage" value={quantity(row.shortageToMinimum)} />
                  <Metric label="Manage stock" value={row.manageStock ? "Ya" : "Tidak"} />
                </dl>
                {canRequest && (row.shortageToMinimum ?? 0) > 0 ? <div className="mt-4"><AdminReplenishmentButton parentSku={row.parentSku} stockSku={row.stockSku} reason="low_stock" /></div> : null}
              </article>
            ))}
          </div>
        </>
      )}
      <p className="text-xs font-semibold text-ink-subtle">
        Terakhir diperiksa {formatCheckedAt(matrix.lastCheckedAt)} · Sumber: WooCommerce
      </p>
    </AdminSectionCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-0.5 font-extrabold text-ink">{value}</dd></div>;
}

function quantity(value: number | null) { return value == null ? "—" : `${value} pcs`; }
function formatCheckedAt(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
