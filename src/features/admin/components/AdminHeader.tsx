import type { InternalAdminUser } from "../admin.types";
import { AdminBadge } from "./AdminBadge";
import { AdminNotificationBell } from "@/features/admin-notifications/components/AdminNotificationBell";

export function AdminHeader({ user }: { user: InternalAdminUser }) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-7 lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="type-eyebrow text-brand-700">Ofissio Internal Command</p>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-ink md:text-xl">
            Operations workbench
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold tracking-[0.04em] text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Staging ready
          </div>
          <AdminNotificationBell />
          <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden font-medium text-ink sm:inline">{user.name}</span>
            <AdminBadge tone={user.isMock ? "warning" : "success"}>
              {user.isMock ? "Mock" : "Live"} · {user.role}
            </AdminBadge>
          </div>
        </div>
      </div>
    </header>
  );
}
