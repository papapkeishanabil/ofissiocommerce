// src/components/home/HeroIntro.tsx
// Bold editorial hero: big Bricolage type, brand-forward, minimal noise.
// Inspired by premium workwear editorial direction.

import {
  ArrowUpRight,
  MessageCircle,
  PackageCheck,
  Scissors,
  Truck,
  Users,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";

const TRUST_CHIPS = [
  { icon: PackageCheck, label: "Ready Stock" },
  { icon: Scissors, label: "Siap Bordir" },
  { icon: Users, label: "MOQ mulai 8 pcs" },
  { icon: Truck, label: "Delivery cepat" },
];

export function HeroIntro() {
  return (
    <section className="relative overflow-hidden bg-brand-700 text-white">
      {/* layered atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(900px 600px at 78% 8%, rgba(74,107,216,0.45), transparent 62%)," +
            "radial-gradient(700px 500px at 0% 110%, rgba(0,18,74,0.65), transparent 60%)",
        }}
      />
      {/* grain texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        {/* top eyebrow row */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <span className="type-eyebrow inline-flex items-center gap-2 text-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-ochre-400" />
            Procurement Workwear · Indonesia
          </span>
          <span className="type-mono-label hidden text-brand-200 sm:inline">
            EST. 2024 — JAKARTA
          </span>
        </div>

        {/* HERO HEADLINE — big editorial type */}
        <div className="max-w-5xl">
          <h1
            className="type-display-tight"
            style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
          >
            Workwear siap pakai,
            <br />
            <span className="text-ochre-400">siap bordir logo.</span>
          </h1>

          <p
            className="mt-6 max-w-xl font-light leading-relaxed text-brand-100"
            style={{ fontSize: "clamp(1rem, 1.6vw, 1.25rem)" }}
          >
            Ofissio menyatukan katalog seragam ready stock, fasilitas bordir
            in-house, dan alur pengadaan yang rapi — untuk perusahaan yang
            menuntut kualitas tanpa kompromi.
          </p>
        </div>

        {/* actions + chips */}
        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/catalog"
              size="lg"
              className="group bg-ochre-500 text-white hover:bg-ochre-600 shadow-glow-ochre"
            >
              Lihat Produk
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </ButtonLink>
            <ButtonLink
              href="/quote"
              size="lg"
              className="border border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              Konsultasi Pengadaan
            </ButtonLink>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {TRUST_CHIPS.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-100"
              >
                <c.icon className="h-3.5 w-3.5 text-ochre-400" strokeWidth={2.2} />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* STAT STRIP — bold, editorial */}
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 lg:grid-cols-4">
          <Stat number="12.000+" label="Logo bordir / bulan" />
          <Stat number="340+" label="Perusahaan klien" />
          <Stat number="8 pcs" label="Minimum order" />
          <Stat number="5 hari" label="Lead time rata-rata" />
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 bg-brand-700/40 p-6">
      <span
        className="type-display-tight text-ochre-400"
        style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
      >
        {number}
      </span>
      <span className="text-[11px] uppercase tracking-[0.12em] text-brand-200">
        {label}
      </span>
    </div>
  );
}
