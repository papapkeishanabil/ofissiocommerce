import Link from "next/link";
import { ArrowRight, BellRing, CheckCircle2, Clock3, FileText, MessageSquarePlus } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  AdminProcessRouteBadge,
  AdminProcessRouteLegend,
} from "@/features/admin/components/AdminProcessRouteBadge";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminQuotations } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminQuotationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const quotations = await listAdminQuotations({ status, search });

  const acceptedNew = quotations.filter((quotation) => quotation.isAcceptedNew);
  const requestedNew = quotations.filter((quotation) => quotation.isRequestedNew);
  const attentionCount = acceptedNew.length + requestedNew.length;
  const firstAttention = acceptedNew[0] ?? requestedNew[0];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin quotations"
        title="Request quotation B2B"
        description="Quotation yang baru masuk atau baru diterima customer disorot dan ditempatkan paling atas. Process routing memudahkan sales memperkirakan alur kerja."
        actions={
          <div className="flex flex-col gap-2">
            <ButtonLink href="/admin/quotations/new" size="sm" className="self-start sm:self-end">
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Input brief untuk approval
            </ButtonLink>
            <form className="flex flex-col gap-2 sm:flex-row" action="/admin/quotations">
          <input
            name="search"
            defaultValue={search}
            placeholder="Cari company / nomor"
            className="h-11 rounded-full border border-line bg-white px-4 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 rounded-full border border-line bg-white px-4 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            <option value="">Semua status</option>
            <option value="submitted">Submitted</option>
            <option value="emailed">Emailed</option>
            <option value="under_review">Under review</option>
            <option value="quoted">Quoted</option>
            <option value="revision_requested">Revision requested</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button type="submit" size="sm">Filter</Button>
            </form>
          </div>
        }
      />

      <div className="rounded-2xl border border-line bg-white p-4 shadow-soft-sm">
        <AdminProcessRouteLegend />
      </div>

      {attentionCount > 0 ? (
        <section
          aria-labelledby="quotation-attention-title"
          className="rounded-2xl bg-emerald-950 px-5 py-5 text-white shadow-soft-md md:px-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400 text-emerald-950">
                <BellRing className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="quotation-attention-title" className="text-lg font-bold tracking-tight">
                    {attentionCount} quotation butuh perhatian
                  </h2>
                  {acceptedNew.length > 0 ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-950">
                      {acceptedNew.length} diterima baru
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-100">
                  Quotation baru atau yang baru saja diterima customer muncul di urutan teratas.
                  Sorotan hilang otomatis setelah status diperbarui.
                </p>
              </div>
            </div>
            {firstAttention ? (
              <Link
                href={`/admin/quotations/${firstAttention.id}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Buka quotation teratas
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {quotations.length === 0 ? (
        <AdminEmptyState title="Quotation belum ada" />
      ) : (
        <section aria-labelledby="quotation-queue-title" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="quotation-queue-title" className="text-lg font-bold tracking-tight text-ink">
                Antrean quotation
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Urutan: quotation diterima baru, quotation baru, lalu perubahan status terbaru.
              </p>
            </div>
            <p className="text-xs font-medium text-ink-subtle">
              {quotations.length} total · {attentionCount} disorot
            </p>
          </div>

          <AdminTableShell>
            <table className={`${ADMIN_TABLE_CLASS} min-w-[1000px]`}>
              <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">Quotation</th>
                  <th className="px-4 py-3.5">Company / PIC</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Rute proses</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Diperbarui</th>
                  <th className="px-4 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotations.map((quotation) => (
                  <QuotationRow key={quotation.id} quotation={quotation} />
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        </section>
      )}
    </div>
  );
}

function QuotationRow({
  quotation,
}: {
  quotation: Awaited<ReturnType<typeof listAdminQuotations>>[number];
}) {
  const isAcceptedNew = quotation.isAcceptedNew;
  const isRequestedNew = quotation.isRequestedNew;
  return (
    <tr
      className={cn(
        "align-top transition-colors hover:bg-slate-50",
        isAcceptedNew && "bg-emerald-50/80 hover:bg-emerald-50",
        !isAcceptedNew && isRequestedNew && "bg-brand-50/70 hover:bg-brand-50",
      )}
      aria-label={
        isAcceptedNew
          ? `${quotation.quotationNumber}, baru saja diterima customer`
          : isRequestedNew
            ? `${quotation.quotationNumber}, quotation baru belum ditinjau`
            : undefined
      }
    >
      <td
        className={cn(
          "px-4 py-3.5 font-bold text-ink",
          isAcceptedNew && "border-l-4 border-l-emerald-500",
          !isAcceptedNew && isRequestedNew && "border-l-4 border-l-brand-500",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              isAcceptedNew
                ? "bg-emerald-700 text-white"
                : isRequestedNew
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-ink-subtle",
            )}
          >
            {isAcceptedNew ? (
              <BellRing className="h-4 w-4" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block">{quotation.quotationNumber}</span>
            {isAcceptedNew ? (
              <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Diterima baru
              </span>
            ) : isRequestedNew ? (
              <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-800 ring-1 ring-brand-200">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                Quotation baru
              </span>
            ) : null}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="font-semibold text-ink">{quotation.companyName}</div>
        <div className="text-xs text-ink-muted">
          {quotation.picName} · {quotation.picEmail ?? "-"}
        </div>
        {quotation.intakeChannel ? (
          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">
            {quotation.intakeChannel === "customer_portal"
              ? "Customer portal"
              : `Sales · ${quotation.intakeChannel}`}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3.5">
        <AdminBadge tone={adminStatusTone(quotation.status)}>{quotation.status}</AdminBadge>
      </td>
      <td className="px-4 py-3.5">
        <AdminProcessRouteBadge route={quotation.processRoute} />
      </td>
      <td className="px-4 py-3.5">
        <AdminBadge tone={adminStatusTone(quotation.emailStatus)}>{quotation.emailStatus}</AdminBadge>
      </td>
      <td className="px-4 py-3.5">
        <span className="font-semibold text-ink">{quotation.itemCount}</span>
        <span className="block text-xs text-ink-muted">{quotation.totalQty} pcs</span>
      </td>
      <td className="px-4 py-3.5">
        {quotation.status === "accepted" && quotation.acceptedAt ? (
          <>
            <span className="block text-xs font-bold text-emerald-800">Diterima</span>
            {formatAdminDate(quotation.acceptedAt)}
          </>
        ) : (
          formatAdminDate(quotation.updatedAt || quotation.createdAt)
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <Link
          href={`/admin/quotations/${quotation.id}`}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-bold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2",
            isAcceptedNew
              ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700"
              : "bg-brand-700 hover:bg-brand-800 focus-visible:outline-brand-700",
          )}
        >
          Lihat detail
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}
