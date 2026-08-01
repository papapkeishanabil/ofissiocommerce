"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useAdminNotifications } from "./AdminNotificationProvider";

export function AdminNotificationBell() {
  const { summary } = useAdminNotifications();
  return (
    <Link
      href="/admin/notifications"
      aria-label={`Buka notifikasi admin. ${summary.totalUnread} belum dibaca.`}
      className="relative grid h-10 w-10 place-items-center rounded-lg border border-line bg-white text-ink-muted transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <Bell className="h-4.5 w-4.5" aria-hidden="true" />
      {summary.totalUnread > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white shadow-sm">
          {summary.totalUnread > 99 ? "99+" : summary.totalUnread}
        </span>
      ) : null}
    </Link>
  );
}
