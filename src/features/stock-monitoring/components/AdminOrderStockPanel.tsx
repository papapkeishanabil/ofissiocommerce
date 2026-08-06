import { AlertTriangle, Boxes } from "lucide-react";

import { AdminBadge } from "@/features/admin/components/AdminBadge";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";

import type {
  OrderStockComparisonResult,
  ProductionReplenishmentRequest,
} from "../stock-monitoring.types";
import { AdminReplenishmentButton } from "./AdminReplenishmentButton";
import { AdminStockStatusBadge } from "./AdminStockStatusBadge";

export function AdminOrderStockPanel({
  comparison,
  requests,
  canRequest,
}: {
  comparison: OrderStockComparisonResult;
  requests: ProductionReplenishmentRequest[];
  canRequest: boolean;
}) {
  const requestedSkus = new Set(
    requests.filter((request) => !["completed", "cancelled"].includes(request.status)).map((request) => request.stockSku),
  );
  return (
    <AdminSectionCard
      icon={Boxes}
      title="Kebutuhan order vs stok WooCommerce"
      description="Perbandingan internal per ukuran. Shortage tidak memblokir order customer; gunakan request produksi untuk tindak lanjut."
      actions={comparison.hasShortage ? <AdminBadge tone="danger">SHORTAGE</AdminBadge> : <AdminBadge tone="success">TERPANTAU</AdminBadge>}
      bodyClassName="space-y-4"
    >
      {comparison.hasUnsyncedSku ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="font-semibold">Sebagian Stock SKU belum tersinkron. Cocokkan SKU variasi WooCommerce dengan format kode model + ukuran.</p>
        </div>
      ) : null}
      {comparison.requirements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm font-semibold text-ink-muted">Order ini tidak memiliki kebutuhan ready-stock yang perlu dibandingkan.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {comparison.requirements.map((row) => (
            <article key={`${row.productId}-${row.stockSku}`} className={`rounded-xl border p-4 ${row.monitoringStatus === "production_needed" ? "border-red-200 bg-red-50/60" : row.monitoringStatus === "low" ? "border-amber-200 bg-amber-50/50" : "border-line bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-extrabold text-ink">{row.productName}</p><p className="mt-0.5 font-mono text-sm font-bold text-brand-800">{row.stockSku}</p></div>
                <AdminStockStatusBadge status={row.monitoringStatus} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white/80 p-3 text-sm">
                <Metric label="Required" value={`${row.requiredQty} pcs`} />
                <Metric label="Available" value={row.availableQty == null ? "—" : `${row.availableQty} pcs`} />
                <Metric label="Shortage" value={row.shortageQty == null ? "—" : `${row.shortageQty} pcs`} danger={(row.shortageQty ?? 0) > 0} />
              </dl>
              {canRequest && (row.shortageQty ?? 0) > 0 ? (
                <div className="mt-4">
                  <AdminReplenishmentButton
                    orderId={row.orderId}
                    parentSku={row.parentSku}
                    stockSku={row.stockSku}
                    reason="order_shortage"
                    initialRequested={requestedSkus.has(row.stockSku)}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <p className="text-xs font-semibold text-ink-subtle">Terakhir diperiksa {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comparison.lastCheckedAt))} · Ginee tidak dipanggil dari halaman ini.</p>
    </AdminSectionCard>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div><dt className="text-xs text-ink-muted">{label}</dt><dd className={`mt-0.5 font-extrabold ${danger ? "text-red-700" : "text-ink"}`}>{value}</dd></div>;
}
