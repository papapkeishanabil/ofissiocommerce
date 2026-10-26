// Shared storefront footer, aligned with the product page's content grid.

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
    <h2 className="text-sm font-semibold text-ink-strong">
      {children}
    </h2>
  );
}

const footerLinkClass =
  "inline-flex min-h-11 items-center text-sm leading-6 text-ink-muted underline-offset-4 transition-colors hover:text-brand-900 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:min-h-9";

export function WorkspaceFooter() {
  return (
    <footer className="border-t border-line px-3 text-ink sm:px-5 lg:px-6 xl:px-8" style={{ backgroundColor: "#edf0f3" }}>
      <div className="mx-auto w-full max-w-[1680px] pb-5 pt-8 sm:pt-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:gap-x-10 lg:grid-cols-[1.35fr_0.75fr_1fr_1.1fr] lg:gap-x-12">
          <div className="col-span-2 md:col-span-1">
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
                sizes="160px"
                className="h-auto w-40"
              />
            </Link>
            <p className="mt-3 max-w-[34ch] text-sm leading-6 text-ink-muted">
              Workwear Ready Stock &amp; Bordir Logo untuk pengadaan seragam perusahaan di Indonesia.
            </p>
            <p className="mt-3 text-sm font-medium text-ink">
              Seragam kerja. Lebih mudah.
            </p>
          </div>

          <nav aria-label="Navigasi footer">
            <ColumnLabel>Jalan Pintas</ColumnLabel>
            <ul className="mt-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informasi legal">
            <ColumnLabel>Legal</ColumnLabel>
            <ul className="mt-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-2 md:col-span-1">
            <ColumnLabel>Bantuan</ColumnLabel>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-ink-muted">
              <li className="flex items-start gap-2.5">
                <Headset className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} aria-hidden="true" />
                <span>Ofistant siap membantu di panel kiri</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} aria-hidden="true" />
                <a href="mailto:sales@ofissio.com" className={footerLinkClass}>sales@ofissio.com</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} aria-hidden="true" />
                <span>Kabupaten Bandung, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-ink-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
          <p>&copy; {new Date().getFullYear()} Ofissio Workwear. All rights reserved.</p>
          <p>
            Ready stock · Bordir logo · Pengadaan korporasi
          </p>
        </div>
      </div>
    </footer>
  );
}
