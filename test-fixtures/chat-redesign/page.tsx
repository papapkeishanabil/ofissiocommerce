"use client";
import { useEffect, useState } from "react";
import { AdminNotificationProvider } from "@/features/admin-notifications/components/AdminNotificationProvider";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { SupportInbox } from "@/features/ofistant-support/SupportInbox";
import { AdminStickyNotifications } from "@/features/admin-notifications/components/AdminStickyNotifications";
const user = { id: "staff-1", name: "Staf Uji", role: "sales" as const, isMock: true };
export default function Demo() {
  const [id, setId] = useState("");
  useEffect(() => { setId(new URL(location.href).searchParams.get("conversation") ?? ""); }, []);
  return <AdminNotificationProvider role="sales" userId="staff-1"><div className="flex min-w-0 flex-col lg:flex-row"><AdminSidebar user={user} /><div className="min-w-0 flex-1"><AdminHeader user={user} /><div className="p-4"><SupportInbox actorId="staff-1" initialConversationId={id} /></div></div></div><AdminStickyNotifications /></AdminNotificationProvider>;
}
