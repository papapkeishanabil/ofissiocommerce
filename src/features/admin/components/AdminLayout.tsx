import type { ReactNode } from "react";

import { requireInternalAdmin } from "../admin.service";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: ReactNode }) {
  const user = requireInternalAdmin(undefined, "admin:view");
  return (
    <div className="min-h-full bg-slate-50 text-ink">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Lewati ke konten admin
      </a>
      <div className="flex min-h-full flex-col lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminHeader user={user} />
          <main id="admin-main" className="min-w-0 px-4 py-5 md:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
