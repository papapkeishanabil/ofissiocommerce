// src/app/checkout/layout.tsx
// Standalone full-page chrome for checkout. RouteAwareShell bypasses AppShell
// for /checkout, so this layout owns the minimal header / footer and mounts
// the global AuthModal (driven by ui-store — kept available so the
// openAuth({kind:"checkout"}) fallback still works on this route).

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AuthModal } from "@/components/auth/AuthModal";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cool-50">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-brand-700 text-base font-extrabold text-white">
              O
            </span>
            <span className="leading-none">
              <span className="block text-sm font-bold text-ink">Ofissio</span>
              <span className="mt-1 block text-[11px] text-ink-muted">
                Checkout
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1.5 text-[11px] font-semibold text-ink-muted sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              Checkout aman
            </span>
            <Link
              href="/cart"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kembali ke keranjang</span>
              <span className="sm:hidden">Keranjang</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-[11px] text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Ofissio — B2B Workwear Commerce.</p>
          <p>Harga final dikonfirmasi setelah verifikasi order oleh tim Ofissio.</p>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
}
