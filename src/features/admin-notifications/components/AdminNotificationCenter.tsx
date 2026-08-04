"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import type {
  AdminNotification,
  AdminNotificationStatus,
  AdminNotificationType,
} from "../admin-notification.types";
import { useAdminNotifications } from "./AdminNotificationProvider";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{ value: "all" | AdminNotificationStatus; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "unread", label: "Belum Dibaca" },
  { value: "read", label: "Sudah Dibaca" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
];

const TYPE_FILTERS: Array<{ value: "all" | AdminNotificationType; label: string }> = [
  { value: "all", label: "Semua tipe" },
  { value: "order_created", label: "Order" },
  { value: "quotation_requested", label: "Quotation baru" },
  { value: "quotation_accepted", label: "Quotation diterima" },
  { value: "payment_paid", label: "Payment" },
  { value: "shipment_created", label: "Shipment" },
  { value: "system_warning", label: "System" },
];

export function AdminNotificationCenter() {
  const { request, mutate, refresh: refreshSummary } = useAdminNotifications();
  const [status, setStatus] = useState<"all" | AdminNotificationStatus>("all");
  const [type, setType] = useState<"all" | AdminNotificationType>("all");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);
    return params.toString();
  }, [status, type]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request(`/api/admin/notifications?${query}`);
      const payload = (await response.json().catch(() => ({}))) as {
        notifications?: AdminNotification[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "Notifikasi belum dapat dimuat.");
      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Notifikasi belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [query, request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateNotification(
    id: string,
    action: "read" | "acknowledge" | "resolve",
  ) {
    if (await mutate(id, action)) {
      await Promise.all([load(), refreshSummary()]);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-brand-800 via-brand-700 to-blue-600 px-5 py-6 text-white md:flex-row md:items-end md:justify-between md:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              Operations inbox
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Notifikasi Admin</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Order baru tetap aktif sampai tim mengakui atau menyelesaikan tindak lanjutnya.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            Muat Ulang
          </button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_240px] md:p-5">
          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-subtle">Status</legend>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  aria-pressed={status === filter.value}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                    status === filter.value
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-line bg-white text-ink-muted hover:border-brand-200 hover:text-brand-700",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-bold uppercase tracking-wide text-ink-subtle">
            Tipe
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="mt-2 min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium normal-case tracking-normal text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {TYPE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && notifications.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-ink-subtle">
              <BellRing className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-bold text-ink">Tidak ada notifikasi pada filter ini</h3>
            <p className="mt-1 text-sm text-ink-muted">Notifikasi operasional baru akan muncul di sini.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white shadow-soft-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-subtle">
                  <tr>
                    <th className="px-5 py-3 font-bold">Notifikasi</th>
                    <th className="px-4 py-3 font-bold">Entity</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Waktu</th>
                    <th className="px-5 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {notifications.map((notification) => (
                    <NotificationTableRow
                      key={notification.id}
                      notification={notification}
                      onAction={updateNotification}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {notifications.map((notification) => (
              <NotificationMobileCard
                key={notification.id}
                notification={notification}
                onAction={updateNotification}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ActionHandler = (
  id: string,
  action: "read" | "acknowledge" | "resolve",
) => Promise<void>;

function NotificationTableRow({ notification, onAction }: { notification: AdminNotification; onAction: ActionHandler }) {
  return (
    <tr className="align-top hover:bg-slate-50/70">
      <td className="max-w-md px-5 py-4">
        <div className="flex gap-3">
          <SeverityIcon notification={notification} />
          <div>
            <p className="font-bold text-ink">{notification.title}</p>
            <p className="mt-1 line-clamp-2 text-ink-muted">{notification.message}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-ink-subtle">{typeLabel(notification.type)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 font-mono text-xs text-ink-muted">{notification.entityNumber ?? notification.entityId}</td>
      <td className="px-4 py-4"><StatusBadge status={notification.status} /></td>
      <td className="whitespace-nowrap px-4 py-4 text-xs text-ink-muted">{formatDate(notification.createdAt)}</td>
      <td className="px-5 py-4"><NotificationActions notification={notification} onAction={onAction} align="end" /></td>
    </tr>
  );
}

function NotificationMobileCard({ notification, onAction }: { notification: AdminNotification; onAction: ActionHandler }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-soft-sm">
      <div className="flex gap-3">
        <SeverityIcon notification={notification} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-bold text-ink">{notification.title}</h3>
            <StatusBadge status={notification.status} />
          </div>
          <p className="mt-1 text-sm leading-5 text-ink-muted">{notification.message}</p>
          <p className="mt-2 break-all font-mono text-xs text-ink-subtle">{notification.entityNumber ?? notification.entityId}</p>
          <p className="mt-2 text-xs text-ink-subtle">{formatDate(notification.createdAt)}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <NotificationActions notification={notification} onAction={onAction} />
      </div>
    </article>
  );
}

function NotificationActions({ notification, onAction, align = "start" }: { notification: AdminNotification; onAction: ActionHandler; align?: "start" | "end" }) {
  const url = String(notification.metadata.adminUrl ?? `/admin/orders/${notification.entityId}`);
  return (
    <div className={cn("flex flex-wrap gap-2", align === "end" && "justify-end")}>
      <Link href={url} onClick={() => notification.status === "unread" && void onAction(notification.id, "read")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink hover:border-brand-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
        Lihat <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
      {notification.status === "unread" ? (
        <button type="button" onClick={() => void onAction(notification.id, "read")} className="min-h-9 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink-muted hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Tandai Dibaca</button>
      ) : null}
      {notification.status === "unread" || notification.status === "read" ? (
        <button type="button" onClick={() => void onAction(notification.id, "acknowledge")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Saya Proses</button>
      ) : null}
      {notification.status !== "resolved" ? (
        <button type="button" onClick={() => void onAction(notification.id, "resolve")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Selesai</button>
      ) : null}
    </div>
  );
}

function SeverityIcon({ notification }: { notification: AdminNotification }) {
  const tone = notification.severity === "error" ? "bg-red-50 text-red-700" : notification.severity === "warning" ? "bg-amber-50 text-amber-700" : notification.severity === "success" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700";
  return <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tone)}><BellRing className="h-4.5 w-4.5" aria-hidden="true" /></span>;
}

function StatusBadge({ status }: { status: AdminNotificationStatus }) {
  const labels: Record<AdminNotificationStatus, string> = { unread: "Belum Dibaca", read: "Sudah Dibaca", acknowledged: "Sudah Diproses", resolved: "Selesai" };
  const tone = status === "unread" ? "bg-red-50 text-red-700 ring-red-100" : status === "read" ? "bg-blue-50 text-blue-700 ring-blue-100" : status === "acknowledged" ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1", tone)}>{labels[status]}</span>;
}

function typeLabel(type: AdminNotificationType) {
  return TYPE_FILTERS.find((filter) => filter.value === type)?.label ?? "System";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
