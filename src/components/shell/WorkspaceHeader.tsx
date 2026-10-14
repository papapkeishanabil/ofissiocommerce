// src/components/shell/WorkspaceHeader.tsx
// Top bar: brand + cart + account/login entry. Easy cart access on mobile.

"use client";

import { useEffect, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Search, ShoppingCart, Menu } from "lucide-react";

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

export function WorkspaceHeader({ onNavigate }: {
  onNavigate?: () => void;
} = {}) {
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

  const links = [
    { label: "Industri", href: "/#usaha", section: "usaha" },
    { label: "Cara Order", href: "/#cara", section: "cara" },
    { label: "Produk", href: "/catalog" },
    { label: "Promo", href: "/promo" },
  ];
  const navLink = "rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10";

  return (
    <header className="storefront-header workspace-chrome-header sticky top-0 z-30 shrink-0 text-white"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const menu = event.currentTarget.querySelector("details[open]");
        if (menu) {
          menu.removeAttribute("open");
          menu.querySelector("summary")?.focus();
        }
      }}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("a")) {
          (event.currentTarget.querySelector("details") as HTMLDetailsElement | null)?.removeAttribute("open");
          onNavigate?.();
        }
      }}>
      <div className="mx-auto flex h-full w-full items-center gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8">
        <Link
          href="/"
          aria-label="Ofissio — kembali ke beranda"
          className="shrink-0 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400 lg:mr-5"
        >
          <Image
            src="/brand/ofissio.png"
            alt="Ofissio"
            width={2172}
            height={724}
            priority
            sizes="(min-width: 1024px) 124px, 108px"
            className="h-auto w-[108px] brightness-0 invert lg:w-[124px]"
          />
        </Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Navigasi utama">
          {links.map((link) => <Link key={link.href} href={link.href} onClick={link.section ? (e) => handleSectionNav(e, link.section!) : undefined} className={navLink}>{link.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <form action="/catalog" onSubmit={onNavigate} role="search" className="mr-2 hidden h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/5 px-3 xl:flex">
            <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
            <input type="search" name="kategori" aria-label="Cari produk, kategori, atau SKU" placeholder="Cari produk, kategori, atau SKU" className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-white/80" />
          </form>
          {authHydrated && session ? (
            <div className="flex items-center gap-1">
              <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-white hover:bg-white/10 sm:px-3" title={roleLabel(session.user.role)}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-xs font-bold">{session.user.fullName.charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate sm:inline">{session.user.fullName.split(" ")[0]}</span>
              </Link>
              <button type="button" onClick={logout} aria-label="Logout" className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10"><LogOut className="h-4 w-4" /></button>
            </div>
          ) : (
            <button type="button" aria-label="Masuk" onClick={() => { onNavigate?.(); openAuth({ kind: "none" }, "login"); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/35 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-4">
              <LogIn className="h-4 w-4" /><span className="hidden sm:inline">Masuk</span>
            </button>
          )}
          <Link href="/cart" className="relative inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm font-medium text-white hover:bg-white/10 sm:px-3.5" aria-label={cartHydrated ? `Lihat keranjang, ${cartCount} produk` : "Lihat keranjang"}>
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Keranjang</span>
            {cartHydrated && cartCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ochre-600 px-1 text-[11px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
          </Link>
          <details className="group xl:hidden">
            <summary aria-label="Buka menu utama" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-lg hover:bg-white/10 [&::-webkit-details-marker]:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></summary>
            <div className="absolute inset-x-0 top-full border-t border-white/15 bg-[#071c3a] p-4 shadow-lg">
              <form action="/catalog" role="search" onSubmit={onNavigate} className="mb-3 flex items-center gap-2 rounded-lg border border-white/30 px-3">
                <Search className="h-5 w-5" aria-hidden="true" />
                <input name="kategori" type="search" aria-label="Cari produk, kategori, atau SKU" placeholder="Cari produk, kategori, atau SKU" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/80" />
                <button className="min-h-11 px-2 text-sm font-semibold" type="submit">Cari</button>
              </form>
              <nav aria-label="Navigasi seluler" className="grid gap-1">{links.map((link) => <Link key={link.href} href={link.href} onClick={link.section ? (e) => handleSectionNav(e, link.section!) : undefined} className={navLink}>{link.label}</Link>)}</nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
