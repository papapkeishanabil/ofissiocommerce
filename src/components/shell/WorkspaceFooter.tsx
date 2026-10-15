// Footer storefront — kolofon editorial dengan navigasi dan kontak utama.

import Image from "next/image";
import Link from "next/link";
import { Headset, Mail, MapPin } from "lucide-react";

const LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Katalog", href: "/catalog" },
  { label: "Cara Order", href: "/#cara" },
  { label: "Request Quotation", href: "/quote" },
];

const LEGAL_LINKS = [
  { label: "Kebijakan Privasi", href: "/legal/privacy-policy" },
  { label: "Syarat Layanan", href: "/legal/terms-of-service" },
  { label: "Kebijakan Refund", href: "/legal/refund-policy" },
  { label: "Kebijakan Pengiriman", href: "/legal/shipping-policy" },
];

function ColumnLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ochre-600">
      {children}
    </p>
  );
}

const footerLinkClass =
  "text-sm text-brand-800 underline-offset-4 transition-colors hover:text-brand-950 hover:underline hover:decoration-ochre-500 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function WorkspaceFooter() {
  return (
    <footer className="border-t-[6px] border-brand-950 bg-[#f7f3ec] text-brand-950">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
        <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.95fr_1.3fr] lg:gap-0">
          <div className="lg:pr-12">
            <Link
              href="/"
              aria-label="Ofissio — kembali ke beranda"
              className="inline-flex rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              <Image
                src="/brand/ofissio.png"
                alt="Ofissio"
                width={2172}
                height={724}
                sizes="190px"
                className="h-auto w-[190px]"
              />
            </Link>
            <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-brand-800">
              Workwear Ready Stock &amp; Bordir Logo untuk pengadaan seragam perusahaan di Indonesia.
            </p>
            <div aria-hidden className="mt-6 flex items-center">
              <span className="h-1 w-16 bg-ochre-500" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-800">
              Seragam kerja. Lebih mudah.
            </p>
          </div>

          <nav aria-label="Navigasi footer" className="lg:border-l lg:border-ochre-300/70 lg:px-8">
            <ColumnLabel>Jalan Pintas</ColumnLabel>
            <ul className="mt-4 space-y-2.5">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informasi legal" className="lg:border-l lg:border-ochre-300/70 lg:px-8">
            <ColumnLabel>Legal</ColumnLabel>
            <ul className="mt-4 space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:border-l lg:border-ochre-300/70 lg:pl-8">
            <ColumnLabel>Bantuan</ColumnLabel>
            <ul className="mt-4 space-y-3.5 text-sm text-brand-800">
              <li className="flex items-center gap-2.5">
                <Headset className="h-4 w-4 shrink-0 text-ochre-600" strokeWidth={2} aria-hidden="true" />
                <span>Ofistant siap membantu di panel kiri</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-ochre-600" strokeWidth={2} aria-hidden="true" />
                <a href="mailto:halo@ofissio.com" className={footerLinkClass}>halo@ofissio.com</a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-ochre-600" strokeWidth={2} aria-hidden="true" />
                <span>Kabupaten Bandung, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-ochre-300/70 pt-5 text-xs text-brand-700 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Ofissio Workwear. All rights reserved.</p>
          <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
            <span className="h-px w-8 bg-ochre-500" aria-hidden="true" />
            Ready stock · Bordir logo · Pengadaan korporasi
          </p>
        </div>
      </div>
    </footer>
  );
}
