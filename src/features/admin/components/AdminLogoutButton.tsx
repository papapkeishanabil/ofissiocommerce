"use client";

import { LogOut } from "lucide-react";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      aria-label="Keluar dari Ofissio Admin"
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition hover:bg-slate-100 hover:text-ink"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        window.location.assign("/login?mode=admin");
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
