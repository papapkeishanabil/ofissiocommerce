"use client";

import Link from "next/link";
import { BellRing, Check, Clock3, ExternalLink, Headset, X } from "lucide-react";
import { useState } from "react";

import type { AdminNotification } from "../admin-notification.types";
import {
  formatNotificationMoney,
  notificationEntityDisplayNumber,
  quotationRequestPresentation,
} from "../admin-notification.utils";
import { useAdminNotifications } from "./AdminNotificationProvider";

export function AdminStickyNotifications() {
  const { summary, mutate } = useAdminNotifications();
  const notifications = summary.latestNotifications.slice(0, 3);
  const [dismissedChat, setDismissedChat] = useState<string | null>(null);
  const latestChat = summary.latestChatNotifications?.find((item) => item.status === "unread");
  const chat = latestChat?.id !== dismissedChat ? latestChat : undefined;
  if (notifications.length === 0 && !chat) return null;
  const more = Math.max(0, summary.popupUnread - notifications.length);

  return (
    <section
      aria-label="Notifikasi operasional baru"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-50 max-h-[70vh] space-y-2 overflow-y-auto md:inset-x-auto md:bottom-5 md:right-5 md:w-[390px]"
    >
      {chat && <article className="rounded-xl border border-[#d4deef] bg-white p-4 shadow-lg" aria-label="Chat customer baru">
        <div className="flex items-start gap-3"><Headset className="mt-1 h-6 w-6 shrink-0 text-[#122162]" aria-hidden="true" /><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-[#122162]">Chat customer baru</h2><p className="mt-1 text-xs leading-relaxed text-[#526384]">{summary.chatUnread ?? 1} notifikasi chat belum dibaca. Buka percakapan untuk membantu customer.</p></div><button type="button" aria-label="Tutup popup chat" onClick={() => setDismissedChat(chat.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#526384] hover:bg-slate-100"><X size={18} /></button></div>
        <Link href={String(chat.metadata.adminUrl ?? "/admin/chats")} className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-[#e8a92a] px-4 text-sm font-semibold text-[#122162] focus-visible:outline-2 focus-visible:outline-offset-2">Buka percakapan</Link>
      </article>}
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onRead={() => mutate(notification.id, "read")}
          onAcknowledge={() => mutate(notification.id, "acknowledge")}
        />
      ))}
      {more > 0 ? (
        <Link
          href="/admin/notifications"
          className="block rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          +{more} notifikasi lainnya, Lihat Semua
        </Link>
      ) : null}
    </section>
  );
}

function NotificationCard({
  notification,
  onRead,
  onAcknowledge,
}: {
  notification: AdminNotification;
  onRead: () => Promise<boolean>;
  onAcknowledge: () => Promise<boolean>;
}) {
  const adminUrl = String(
    notification.metadata.adminUrl ?? `/admin/orders/${notification.entityId}`,
  );
  const companyName = String(notification.metadata.companyName ?? "Customer Ofissio");
  const productSummary = String(notification.metadata.productSummary ?? "Produk Ofissio");
  const total = Number(notification.metadata.total ?? 0);
  const totalQty = Number(notification.metadata.totalQty ?? 0);
  const currency = String(notification.metadata.currency ?? "IDR");
  const isQuotation = ["quotation_requested", "quotation_accepted"].includes(
    notification.type,
  );
  const isQuotationRequest = notification.type === "quotation_requested";
  const requestPresentation = quotationRequestPresentation(notification);
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
      <div className="flex gap-3 border-b border-line bg-gradient-to-r from-brand-50 to-white px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-ink">
              {isQuotationRequest ? requestPresentation.title : notification.title}
            </h2>
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
              Baru
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-brand-700">
            {notificationEntityDisplayNumber(notification)}
          </p>
        </div>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <p className="font-semibold text-ink">{companyName}</p>
        <p className="line-clamp-2 text-ink-muted">{productSummary}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-ink">
            {isQuotationRequest
              ? totalQty > 0
                ? `${totalQty} pcs, ${requestPresentation.pendingLabel}`
                : requestPresentation.pendingLabel
              : formatNotificationMoney(total, currency)}
          </strong>
          <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-slate-50 p-3">
        <Link
          href={adminUrl}
          onClick={() => void onRead()}
          className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {isQuotationRequest
            ? requestPresentation.actionLabel
            : isQuotation
              ? "Lihat Quotation"
              : "Lihat Order"}{" "}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => void onRead()}
          className="min-h-10 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-ink-muted hover:border-brand-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Tutup notifikasi
        </button>
        <button
          type="button"
          onClick={() => {
            void onAcknowledge().then((updated) => {
              if (updated) window.location.assign(adminUrl);
            });
          }}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Buka & mulai tinjau
        </button>
      </div>
    </article>
  );
}

function formatRelativeTime(value: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
