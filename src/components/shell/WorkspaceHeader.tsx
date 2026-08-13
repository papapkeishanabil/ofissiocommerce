// src/components/shell/WorkspaceHeader.tsx
// Top bar: brand + cart + account/login entry. Easy cart access on mobile.

"use client";

import { useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useCartCount, useCartHydrated } from "@/hooks/use-cart";
import { useUIStore } from "@/stores/ui-store";
import { roleLabel } from "@/types/account";

function scrollToHashId(id: string): boolean {
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function WorkspaceHeader() {
  const cartCount = useCartCount();
  const cartHydrated = useCartHydrated();
  const { session, hydrated: authHydrated, logout } = useAuth();
  const openAuth = useUIStore((s) => s.openAuth);
  const pathname = usePathname();

  // Homepage sections scroll inside a nested container ([data-workspace-scroll]),
  // not the window, so native hash scrolling never reaches them. After a
  // cross-page navigation, bring the URL hash target into view — but a hard
  // refresh must always land on the hero, never jump to a persisted section.
  useEffect(() => {
    const navEntry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    // On reload, cancel any hash the browser may be jumping to and park the
    // nested scroller at the very top so the hero is what loads. Also drop a
    // persisted section hash so the NEXT refresh has nothing to natively
    // scroll to — the flash self-heals after one refresh.
    if (navEntry?.type === "reload") {
      const scroller = document.querySelector("[data-workspace-scroll]");
      if (scroller) scroller.scrollTop = 0;
      if (window.location.hash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      return;
    }

    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const raf = requestAnimationFrame(() => {
      if (scrollToHashId(id)) {
        // Drop the hash so a later refresh starts at the hero, not here.
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  const handleSectionNav = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    // Same page: smooth-scroll directly without stamping the hash into the URL
    // — a persisted hash is exactly what makes a later refresh jump to a
    // section instead of the hero. Cross page: let the Link navigate; the
    // effect above scrolls once the new route has mounted.
    if (pathname === "/" && scrollToHashId(id)) {
      e.preventDefault();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-white px-4 lg:px-6">
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

      <nav className="hidden items-center gap-5 md:flex lg:gap-6" aria-label="Navigasi utama">
        <Link href="/#paket" onClick={(e) => handleSectionNav(e, "paket")} className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong">
          Paket
        </Link>
        <Link href="/#usaha" onClick={(e) => handleSectionNav(e, "usaha")} className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong">
          Industri
        </Link>
        <Link href="/#cara" onClick={(e) => handleSectionNav(e, "cara")} className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong">
          Cara Order
        </Link>
        <Link href="/#produk" onClick={(e) => handleSectionNav(e, "produk")} className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong">
          Produk
        </Link>
        <Link href="/#cta" onClick={(e) => handleSectionNav(e, "cta")} className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-strong">
          Konsultasi
        </Link>
      </nav>

      <div className="flex items-center gap-1">
        {/* Account entry */}
        {authHydrated && session ? (
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-muted sm:flex"
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
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuth({ kind: "none" }, "login")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Masuk</span>
          </button>
        )}

        {/* Cart */}
        <Link
          href="/cart"
          className="relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
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
