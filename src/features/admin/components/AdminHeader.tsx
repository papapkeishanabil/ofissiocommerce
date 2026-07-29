import type { InternalAdminUser } from "../admin.types";
import { AdminBadge } from "./AdminBadge";

export function AdminHeader({ user }: { user: InternalAdminUser }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">
            Ofissio Internal
          </p>
          <h1 className="text-xl font-black tracking-tight text-ink md:text-2xl">
            Admin Foundation
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-muted px-3 py-2 text-sm">
          <span className="font-semibold text-ink">{user.name}</span>
          <AdminBadge tone={user.isMock ? "warning" : "success"}>
            {user.isMock ? "Mock" : "Live"} · {user.role}
          </AdminBadge>
        </div>
      </div>
    </header>
  );
}
