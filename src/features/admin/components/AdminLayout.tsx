import type { ReactNode } from "react";

import { requireInternalAdmin } from "../admin.service";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: ReactNode }) {
  const user = requireInternalAdmin(undefined, "admin:view");
  return (
    <div className="relative isolate h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(211,218,239,0.8),transparent_34rem),linear-gradient(135deg,#f8fafc_0%,#eef4ff_46%,#f8fafc_100%)] text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-ochre-100/50 blur-3xl"
      />
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Lewati ke konten admin
      </a>
      <div className="relative flex h-dvh min-h-0 flex-col lg:flex-row">
        <AdminSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AdminHeader user={user} />
          <main
            id="admin-main"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-7 lg:px-10 lg:py-8"
          >
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
