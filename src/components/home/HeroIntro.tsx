import Link from "next/link";
import { ArrowRight, PackageCheck, Scissors, Truck, Users } from "lucide-react";
import { Manrope } from "next/font/google";
import { OfistantOpenButton } from "./OfistantOpenButton";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-hero", display: "swap" });

const TRUST = [
  { icon: PackageCheck, label: "Ready Stock" },
  { icon: Scissors, label: "Siap Bordir" },
  { icon: Users, label: "MOQ mulai 8 pcs" },
  { icon: Truck, label: "Delivery Cepat" },
];

export function HeroIntro() {
  return (
    <section className={`${manrope.variable} relative flex min-h-[92svh] w-full items-center overflow-hidden bg-[#070d1c]`}>
      {/* Video background — autoplay + loop (NOT scrubbing) */}
      <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover">
        <source src="/KL-008-Rev.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#070d1c]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070d1c]/70 via-[#070d1c]/20 to-transparent" />
      {/* Bottom fade — smooth transition to light sections below */}
      <div className="pointer-events-none absolute -bottom-px left-0 right-0 z-[1] h-64 bg-gradient-to-b from-transparent via-surface/60 to-surface" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        <div className="max-w-2xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            Procurement Workwear · Indonesia
          </span>

          <h1 className={`${manrope.className} text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl`}>
            Workwear Ready Stock<br />
            untuk Perusahaan,<br />
            <span className="text-white/70">Siap Bordir, Lebih Cepat.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
            Ofissio membantu perusahaan mendapatkan baju kerja ready stock yang rapi,
            stok reliable, dan siap bordir logo — tanpa proses custom yang panjang.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalog" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 hover:shadow-lg">
              Jelajahi Koleksi <ArrowRight className="h-4 w-4" />
            </Link>
            <OfistantOpenButton />
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {TRUST.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-brand-900/60 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md shadow-soft-sm">
                <t.icon className="h-3.5 w-3.5 text-white/70" strokeWidth={2} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
