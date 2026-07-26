// src/components/shell/WorkspaceHeader.tsx
// Top bar: brand + cart + account/login entry. Easy cart access on mobile.

"use client";

import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useCartCount, useCartHydrated } from "@/hooks/use-cart";
import { useUIStore } from "@/stores/ui-store";
import { roleLabel } from "@/types/account";

export function WorkspaceHeader() {
  const cartCount = useCartCount();
  const cartHydrated = useCartHydrated();
  const { session, hydrated: authHydrated, logout } = useAuth();
  const openAuth = useUIStore((s) => s.openAuth);

  return (
    <header className="glass-light sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line px-4 lg:px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
      >
        <span className="type-display grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-base text-white">
          O
        </span>
        <span className="type-display text-lg tracking-tight text-ink">
          Ofissio<span className="text-ochre-500">.</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {/* Account entry */}
        {authHydrated && session ? (
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-100 sm:flex"
              title={roleLabel(session.user.role)}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                {session.user.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[120px] truncate">
                {session.user.fullName.split(" ")[0]}
              </span>
            </Link>
            <button
              type="button"
              onClick={logout}
              aria-label="Logout"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuth({ kind: "none" }, "login")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-slate-100"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Masuk</span>
          </button>
        )}

        {/* Cart */}
        <Link
          href="/cart"
          className="relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-slate-100"
          aria-label="Lihat keranjang"
        >
          <UserRound className="hidden" />
          {/* cart icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          <span className="hidden sm:inline">Keranjang</span>
          {cartHydrated && cartCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
