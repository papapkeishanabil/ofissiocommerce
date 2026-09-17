import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FilePlus2, PackageCheck, ReceiptText, Workflow } from "lucide-react";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { getAdminSummary, listAdminOrders, listAdminProcessOrders, listAdminQuotations } from "@/features/admin/admin.service";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";

export default async function AdminDashboardPage() {
  const [summary, quotations, orders, processOrders, embroideryPricing] = await Promise.all([
    getAdminSummary(),
    listAdminQuotations(),
    listAdminOrders(),
    listAdminProcessOrders(),
    getGlobalEmbroideryPricing(),
  ]);

  const invoicePending = orders.filter((order) => !["paid", "settlement", "completed"].includes(order.paymentStatus.toLowerCase()));
  const attention = [
    ...quotations.filter((item) => item.isRequestedNew || item.status === "under_review").slice(0, 2).map((item) => ({
      href: `/admin/quotations/${item.id}`,
      title: "Quotation perlu ditinjau",
      detail: `${item.quotationNumber}, ${item.companyName}`,
      tone: "amber" as const,
    })),
    ...invoicePending.slice(0, 1).map((item) => ({
      href: `/admin/orders/${item.id}`,
      title: "Pembayaran invoice perlu ditindaklanjuti",
      detail: `${item.orderNumber}, ${formatRupiah(item.total)}`,
      tone: "red" as const,
    })),
    ...processOrders.filter((item) => item.priority === "urgent" || (item.deadline && Date.parse(item.deadline) <= Date.now() + 3 * 86_400_000)).slice(0, 1).map((item) => ({
      href: `/admin/process-orders/${item.id}`,
      title: "Produksi mendekati deadline",
      detail: `${item.processOrderNumber}, ${item.companyName}`,
      tone: "red" as const,
    })),
  ].slice(0, 4);

  const stages = [
    { label: "Brief approved", match: ["created", "brief_approved", "routing"], color: "bg-emerald-500" },
    { label: "Pre-production", match: ["production_preparation", "material_preparation", "artwork"], color: "bg-blue-500" },
    { label: "In production", match: ["cutting", "sewing", "embroidery_printing", "production"], color: "bg-amber-500" },
    { label: "Quality control", match: ["finishing", "quality_control", "qc"], color: "bg-emerald-500" },
    { label: "Ready to ship", match: ["ready_to_ship", "packing", "completed"], color: "bg-slate-400" },
  ].map((stage) => ({
    ...stage,
    count: processOrders.filter((item) => stage.match.some((value) => item.currentStage.toLowerCase().includes(value))).length,
  }));

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.035em] text-ink md:text-3xl">Operations control grid</h2>
          <p className="mt-1 text-xs text-ink-muted">Quotation, invoice, dan produksi, seluruh status dalam satu layar.</p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-subtle">Data operasional aktual Ofissio</p>
      </header>

      {!embroideryPricing.schemaReady || embroideryPricing.zones.length < 6 ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <span>Master Harga Bordir belum siap. Transaksi tidak akan mengarang harga zona yang hilang.</span>
          <Link href="/admin/pricing/embroidery" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-900 px-4 text-xs font-bold text-white">Periksa master</Link>
        </div>
      ) : null}

      <section aria-label="Ringkasan operasional" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric href="/admin/quotations" primary label="Total quotation" value={summary.totalQuotations} helper={`${summary.quotationsQuoted} quoted`} />
        <Metric href="/admin/quotations?status=under_review" label="Needs review" value={summary.quotationsUnderReview} helper="Perlu tindakan CS/Sales" alert={summary.quotationsUnderReview > 0} />
        <Metric href="/admin/orders" label="Active orders" value={summary.activeOrders} helper={`${invoicePending.length} payment pending`} />
        <Metric href="/admin/process-orders" label="Dalam pengerjaan" value={summary.ordersInProduction} helper={`${processOrders.length} Perintah Kerja`} />
        <Metric href="/admin/tracking" label="Need attention" value={summary.trackingNeedsAttention} helper="Tracking belum selesai" alert={summary.trackingNeedsAttention > 0} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_7px_22px_rgba(24,36,59,0.06)]">
          <PanelHeader title="Attention queue" href="/admin/notifications" count={attention.length} />
          <div className="divide-y divide-slate-100 px-2 py-1">
            {attention.length ? attention.map((item) => (
              <Link key={`${item.href}-${item.title}`} href={item.href} className="grid grid-cols-[4px_1fr_auto] gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50">
                <span className={`rounded-full ${item.tone === "red" ? "bg-red-500" : "bg-amber-500"}`} />
                <span><strong className="block text-xs font-semibold text-ink">{item.title}</strong><small className="mt-1 block text-[10px] text-ink-muted">{item.detail}</small></span>
                <ArrowUpRight className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
              </Link>
            )) : <div className="flex items-center gap-3 px-3 py-8 text-xs text-ink-muted"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Tidak ada pekerjaan prioritas saat ini.</div>}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-[0_7px_22px_rgba(24,36,59,0.06)]">
          <PanelHeader title="Production flow" href="/admin/process-orders" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {stages.map((stage) => (
              <div key={stage.label} className="relative min-h-28 border-b border-r border-slate-100 p-4 lg:border-b-0">
                <span className={`absolute left-4 top-0 h-[3px] w-7 rounded-full ${stage.color}`} />
                <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink-subtle">{stage.label}</p>
                <p className="mt-5 text-3xl font-bold tracking-[-0.04em] text-ink tabular-nums">{stage.count}</p>
                <p className="mt-1 text-[10px] text-ink-muted">Perintah Kerja</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <DataPanel title="Recent quotations" href="/admin/quotations">
          {quotations.slice(0, 5).map((quotation) => (
            <Link key={quotation.id} href={`/admin/quotations/${quotation.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[1.15fr_0.9fr_70px_auto] sm:items-center">
              <strong className="text-xs tracking-[-0.01em]">{quotation.quotationNumber}</strong><span className="text-[10px] text-ink-muted">{quotation.companyName}</span><span className="text-[10px] tabular-nums text-ink-muted">{quotation.totalQty} pcs</span><AdminBadge tone={adminStatusTone(quotation.status)}>{quotation.status}</AdminBadge>
            </Link>
          ))}
        </DataPanel>
        <DataPanel title="Recent orders & invoices" href="/admin/orders">
          {orders.slice(0, 5).map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[1fr_0.8fr_auto] sm:items-center">
              <span><strong className="block text-xs tracking-[-0.01em]">{order.orderNumber}</strong><small className="mt-1 block text-[9px] text-ink-muted">{order.companyName}</small></span><span className="text-[10px] font-semibold tabular-nums text-ink-muted">{formatRupiah(order.total)}</span><AdminBadge tone={adminStatusTone(order.paymentStatus)}>{order.paymentStatus}</AdminBadge>
            </Link>
          ))}
        </DataPanel>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-[0_7px_22px_rgba(24,36,59,0.06)]">
        <PanelHeader title="Quick commands" />
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink href="/admin/quotations/new" icon={<FilePlus2 />} title="New quotation" detail="Buat penawaran customer" />
          <QuickLink href="/admin/orders" icon={<ReceiptText />} title="Review invoice" detail="Periksa status pembayaran" />
          <QuickLink href="/admin/process-orders" icon={<Workflow />} title="Production queue" detail="Lihat pekerjaan berjalan" />
          <QuickLink href="/admin/shipments" icon={<PackageCheck />} title="Shipments" detail="Pantau pengiriman" />
        </div>
      </section>
    </div>
  );
}

function Metric({ href, label, value, helper, primary, alert }: { href: string; label: string; value: number; helper: string; primary?: boolean; alert?: boolean }) {
  return <Link href={href} className={`rounded-xl p-4 shadow-[0_7px_22px_rgba(24,36,59,0.06)] transition hover:-translate-y-0.5 ${primary ? "bg-gradient-to-br from-brand-900 to-brand-700 text-white" : "bg-white"}`}><p className={`text-[9px] font-semibold uppercase tracking-[0.09em] ${primary ? "text-blue-100/70" : "text-ink-subtle"}`}>{label}</p><p className={`mt-2 text-3xl font-bold tracking-[-0.04em] tabular-nums ${alert && !primary ? "text-red-600" : ""}`}>{value}</p><p className={`mt-2 text-[10px] ${primary ? "text-blue-100/70" : "text-ink-muted"}`}>{helper}</p></Link>;
}

function PanelHeader({ title, href, count }: { title: string; href?: string; count?: number }) {
  return <div className="flex min-h-11 items-center justify-between border-b border-slate-100 px-4"><h3 className="text-xs font-bold tracking-[-0.01em] text-ink">{title}{count !== undefined ? <span className="ml-2 rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] text-red-600">{count}</span> : null}</h3>{href ? <Link href={href} className="text-[10px] font-bold text-brand-700">View all →</Link> : null}</div>;
}

function DataPanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl bg-white shadow-[0_7px_22px_rgba(24,36,59,0.06)]"><PanelHeader title={title} href={href} /><div className="divide-y divide-slate-100">{children}</div></div>;
}

function QuickLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) {
  return <Link href={href} className="bg-white p-4 transition hover:bg-brand-50"><span className="text-brand-700 [&_svg]:h-4 [&_svg]:w-4">{icon}</span><strong className="mt-3 block text-xs text-ink">{title}</strong><small className="mt-1 block text-[9px] text-ink-muted">{detail}</small></Link>;
}
