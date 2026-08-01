import type { ReactNode } from "react";
import { Manrope } from "next/font/google";

import { requireInternalAdmin } from "../admin.service";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminNotificationProvider } from "@/features/admin-notifications/components/AdminNotificationProvider";
import { AdminStickyNotifications } from "@/features/admin-notifications/components/AdminStickyNotifications";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-admin",
  display: "swap",
});

export function AdminLayout({ children }: { children: ReactNode }) {
  const user = requireInternalAdmin(undefined, "admin:view");
  return (
    <div
      className={`${manrope.variable} admin-shell isolate min-h-screen w-full overflow-x-clip bg-slate-50 text-ink`}
    >
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten admin
      </a>
      <AdminNotificationProvider role={user.role} userId={user.id}>
        <div className="relative flex min-h-screen flex-col lg:items-start lg:flex-row">
          <AdminSidebar />
          <div className="min-w-0 flex-1">
            <AdminHeader user={user} />
            <main
              id="admin-main"
              className="px-4 py-6 md:px-7 lg:px-10 lg:py-8"
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
