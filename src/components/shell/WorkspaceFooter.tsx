// Footer storefront — penutup editorial dengan CTA pengadaan yang jelas.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headset, Mail, MapPin } from "lucide-react";

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
    <footer className="border-t border-[#e8dfd2] bg-[#f7f3ec] text-brand-950">
      <div className="mx-auto grid w-full max-w-[1600px] lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.75fr)]">
        <div className="bg-brand-950 px-6 py-12 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="flex h-full flex-col">
            <Link
              href="/"
              aria-label="Ofissio — kembali ke beranda"
              className="inline-flex w-fit rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400"
            >
              <Image
                src="/brand/ofissio.png"
                alt="Ofissio"
                width={2172}
                height={724}
                sizes="160px"
                className="h-auto w-[160px] brightness-0 invert"
              />
            </Link>
            <div aria-hidden className="mt-7 flex items-center">
              <span className="h-1 w-16 bg-ochre-400" />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100">
              Seragam kerja. Lebih mudah.
            </p>
            <p className="mt-8 max-w-[25ch] text-base leading-relaxed text-brand-100/85">
              Mitra pengadaan seragam perusahaan untuk tim yang terus berkembang.
            </p>
            <p className="mt-auto hidden max-w-[25ch] pt-10 text-sm leading-relaxed text-brand-200/75 lg:block">
              Workwear ready stock dan bordir logo untuk kebutuhan perusahaan di Indonesia.
            </p>
          </div>
        </div>

        <div className="px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-7 border-b border-[#e6dccc] pb-10 xl:flex-row xl:items-end xl:justify-between xl:gap-12">
              <div className="max-w-[42rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ochre-600">
                  Solusi pengadaan, hasil nyata
                </p>
                <h2 className="mt-3 max-w-[22ch] text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-brand-950 sm:text-4xl">
                  Butuh seragam untuk tim Anda?
                </h2>
                <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-brand-800">
                  Tim Ofissio siap membantu kebutuhan pengadaan seragam perusahaan dengan proses yang mudah, cepat, dan terpercaya.
                </p>
              </div>
              <Link
                href="/quote"
                className="inline-flex shrink-0 items-center justify-center gap-4 rounded-xl bg-ochre-500 px-6 py-4 text-sm font-bold text-brand-950 transition-colors hover:bg-ochre-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
              >
                Mulai konsultasi
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-[0.8fr_0.9fr_1.5fr] xl:gap-12">
              <nav aria-label="Navigasi footer">
                <ColumnLabel>Jalan Pintas</ColumnLabel>
                <ul className="mt-4 space-y-2.5">
                  {LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={footerLinkClass}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label="Informasi legal">
                <ColumnLabel>Legal</ColumnLabel>
                <ul className="mt-4 space-y-2.5">
                  {LEGAL_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={footerLinkClass}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div>
                <ColumnLabel>Bantuan</ColumnLabel>
                <ul className="mt-4 space-y-3 text-sm text-brand-800">
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
          </div>

          <div className="mt-10 flex flex-col items-start gap-3 border-t border-[#e6dccc] pt-6 text-xs text-brand-700 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Ofissio Workwear. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Powered by conversational commerce
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
