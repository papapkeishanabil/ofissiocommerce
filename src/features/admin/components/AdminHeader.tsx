import type { InternalAdminUser } from "../admin.types";
import { AdminBadge } from "./AdminBadge";

export function AdminHeader({ user }: { user: InternalAdminUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/[0.78] px-4 py-3 shadow-soft-xs backdrop-blur-xl md:px-7 lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="type-eyebrow text-brand-700">Ofissio Internal Command</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-ink md:text-2xl">
            Operations workbench
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700 sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            Staging ready
          </div>
          <div className="flex items-center gap-3 rounded-full border border-line/80 bg-white px-3 py-2 text-sm shadow-soft-xs">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-xs font-black text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden font-semibold text-ink sm:inline">{user.name}</span>
            <AdminBadge tone={user.isMock ? "warning" : "success"}>
              {user.isMock ? "Mock" : "Live"} · {user.role}
            </AdminBadge>
          </div>
        </div>
      </div>
    </header>
  );
}
