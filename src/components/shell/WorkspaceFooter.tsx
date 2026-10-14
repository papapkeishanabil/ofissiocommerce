// src/components/shell/WorkspaceFooter.tsx
// Footer storefront — pelat kolofon navy yang menutup setiap halaman.
//
// DIRECTION (extends the established homepage world, no new identity):
// THESIS — utility footer sebagai penutup editorial: brand, jalan pintas,
// legal, dan bantuan di atas pelat brand-950; menolak link-farm abu-abu
// generik. OWN-WORLD — jahitan feston ochre di bawah wordmark (motif §05/
// §08), teks sekunder biru-tint (tint dari hue navy, bukan abu-abu),
// wordmark raksasa terpotong sebagai tekstur penutup. STORY — pengunjung
// selesai di halaman mana pun dan mendarat di bidang navy tenang. FORM —
// grid 4 kolom di lg, 2 di sm, stack di mobile dengan clearance FAB.
// FINISH — unreviewed and undocumented is unfinished; this build ends with
// the finish review, the verdict, and DESIGN.md.
//
// Server component (tanpa state). Tidak memakai .scroll-reveal: class itu
// hanya diaktifkan ScrollRevealInit di homepage — di halaman lain footer
// akan tetap opacity:0.

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

/** Label kolom — penanda navigasi fungsional, bukan eyebrow dekoratif. */
function ColumnLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ochre-300/90">
      {children}
    </p>
  );
}

const footerLinkClass =
  "text-sm text-[#aab8d6] underline-offset-4 transition-colors hover:text-white hover:underline hover:decoration-ochre-400/70 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400";

export function WorkspaceFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-brand-950 text-brand-100">
      {/* Wordmark raksasa sebagai tekstur penutup — terpotong tepi bawah,
          nyaris tak terbaca (tekstur, bukan klaim). */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 select-none">
        <p className="translate-y-[36%] text-center text-[clamp(7rem,14vw,12rem)] font-extrabold leading-none tracking-[-0.05em] text-white/[0.04]">
          OFISSIO
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-[1600px] px-6 pb-6 pt-14 lg:px-8 lg:pt-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_0.75fr_1.1fr] lg:gap-10">
          {/* Brand + tagline */}
          <div>
            <Link
              href="/"
              aria-label="Ofissio — kembali ke beranda"
              className="inline-flex rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400"
            >
              <Image
                src="/brand/ofissio.png"
                alt="Ofissio"
                width={2172}
                height={724}
                sizes="132px"
                className="h-auto w-[132px] brightness-0 invert"
              />
            </Link>
            {/* Jahitan feston — menggemakan motif §05/§08; pengganti garis
                pemisah polos milik footer lama. */}
            <div aria-hidden className="mt-5 flex items-center">
              <span className="w-16 border-t-2 border-dashed border-ochre-500/80" />
              <span className="-ml-1.5 h-2.5 w-2.5 rounded-full border-2 border-brand-950 bg-ochre-400" />
            </div>
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-[#aab8d6]">
              Workwear Ready Stock &amp; Bordir Logo untuk pengadaan seragam
              perusahaan di Indonesia.
            </p>
          </div>

          {/* Essential links */}
          <nav aria-label="Navigasi footer">
            <ColumnLabel>Jalan Pintas</ColumnLabel>
            <ul className="mt-4 space-y-2.5">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={footerLinkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal links */}
          <nav aria-label="Informasi legal">
            <ColumnLabel>Legal</ColumnLabel>
            <ul className="mt-4 space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact hint */}
          <div>
            <ColumnLabel>Bantuan</ColumnLabel>
            <ul className="mt-4 space-y-3 text-sm text-[#aab8d6]">
              <li className="flex items-center gap-2.5">
                <Headset className="h-4 w-4 shrink-0 text-ochre-400" strokeWidth={2} aria-hidden="true" />
                {/* Di desktop Ofistant ada di panel kiri; di mobile ia
                    terbuka sebagai bottom sheet — hint menyesuaikan. */}
                <span>
                  Ofistant siap membantu<span className="hidden sm:inline"> di panel kiri</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-ochre-400" strokeWidth={2} aria-hidden="true" />
                <a href="mailto:halo@ofissio.id" className={footerLinkClass}>
                  halo@ofissio.id
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-ochre-400" strokeWidth={2} aria-hidden="true" />
                <span>Jakarta, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar — clearance bawah ekstra di bawah xl untuk FAB
            Ofistant yang fixed di kanan-bawah (56px + offset 20px). */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pb-24 pt-6 text-center text-xs text-[#9fb0dd] sm:flex-row sm:items-center sm:justify-between sm:text-left xl:pb-6">
          <p>&copy; {new Date().getFullYear()} Ofissio Workwear. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Powered by conversational commerce
          </p>
        </div>
      </div>
    </footer>
  );
}
