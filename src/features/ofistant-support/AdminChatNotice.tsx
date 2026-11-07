"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, LogIn } from "lucide-react";
import { useAdminNotifications } from "@/features/admin-notifications/components/AdminNotificationProvider";

export function AdminChatNotice() {
  const { chatWaiting, chatSessionInvalid, summary } = useAdminNotifications();
  const latest = summary.latestChatNotifications?.find((notice) => notice.status === "unread");
  const unread = summary.chatUnread ?? 0;
  const pathname = usePathname();
  if (chatSessionInvalid) return <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
    <p>Sesi admin sudah berakhir atau berganti akun.</p>
    <a className="mt-1 inline-flex min-h-9 items-center gap-2 font-semibold underline" href={`/login?mode=admin&next=${encodeURIComponent(pathname || "/admin/chats")}`}><LogIn size={15} aria-hidden="true" />Masuk kembali sebagai admin</a>
  </div>;
  if (!chatWaiting && !latest) return null;
  return <div role="status" aria-live="polite"><Link href={latest ? String(latest.metadata.adminUrl) : "/admin/chats"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
    <Headset size={18} aria-hidden="true" />Chat masuk
    {unread > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-white" aria-label={`${unread} notifikasi chat belum dibaca`}>{unread > 99 ? "99+" : unread}</span>}
    <span className="sr-only">{latest ? "Ada pesan customer yang belum dibaca" : "customer menunggu tim Ofissio"}</span>
  </Link></div>;
}
