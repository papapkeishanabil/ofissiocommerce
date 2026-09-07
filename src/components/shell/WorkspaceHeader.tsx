// src/components/shell/WorkspaceHeader.tsx
// Top bar: brand + cart + account/login entry. Easy cart access on mobile.

"use client";

import { useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";

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
  //
  // On reload, cancel any hash the browser may be jumping to and park the
  // nested scroller at the very top so the hero is what loads. This must run
  // ONCE for the load that actually was a reload: the performance navigation
  // entry keeps its "reload" type for the whole SPA session, so re-checking it
  // on every pathname change would also strip the hash of later client-side
  // section navigations (e.g. product page → "Industri" landing on the hero).
  useEffect(() => {
    const navEntry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.type !== "reload") return;
    const scroller = document.querySelector("[data-workspace-scroll]");
    if (scroller) scroller.scrollTop = 0;
    if (window.location.hash) {
      // Drop a persisted section hash so the NEXT refresh has nothing to
      // natively scroll to — the flash self-heals after one refresh.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  useEffect(() => {
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

  const navLink =
    "rounded-full px-3.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-cool-100 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-lg font-extrabold text-white shadow-soft-sm">
          O
        </span>
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Ofissio<span className="text-ochre-500">.</span>
        </span>
      </Link>

      {/* Menu diposisikan di kiri, tepat setelah brand — dekat dengan rail
          Ofistant, bukan mengambang di tengah. */}
      <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-line md:block" />
      <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
        <Link href="/#paket" onClick={(e) => handleSectionNav(e, "paket")} className={navLink}>
          Paket
        </Link>
        <Link href="/#usaha" onClick={(e) => handleSectionNav(e, "usaha")} className={navLink}>
          Industri
        </Link>
        <Link href="/#cara" onClick={(e) => handleSectionNav(e, "cara")} className={navLink}>
          Cara Order
        </Link>
        <Link href="/catalog" className={navLink}>
          Produk
        </Link>
        <Link href="/promo" className={navLink}>
          Promo
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Account entry */}
        {authHydrated && session ? (
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-cool-100 sm:flex"
              title={roleLabel(session.user.role)}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
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
              className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-cool-100 hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuth({ kind: "none" }, "login")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-700 px-4 text-sm font-bold text-white shadow-soft-sm transition-colors hover:bg-brand-800"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Masuk</span>
          </button>
        )}

        {/* Cart */}
        <Link
          href="/cart"
          className="relative inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-ink transition-colors hover:bg-cool-100"
          aria-label={cartHydrated ? `Lihat keranjang, ${cartCount} produk` : "Lihat keranjang"}
        >
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
              className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ring-2 ring-white"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>
      </div>
      </div>
    </header>
  );
}
