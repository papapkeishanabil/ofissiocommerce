import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackagePlus,
  WalletCards,
} from "lucide-react";

import { listAdminOrders } from "@/features/admin/admin.service";
import type { AdminOrderRow } from "@/features/admin/admin.types";
import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  AdminProcessRouteBadge,
  AdminProcessRouteLegend,
} from "@/features/admin/components/AdminProcessRouteBadge";
import { AdminTableShell } from "@/features/admin/components/AdminSurface";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import { cn } from "@/lib/utils";

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();
  const readyToProcess = orders.filter((order) => order.needsProcessing);
  const newlyPaid = orders.filter((order) => order.isPaymentNew);
  const waitingPayment = orders.filter(
    (order) => order.paymentStatus === "waiting_payment",
  );
  const inProgress = orders.filter((order) => order.processStatus === "in_progress");
  const firstPriorityOrder = readyToProcess[0];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-white shadow-soft-sm">
        <div className="flex flex-col gap-5 px-5 py-6 md:px-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-ink md:text-3xl">
              Order & antrean proses
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Pembayaran yang baru diterima diprioritaskan agar tim dapat langsung
              menjalankan fulfillment, customization, atau production.
            </p>
            <div className="mt-4">
              <AdminProcessRouteLegend />
            </div>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-ink-muted">
            <PackageCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
            {orders.length} total order
          </div>
        </div>
        <dl className="grid border-t border-line bg-slate-50/80 sm:grid-cols-3">
          <OrderMetric
            label="Lunas, perlu diproses"
            value={readyToProcess.length}
            tone="success"
          />
          <OrderMetric
            label="Menunggu pembayaran"
            value={waitingPayment.length}
            tone="warning"
          />
          <OrderMetric label="Sedang diproses" value={inProgress.length} tone="brand" />
        </dl>
      </section>

      {firstPriorityOrder ? (
        <section
          aria-labelledby="payment-priority-title"
          className="rounded-2xl bg-emerald-950 px-5 py-5 text-white shadow-soft-md md:px-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400 text-emerald-950">
                <BellRing className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="payment-priority-title" className="text-lg font-bold tracking-tight">
                    {readyToProcess.length} order lunas siap diproses
                  </h2>
                  {newlyPaid.length > 0 ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-950">
                      {newlyPaid.length} pembayaran baru
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-100">
                  Order yang sudah dibayar namun belum dimulai ditempatkan paling atas.
                  Highlight hilang otomatis setelah proses order berjalan.
                </p>
              </div>
            </div>
            <Link
              href={`/admin/orders/${firstPriorityOrder.id}`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Proses order teratas
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      {orders.length === 0 ? (
        <AdminEmptyState title="Belum ada order" />
      ) : (
        <section id="order-queue" aria-labelledby="order-queue-title" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="order-queue-title" className="text-lg font-bold tracking-tight text-ink">
                Antrean operasional
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Urutan: pembayaran baru, order lunas yang belum diproses, lalu order terbaru.
              </p>
            </div>
            <p className="text-xs font-medium text-ink-subtle">
              Status tidak hanya dibedakan dengan warna, tetapi juga label dan posisi.
            </p>
          </div>

          <div className="space-y-3 lg:hidden">
            {orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </div>

          <AdminTableShell className="hidden lg:block">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <caption className="sr-only">
                Daftar order berdasarkan prioritas pembayaran dan proses
              </caption>
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                <tr>
                  <th className="px-5 py-3.5">Order & customer</th>
                  <th className="px-4 py-3.5">Pembayaran</th>
                  <th className="px-4 py-3.5">Rute proses</th>
                  <th className="px-4 py-3.5">Progres</th>
                  <th className="px-4 py-3.5">Operasional</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <DesktopOrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        </section>
      )}
    </div>
  );
}

function OrderMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "brand";
}) {
  const toneClass = {
    success: "text-emerald-700",
    warning: "text-amber-700",
    brand: "text-brand-700",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-4 border-line px-5 py-4 sm:border-r sm:last:border-r-0 md:px-7">
      <dt className="text-sm font-medium text-ink-muted">{label}</dt>
      <dd className={cn("text-xl font-extrabold tabular-nums", toneClass)}>{value}</dd>
    </div>
  );
}

function DesktopOrderRow({ order }: { order: AdminOrderRow }) {
  const paid = isPaid(order);
  const priority = order.attentionType === "payment_received";
  return (
    <tr
      className={cn(
        "align-middle transition-colors hover:bg-slate-50",
        priority && "bg-emerald-50/80 hover:bg-emerald-50",
        !priority && order.isNew && "bg-brand-50/70 hover:bg-brand-50",
      )}
      aria-label={attentionAriaLabel(order)}
    >
      <td className="px-5 py-4">
        <div className="flex min-w-[260px] items-start gap-3">
          <OrderSignal order={order} />
          <div className="min-w-0">
            <p className="font-bold text-ink">{order.orderNumber}</p>
            <p className="mt-0.5 truncate text-sm text-ink-muted">{order.companyName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
              <span>{formatAdminDate(order.createdAt)}</span>
              {order.isPaymentNew ? <NewPaymentLabel /> : order.isNew ? <NewOrderLabel /> : null}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1.5">
          <AdminBadge
            tone={paid ? "success" : adminStatusTone(order.paymentStatus)}
            className={paid ? "bg-emerald-100 px-2.5 py-1 text-emerald-800 ring-emerald-200" : undefined}
          >
            {paid ? "PAID" : paymentStatusLabel(order.paymentStatus)}
          </AdminBadge>
          <p className="font-bold tabular-nums text-ink">{formatRupiah(order.total)}</p>
          {order.needsProcessing ? (
            <p className="text-xs font-semibold text-emerald-800">Siap masuk proses</p>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-4">
        <AdminProcessRouteBadge route={order.processRoute} />
        <p className="mt-1.5 text-xs text-ink-muted">
          {order.hasCustomization
            ? customizationLabel(order.customizationType)
            : "Produk standar"}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="font-semibold text-ink">{processStatusLabel(order.processStatus)}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <span
              className={cn("block h-full rounded-full", paid ? "bg-emerald-500" : "bg-brand-600")}
              style={{ width: `${Math.max(2, Math.min(100, order.progress))}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-ink-muted">
            {order.progress}%
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1 text-xs text-ink-muted">
          <p>
            Tracking: <span className="font-semibold text-ink">{trackingLabel(order.trackingStatus)}</span>
          </p>
          <p>
            Replenishment:{" "}
            <span className={cn("font-semibold", order.replenishmentStatus === "not_required" ? "text-ink" : "text-amber-700")}>
              {order.replenishmentStatus === "not_required" ? "Tidak perlu" : "Perlu ditangani"}
            </span>
          </p>
          <p>
            Woo: <span className="font-semibold text-ink">{order.wooSyncStatus}</span>
          </p>
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          href={`/admin/orders/${order.id}`}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
            priority
              ? "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700"
              : "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700",
          )}
        >
          {priority ? "Proses order" : "Lihat detail"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function MobileOrderCard({ order }: { order: AdminOrderRow }) {
  const paid = isPaid(order);
  const priority = order.attentionType === "payment_received";
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-soft-sm",
        priority && "bg-emerald-50",
        !priority && order.isNew && "bg-brand-50",
      )}
      aria-label={attentionAriaLabel(order)}
    >
      <div className="flex items-start gap-3 p-4">
        <OrderSignal order={order} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{order.orderNumber}</p>
              <p className="mt-0.5 truncate text-sm text-ink-muted">{order.companyName}</p>
            </div>
            <AdminBadge tone={paid ? "success" : adminStatusTone(order.paymentStatus)}>
              {paid ? "PAID" : paymentStatusLabel(order.paymentStatus)}
            </AdminBadge>
          </div>
          <p className="mt-3 text-lg font-extrabold tabular-nums text-ink">
            {formatRupiah(order.total)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.isPaymentNew ? <NewPaymentLabel /> : order.isNew ? <NewOrderLabel /> : null}
            <AdminProcessRouteBadge route={order.processRoute} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-line bg-white/70 px-4 py-3 text-xs">
        <div>
          <p className="text-ink-subtle">Status proses</p>
          <p className="mt-1 font-semibold text-ink">{processStatusLabel(order.processStatus)}</p>
        </div>
        <div>
          <p className="text-ink-subtle">Dibuat</p>
          <p className="mt-1 font-semibold text-ink">{formatAdminDate(order.createdAt)}</p>
        </div>
      </div>
      <div className="p-3 pt-0">
        <Link
          href={`/admin/orders/${order.id}`}
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2",
            priority
              ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700"
              : "bg-brand-700 hover:bg-brand-800 focus-visible:outline-brand-700",
          )}
        >
          {priority ? "Proses order" : "Lihat detail"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function OrderSignal({ order }: { order: AdminOrderRow }) {
  if (order.attentionType === "payment_received") {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white">
        {order.isPaymentNew ? (
          <BellRing className="h-5 w-5" aria-hidden="true" />
        ) : (
          <WalletCards className="h-5 w-5" aria-hidden="true" />
        )}
      </span>
    );
  }
  if (order.isNew) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
        <PackagePlus className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-ink-subtle">
      <PackageCheck className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function NewPaymentLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      Pembayaran baru
    </span>
  );
}

function NewOrderLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand-800">
      <Clock3 className="h-3 w-3" aria-hidden="true" />
      Order baru
    </span>
  );
}

function isPaid(order: AdminOrderRow) {
  return order.paymentStatus === "paid" || order.orderStatus === "payment_received";
}

function attentionAriaLabel(order: AdminOrderRow) {
  if (order.isPaymentNew) {
    return `${order.orderNumber}, pembayaran baru diterima dan siap diproses`;
  }
  if (order.needsProcessing) {
    return `${order.orderNumber}, sudah lunas dan perlu diproses`;
  }
  if (order.isNew) return `${order.orderNumber}, order baru`;
  return undefined;
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting_payment: "Menunggu bayar",
    pending: "Menunggu bayar",
    failed: "Gagal",
    expired: "Kedaluwarsa",
    cancelled: "Dibatalkan",
    manual_review: "Perlu verifikasi",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function processStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "Belum dimulai",
    ready_to_process: "Siap diproses",
    in_progress: "Sedang diproses",
    waiting_replenishment: "Menunggu replenishment",
    completed: "Selesai",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function customizationLabel(type: string) {
  const labels: Record<string, string> = {
    embroidery: "Bordir",
    screen_printing: "Sablon",
    dtf: "DTF",
    name_tag: "Name tag",
    custom_design: "Desain khusus",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}

function trackingLabel(status: string) {
  return status === "-" ? "Belum tersedia" : status.replaceAll("_", " ");
}
