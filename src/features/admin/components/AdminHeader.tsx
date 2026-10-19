import type { InternalAdminUser } from "../admin.types";
import { AdminNotificationBell } from "@/features/admin-notifications/components/AdminNotificationBell";
import { AdminPushToggle } from "@/features/admin-notifications/components/AdminPushToggle";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AdminHeaderProductNavigation } from "./AdminHeaderProductNavigation";

export function AdminHeader({ user }: { user: InternalAdminUser }) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/85 px-4 py-2.5 backdrop-blur-xl md:px-6 lg:px-7">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">Ofissio / Internal Operations</p>
          <AdminHeaderProductNavigation />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden min-h-9 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Staging ready
          </div>
          <AdminPushToggle />
          <AdminNotificationBell />
          <AdminLogoutButton />
          <div className="flex min-h-9 items-center gap-2 rounded-lg bg-slate-100 px-1.5 pr-2.5 text-xs">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-800 text-[11px] font-bold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden font-medium text-ink sm:inline">{user.name}</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-ink-subtle md:inline">{user.role.replaceAll("_", " ")}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
