// src/components/shell/WorkspaceFooter.tsx
// Minimal footer: hanya link essential sebagai jalan pintas.
// Ofistant (panel kiri) tetap menjadi entry point utama untuk discover &
// rekomendasi. Footer ini hanya untuk hal yang tidak efisien lewat chat:
// balik ke beranda, ke katalog, pahami cara order, hubungi sales.

import Link from "next/link";
import { Headset, Mail, MapPin } from "lucide-react";

const LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Katalog", href: "/catalog" },
  { label: "Cara Order", href: "/#how-it-works" },
  { label: "Request Quotation", href: "/quote" },
];

const LEGAL_LINKS = [
  { label: "Kebijakan Privasi", href: "/legal/privacy-policy" },
  { label: "Syarat Layanan", href: "/legal/terms-of-service" },
  { label: "Kebijakan Refund", href: "/legal/refund-policy" },
  { label: "Kebijakan Pengiriman", href: "/legal/shipping-policy" },
];

export function WorkspaceFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_0.9fr_1.35fr]">
          {/* Brand + tagline */}
          <div className="max-w-xs">
            <Link href="/" className="type-display flex items-center gap-2 text-lg text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-700 text-white">
                O
              </span>
              Ofissio<span className="text-ochre-500">.</span>
            </Link>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Workwear Ready Stock &amp; Bordir Logo untuk pengadaan seragam
              perusahaan di Indonesia.
            </p>
          </div>

          {/* Essential links */}
          <nav aria-label="Navigasi footer">
            <p className="type-eyebrow mb-3 text-ink-subtle">Jalan Pintas</p>
            <ul className="space-y-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-ink-muted transition-colors hover:text-brand-700"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informasi legal">
            <p className="type-eyebrow mb-3 text-ink-subtle">Legal</p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact hint */}
          <div>
            <p className="type-eyebrow mb-3 text-ink-subtle">Bantuan</p>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li className="flex items-center gap-2">
                <Headset className="h-3.5 w-3.5 text-brand-700" />
                <span>Ofistant siap membantu di panel kiri</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-brand-700" />
                <span>halo@ofissio.id</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-brand-700" />
                <span>Jakarta, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-line pt-5 text-[11px] text-ink-subtle sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Ofissio Workwear. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Powered by conversational commerce
          </p>
        </div>
      </div>
    </footer>
  );
}
