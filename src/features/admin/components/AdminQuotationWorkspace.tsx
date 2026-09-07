import Link from "next/link";
import { ArrowRight, BellRing, CheckCircle2, ChevronRight, Clock3, FileText, MessageSquarePlus } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  AdminProcessRouteBadge,
  AdminProcessRouteLegend,
} from "@/features/admin/components/AdminProcessRouteBadge";
import {
  ADMIN_ACTION_LINK_CLASS,
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminQuotations } from "@/features/admin/admin.service";
import { listAdminNotifications } from "@/features/admin-notifications/admin-notification.service";
import { formatAdminDate } from "@/features/admin/admin.utils";
import { formatCustomerRequestNumber } from "@/features/quotation/quotation.utils";
import { cn } from "@/lib/utils";
import type { InternalRole } from "@/lib/security/security.types";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function AdminQuotationWorkspace({ searchParams, workspace, viewerRole, viewerUserId }: PageProps & { workspace: "request" | "quotation"; viewerRole?: InternalRole; viewerUserId?: string }) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const focus = typeof params.focus === "string" ? params.focus : undefined;
  const allQuotations = await listAdminQuotations({ status, search });
  const roleFilteredQuotations = allQuotations.filter((quotation) => {
    if (quotation.workspace !== workspace) return false;
    if (viewerRole === "sales") return quotation.processRoute === "production";
    if (viewerRole === "sales_admin") return quotation.processRoute !== "production";
    return true;
  });
  const isRequestWorkspace = workspace === "request";
  const quotations = focus === "action"
    ? roleFilteredQuotations.filter((quotation) => quotationAction(quotation, isRequestWorkspace).needsAction)
    : roleFilteredQuotations;

  const acceptedNew = quotations.filter((quotation) => quotation.isAcceptedNew);
  const requestedNew = quotations.filter((quotation) => quotation.isRequestedNew);
  const attentionCount = acceptedNew.length + requestedNew.length;
  const firstAttention = acceptedNew[0] ?? requestedNew[0];
  const supportTickets = isRequestWorkspace && viewerRole && viewerUserId
    ? (await listAdminNotifications({ role: viewerRole, userId: viewerUserId }, { limit: 100 })).notifications
        .filter((notification) => notification.entityType === "support_ticket")
    : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={isRequestWorkspace ? "Customer requests" : "Official quotations"}
        title={isRequestWorkspace ? "Permintaan Customer" : "Quotation Resmi"}
        description={isRequestWorkspace ? "Ruang kerja discovery dan konsultasi untuk custom bordir, production, dan Full Custom sampai kebutuhan siap menjadi penawaran resmi." : "Penawaran resmi yang sudah dikirim ke customer, termasuk proses accept, revisi komersial, penolakan, dan konversi menjadi order."}
        actions={
          <div className="flex flex-col gap-2">
            <ButtonLink href="/admin/quotations/new" size="sm" className="self-start sm:self-end">
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Input brief untuk approval
            </ButtonLink>
            <form className="flex flex-col gap-2 sm:flex-row" action={isRequestWorkspace ? "/admin/requests" : "/admin/quotations"}>
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
          <select
            name="focus"
            defaultValue={focus ?? ""}
            className="h-11 rounded-full border border-line bg-white px-4 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            aria-label="Fokus antrean"
          >
            <option value="">Semua pekerjaan</option>
            <option value="action">Butuh tindakan</option>
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
                    {attentionCount} {isRequestWorkspace ? "permintaan" : "quotation"} butuh perhatian
                  </h2>
                  {acceptedNew.length > 0 ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-950">
                      {acceptedNew.length} diterima baru
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-100">
                  {isRequestWorkspace ? "Permintaan baru yang perlu konsultasi muncul di urutan teratas." : "Quotation yang baru diterima customer muncul di urutan teratas."}
                  Sorotan hilang otomatis setelah status diperbarui.
                </p>
              </div>
            </div>
            {firstAttention ? (
              <Link
                href={`/admin/quotations/${firstAttention.id}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Buka {isRequestWorkspace ? "permintaan" : "quotation"} teratas
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {isRequestWorkspace && supportTickets.length > 0 ? (
        <section aria-labelledby="support-ticket-queue-title" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="support-ticket-queue-title" className="text-lg font-bold tracking-tight text-ink">
                Tiket bantuan & konsultasi Ofistant
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Permintaan bantuan yang dibuat dari panel Ofistant sebelum menjadi brief atau quotation.
              </p>
            </div>
            <p className="text-xs font-medium text-ink-subtle">
              {supportTickets.length} tiket · {supportTickets.filter((ticket) => ticket.status === "unread").length} baru
            </p>
          </div>

          <AdminTableShell>
            <table className={`${ADMIN_TABLE_CLASS} min-w-[1050px]`}>
              <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">Nomor tiket</th>
                  <th className="px-4 py-3.5">Company / customer</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Penanggung jawab</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Dibuat</th>
                  <th className="px-4 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {supportTickets.map((ticket) => {
                  const destination = String(ticket.metadata.destination ?? "");
                  const category = String(ticket.metadata.category ?? "");
                  const ticketReviewUrl = `/admin/support-tickets/${encodeURIComponent(ticket.id)}`;
                  return (
                    <tr key={ticket.id} className={cn("align-top hover:bg-slate-50", ticket.status === "unread" && "bg-brand-50/70")}>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-ink">{ticket.entityNumber ?? ticket.entityId}</p>
                        {ticket.status === "unread" ? <span className="mt-1 inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-800">Tiket baru</span> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-ink">{String(ticket.metadata.companyName ?? "-")}</p>
                        <p className="text-xs text-ink-muted">{String(ticket.metadata.customerName ?? "-")}</p>
                        {ticket.metadata.orderNumber ? <p className="mt-1 text-xs font-semibold text-brand-700">Order {String(ticket.metadata.orderNumber)}</p> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <AdminProcessRouteBadge route={category === "full_custom_production" ? "production" : category === "catalog_customization" ? "customization" : "fulfillment"} />
                        <p className="mt-1 max-w-64 text-xs text-ink-muted">{String(ticket.metadata.reason ?? ticket.message)}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-ink">{destination === "cs_full_custom" ? "CS Full Custom Ofissio" : "Admin Ofissio"}</td>
                      <td className="px-4 py-3.5"><AdminBadge tone={adminStatusTone(ticket.status)}>{ticket.status}</AdminBadge></td>
                      <td className="px-4 py-3.5 text-sm text-ink-muted">{formatAdminDate(ticket.createdAt)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={ticketReviewUrl} className={cn(ADMIN_ACTION_LINK_CLASS, "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700")}>
                          Tinjau tiket <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminTableShell>
        </section>
      ) : null}

      {quotations.length === 0 ? (
        <AdminEmptyState title={isRequestWorkspace ? "Permintaan customer belum ada" : "Quotation resmi belum ada"} />
      ) : (
        <section aria-labelledby="quotation-queue-title" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="quotation-queue-title" className="text-lg font-bold tracking-tight text-ink">
                {isRequestWorkspace ? "Antrean permintaan customer" : "Antrean quotation resmi"}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {isRequestWorkspace ? "Gunakan ruang ini untuk konsultasi kebutuhan sampai jadwal, spesifikasi, dan biaya siap dikirim." : "Hanya penawaran resmi yang sudah dikirim atau pernah dikirim kepada customer."}
              </p>
            </div>
            <p className="text-xs font-medium text-ink-subtle">
              {quotations.length} total · {attentionCount} disorot
            </p>
          </div>

          <AdminTableShell>
            <table className={`${ADMIN_TABLE_CLASS} min-w-[1260px]`}>
              <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">{isRequestWorkspace ? "Permintaan" : "Quotation"}</th>
                  <th className="px-4 py-3.5">Company / PIC</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Rute proses</th>
                  <th className="px-4 py-3.5">Tindakan berikutnya</th>
                  <th className="px-4 py-3.5">Penanggung jawab</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Diperbarui</th>
                  <th className="px-4 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotations.map((quotation) => (
                    <QuotationRow key={quotation.id} quotation={quotation} requestWorkspace={isRequestWorkspace} />
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
  requestWorkspace,
}: {
  quotation: Awaited<ReturnType<typeof listAdminQuotations>>[number];
  requestWorkspace: boolean;
}) {
  const isAcceptedNew = quotation.isAcceptedNew;
  const isRequestedNew = quotation.isRequestedNew;
  const displayNumber = requestWorkspace
    ? formatCustomerRequestNumber(quotation.quotationNumber, quotation.processRoute)
    : quotation.quotationNumber;
  const action = quotationAction(quotation, requestWorkspace);
  return (
    <tr
      className={cn(
        "align-top transition-colors hover:bg-slate-50",
        isAcceptedNew && "bg-emerald-50/80 hover:bg-emerald-50",
        !isAcceptedNew && isRequestedNew && "bg-brand-50/70 hover:bg-brand-50",
      )}
      aria-label={
        isAcceptedNew
          ? `${displayNumber}, baru saja diterima customer`
          : isRequestedNew
            ? `${displayNumber}, permintaan baru belum ditinjau`
            : undefined
      }
    >
      <td className="px-4 py-3.5 font-bold text-ink">
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
            <span className="block">{displayNumber}</span>
            {isAcceptedNew ? (
              <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Diterima baru
              </span>
            ) : isRequestedNew ? (
              <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-800 ring-1 ring-brand-200">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                {requestWorkspace ? "Permintaan baru" : "Quotation baru"}
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
        <p className={cn("max-w-52 text-sm font-bold", action.urgent ? "text-red-700" : action.needsAction ? "text-amber-800" : "text-ink")}>{action.label}</p>
        <p className="mt-1 text-xs text-ink-muted">{ageLabel(quotation.updatedAt || quotation.createdAt)}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-ink">{ownerLabel(quotation.processRoute, requestWorkspace)}</p>
        <p className="mt-1 text-xs text-ink-muted">Belum ditugaskan personal</p>
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
            ADMIN_ACTION_LINK_CLASS,
            isAcceptedNew
              ? "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700"
              : "border border-line bg-white text-brand-700 hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-brand-600",
          )}
        >
          Lihat detail
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function quotationAction(
  quotation: Awaited<ReturnType<typeof listAdminQuotations>>[number],
  requestWorkspace: boolean,
) {
  if (quotation.emailStatus === "failed") return { label: "Periksa email dan kirim ulang", needsAction: true, urgent: true };
  if (quotation.status === "revision_requested") return { label: "Tinjau revisi customer", needsAction: true, urgent: true };
  if (quotation.status === "accepted") return { label: "Konversi menjadi order", needsAction: true, urgent: false };
  if (requestWorkspace && quotation.status === "submitted") return { label: "Tinjau kebutuhan customer", needsAction: true, urgent: false };
  if (requestWorkspace && quotation.status === "under_review") return { label: "Lanjutkan konsultasi / siapkan penawaran", needsAction: true, urgent: false };
  if (quotation.status === "quoted") return { label: "Menunggu customer; lakukan follow-up", needsAction: ageInHours(quotation.updatedAt) >= 48, urgent: ageInHours(quotation.updatedAt) >= 120 };
  if (quotation.status === "converted_to_order") return { label: "Selesai — pantau di Orders", needsAction: false, urgent: false };
  return { label: "Tidak ada tindakan aktif", needsAction: false, urgent: false };
}

function ownerLabel(route: "fulfillment" | "customization" | "production", requestWorkspace: boolean) {
  if (route === "production") return "CS Ofissio";
  if (requestWorkspace) return "Admin Ofissio";
  return "Sales / Admin Ofissio";
}

function ageInHours(value: string) {
  return Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 3_600_000));
}

function ageLabel(value: string) {
  const hours = ageInHours(value);
  if (hours < 24) return `Diperbarui ${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `Diperbarui ${days} hari lalu${days >= 3 ? " · perlu dicek" : ""}`;
}
