import type { ReactNode } from "react";
import { adminFont as onest } from "../admin-font";

import { requireInternalAdminServer } from "../admin.service";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminNotificationProvider } from "@/features/admin-notifications/components/AdminNotificationProvider";
import { AdminStickyNotifications } from "@/features/admin-notifications/components/AdminStickyNotifications";

export async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireInternalAdminServer("admin:view");
  return (
    <div
      className={`${onest.variable} admin-shell isolate min-h-screen w-full overflow-x-clip bg-[#edf0f5] text-ink`}
    >
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten admin
      </a>
      <AdminNotificationProvider role={user.role} userId={user.id}>
        <div className="relative flex min-h-dvh min-w-0 flex-col lg:items-start lg:flex-row lg:gap-2 lg:p-2">
          <AdminSidebar user={user} />
          {/* Clip rounded corners without creating a scroll container that
              prevents the admin header from sticking to the viewport. */}
          <div className="min-w-0 flex-1 overflow-clip bg-[#f8f9fb] lg:min-h-[calc(100vh-1rem)] lg:rounded-2xl">
            <AdminHeader user={user} />
            <main
              id="admin-main"
              className="min-w-0 px-3 py-4 sm:px-4 md:px-5 lg:px-[clamp(1.25rem,2vw,1.75rem)] lg:py-6"
            >
              <div className="mx-auto max-w-[1600px]">{children}</div>
            </main>
          </div>
        </div>
        <AdminStickyNotifications />
      </AdminNotificationProvider>
    </div>
  );
}
