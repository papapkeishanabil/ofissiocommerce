import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Send } from "lucide-react";

import { requireInternalAdminServer, listAdminInvoices } from "@/features/admin/admin.service";
import { AdminBadge } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminPageHeader, AdminTableShell, ADMIN_TABLE_CLASS } from "@/features/admin/components/AdminSurface";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";

export default async function AdminInvoicesPage() {
  await requireInternalAdminServer("admin:invoice:view");
  const invoices = await listAdminInvoices();
  const needsAction = invoices.filter((item) => item.invoiceStatus !== "sent");
  const failed = invoices.filter((item) => item.invoiceStatus === "failed").length;
  const ready = invoices.filter((item) => item.invoiceStatus === "ready").length;

  return <div className="space-y-6">
    <AdminPageHeader
      eyebrow="Billing operations"
      title="Invoice & Penagihan"
      description="Pantau invoice yang belum dibuat, siap dikirim, gagal dikirim, dan sudah terkirim tanpa membuka order satu per satu."
    />

    <dl className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-soft-sm sm:grid-cols-3">
      <Metric label="Perlu tindakan" value={needsAction.length} tone="text-amber-700" />
      <Metric label="Siap dikirim" value={ready} tone="text-brand-700" />
      <Metric label="Gagal dikirim" value={failed} tone="text-red-700" />
    </dl>

    {needsAction.length > 0 ? <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200" aria-labelledby="invoice-attention-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-600 text-white"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id="invoice-attention-title" className="font-bold text-amber-950">{needsAction.length} invoice membutuhkan tindakan</h2>
          <p className="mt-1 text-sm text-amber-900">Gagal kirim ditempatkan paling atas, kemudian invoice yang sudah dibuat tetapi belum dikirim.</p>
        </div>
      </div>
    </section> : null}

    {invoices.length === 0 ? <AdminEmptyState title="Belum ada order untuk invoice" /> : <section className="space-y-3" aria-labelledby="invoice-queue-title">
      <div>
        <h2 id="invoice-queue-title" className="text-lg font-bold text-ink">Antrean invoice</h2>
        <p className="mt-1 text-sm text-ink-muted">Status invoice terpisah dari status pembayaran agar dokumen yang belum dikirim tetap terpantau.</p>
      </div>
      <AdminTableShell>
        <table className={`${ADMIN_TABLE_CLASS} min-w-[960px]`}>
          <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted"><tr>
            <th className="px-4 py-3.5">Order / Customer</th><th className="px-4 py-3.5">Nilai</th><th className="px-4 py-3.5">Pembayaran</th><th className="px-4 py-3.5">Status invoice</th><th className="px-4 py-3.5">Tindakan berikutnya</th><th className="px-4 py-3.5">Diperbarui</th><th className="px-4 py-3.5 text-right">Tindakan</th>
          </tr></thead>
          <tbody className="divide-y divide-line">{invoices.map((invoice) => {
            const status = invoiceStatusMeta(invoice.invoiceStatus);
            const Icon = status.icon;
            return <tr key={invoice.orderId} className={invoice.invoiceStatus === "failed" ? "bg-red-50/70" : invoice.invoiceStatus === "ready" ? "bg-amber-50/60" : "hover:bg-slate-50"}>
              <td className="px-4 py-3.5"><p className="font-bold text-ink">{invoice.orderNumber}</p><p className="text-xs text-ink-muted">{invoice.companyName}</p></td>
              <td className="px-4 py-3.5 font-bold tabular-nums text-ink">{formatRupiah(invoice.total)}</td>
              <td className="px-4 py-3.5"><AdminBadge tone={invoice.paymentStatus === "paid" ? "success" : "warning"}>{invoice.paymentStatus === "paid" ? "LUNAS" : "MENUNGGU BAYAR"}</AdminBadge></td>
              <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-xs font-bold ${status.className}`}><Icon className="h-4 w-4" aria-hidden="true" />{status.label}</span>{invoice.filename ? <p className="mt-1 max-w-48 truncate text-xs text-ink-subtle">{invoice.filename}</p> : null}</td>
              <td className="px-4 py-3.5 text-sm font-semibold text-ink">{status.nextAction}</td>
              <td className="px-4 py-3.5 text-sm text-ink-muted">{formatAdminDate(invoice.updatedAt)}<p className="mt-1 text-xs">{ageLabel(invoice.updatedAt)}</p></td>
              <td className="px-4 py-3.5 text-right"><Link href={`/admin/orders/${invoice.orderId}#invoice`} className="inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Buka invoice</Link></td>
            </tr>;
          })}</tbody>
        </table>
      </AdminTableShell>
    </section>}
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="flex items-center justify-between border-line px-5 py-4 sm:border-r sm:last:border-r-0"><dt className="text-sm font-medium text-ink-muted">{label}</dt><dd className={`text-xl font-extrabold tabular-nums ${tone}`}>{value}</dd></div>;
}

function invoiceStatusMeta(status: "not_generated" | "ready" | "sent" | "failed") {
  if (status === "failed") return { label: "GAGAL DIKIRIM", nextAction: "Periksa kendala dan kirim ulang", className: "text-red-700", icon: AlertTriangle };
  if (status === "ready") return { label: "SIAP DIKIRIM", nextAction: "Kirim invoice ke customer", className: "text-amber-700", icon: Send };
  if (status === "sent") return { label: "SUDAH DIKIRIM", nextAction: "Pantau pembayaran", className: "text-emerald-700", icon: CheckCircle2 };
  return { label: "BELUM DIBUAT", nextAction: "Generate invoice", className: "text-slate-600", icon: FileText };
}

function ageLabel(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 3_600_000));
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}
