import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminEmailTestForm } from "@/features/email/components/AdminEmailTestForm";
import { validateEmailConfig } from "@/features/email/email.config";
import { emailRepository } from "@/features/email/email.repository";
import type { EmailLog, EmailStatus } from "@/features/email/email.types";

export const dynamic = "force-dynamic";

export default async function AdminEmailSettingsPage() {
  await requireInternalAdminServer("admin:email:view");
  const validation = validateEmailConfig();
  const config = validation.config;
  const emailLogs = await emailRepository.listAll().catch(() => []);
  const recentLogs = emailLogs.slice(0, 20);
  const defaultTo =
    config.testEmailTo ??
    config.orderNotificationEmails[0] ??
    config.salesQuotationEmail ??
    "";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft-sm">
        <div className="grid gap-6 bg-gradient-to-br from-brand-900 via-brand-800 to-blue-700 px-5 py-7 text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              Communication operations
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Email Settings & Logs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Pantau kesiapan provider email, kirim email uji secara aman, dan periksa
              hasil pengiriman terbaru tanpa membuka credential provider.
            </p>
          </div>
          <a
            href="#recent-email-logs"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Lihat Email Logs
          </a>
        </div>
      </section>

      <section aria-labelledby="email-status-heading" className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">
            Runtime status
          </p>
          <h3 id="email-status-heading" className="mt-1 text-xl font-bold text-ink">
            Status konfigurasi email
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatusCard
            label="Provider aktif"
            value={config.provider}
            detail={`Requested: ${config.requestedProvider}`}
            ready={config.requestedProvider === config.provider}
          />
          <StatusCard
            label="Pengiriman email"
            value={config.enabled ? "Enabled" : "Disabled"}
            detail="EMAIL_ENABLED"
            ready={config.enabled}
          />
          <StatusCard
            label="Resend credential"
            value={config.resendConfigured ? "Configured" : "Not configured"}
            detail="API key tidak pernah ditampilkan"
            ready={config.resendConfigured}
          />
          <StatusCard
            label="SMTP credential"
            value={config.smtp.configured ? "Configured" : "Not configured"}
            detail="Password tidak pernah ditampilkan"
            ready={config.smtp.configured}
          />
          <StatusCard
            label="Order notification"
            value={config.orderNotificationEmailEnabled ? "Enabled" : "Disabled"}
            detail={`${config.orderNotificationEmails.length} penerima valid`}
            ready={
              config.orderNotificationEmailEnabled &&
              config.orderNotificationEmails.length > 0
            }
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm md:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-ink">Konfigurasi aman</h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Informasi sender dan penerima dapat dilihat oleh admin berizin.
                RESEND_API_KEY dan SMTP_PASSWORD tetap hanya dibaca server.
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <ConfigRow label="EMAIL_FROM" value={config.from} />
            <ConfigRow label="EMAIL_REPLY_TO" value={config.replyTo ?? "Belum diisi"} />
            <ConfigRow
              label="SALES_QUOTATION_EMAIL"
              value={config.salesQuotationEmail ?? "Belum diisi"}
            />
            <ConfigRow
              label="ORDER_NOTIFICATION_EMAILS"
              value={
                config.orderNotificationEmails.length > 0
                  ? config.orderNotificationEmails.join(", ")
                  : "Belum diisi"
              }
            />
            <ConfigRow label="SMTP_HOST" value={config.smtp.host ?? "Belum diisi"} />
            <ConfigRow label="SMTP_PORT" value={String(config.smtp.port)} />
            <ConfigRow
              label="SMTP_SECURE"
              value={config.smtp.secure ? "true" : "false"}
            />
            <ConfigRow label="SMTP_USER" value={config.smtp.user ?? "Belum diisi"} />
            <ConfigRow
              label="SMTP_PASSWORD"
              value={config.smtp.passwordConfigured ? "Configured (masked)" : "Not configured"}
            />
          </dl>

          {!validation.ok || validation.warnings.length > 0 ? (
            <div className="mt-5 space-y-2">
              {[...validation.issues, ...validation.warnings].map((message) => (
                <div
                  key={message}
                  className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Konfigurasi email valid untuk provider yang dipilih.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm md:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Send className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-ink">Kirim email uji</h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Endpoint dilindungi RBAC, validasi alamat, dan rate limit tiga
                request per sepuluh menit.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <AdminEmailTestForm defaultTo={defaultTo} />
          </div>
        </section>
      </div>

      <section
        id="recent-email-logs"
        aria-labelledby="recent-email-logs-heading"
        className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft-sm"
      >
        <div className="flex flex-col gap-2 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between md:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">
              Delivery audit
            </p>
            <h3 id="recent-email-logs-heading" className="mt-1 text-xl font-bold text-ink">
              Email logs terbaru
            </h3>
          </div>
          <p className="text-xs text-ink-muted">Menampilkan maksimal 20 log terbaru</p>
        </div>

        {recentLogs.length === 0 ? (
          <div className="grid min-h-52 place-items-center p-8 text-center">
            <div>
              <Mail className="mx-auto h-7 w-7 text-ink-subtle" aria-hidden="true" />
              <p className="mt-3 font-bold text-ink">Belum ada email log</p>
              <p className="mt-1 text-sm text-ink-muted">
                Kirim test email untuk membuat log pertama.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-subtle">
                  <tr>
                    <th className="px-5 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Penerima</th>
                    <th className="px-4 py-3 font-bold">Provider</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Related entity</th>
                    <th className="px-5 py-3 font-bold">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/70">
                      <td className="max-w-sm px-5 py-4">
                        <p className="font-bold text-ink">{log.subject}</p>
                        <p className="mt-1 text-xs text-ink-muted">{log.type}</p>
                      </td>
                      <td className="max-w-xs px-4 py-4 text-ink-muted">
                        {log.to.join(", ") || "-"}
                      </td>
                      <td className="px-4 py-4 font-medium text-ink">{log.provider}</td>
                      <td className="px-4 py-4"><EmailStatusBadge status={log.status} /></td>
                      <td className="px-4 py-4 text-xs text-ink-muted">{relatedEntity(log)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-ink-muted">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {recentLogs.map((log) => (
                <article key={log.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{log.subject}</p>
                      <p className="mt-1 text-xs text-ink-muted">{log.type} · {log.provider}</p>
                    </div>
                    <EmailStatusBadge status={log.status} />
                  </div>
                  <dl className="mt-3 space-y-2 text-xs">
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-ink-subtle">Penerima</dt>
                      <dd className="mt-0.5 break-all text-ink-muted">{log.to.join(", ") || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-bold text-ink-subtle">Entity</dt>
                      <dd className="text-right text-ink-muted">{relatedEntity(log)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-bold text-ink-subtle">Waktu</dt>
                      <dd className="text-right text-ink-muted">{formatDate(log.createdAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <p className="text-xs leading-5 text-ink-muted">
        Pengaturan credential dilakukan melalui environment server. Lihat{" "}
        <Link href="/admin/audit" className="font-bold text-brand-700 hover:underline">
          audit activity
        </Link>{" "}
        untuk jejak operasional tambahan.
      </p>
    </div>
  );
}

function StatusCard({
  label,
  value,
  detail,
  ready,
}: {
  label: string;
  value: string;
  detail: string;
  ready: boolean;
}) {
  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-soft-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{label}</p>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} />
      </div>
      <p className="mt-3 text-lg font-bold capitalize text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{detail}</p>
    </article>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-slate-50 p-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const tone =
    status === "sent"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "mocked"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : status === "failed"
          ? "bg-red-50 text-red-700 ring-red-200"
          : status === "queued"
            ? "bg-amber-50 text-amber-700 ring-amber-200"
            : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone}`}>
      {status}
    </span>
  );
}

function relatedEntity(log: EmailLog) {
  const metadata = log.safeMetadata;
  const value =
    metadata.orderNumber ??
    metadata.quotationNumber ??
    metadata.orderId ??
    metadata.notificationId ??
    "-";
  return String(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
