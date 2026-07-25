// src/components/home/HeroIntro.tsx
// Above-the-fold intro for first-time visitors on the commerce workspace.
// Adapted from the Ofissio Workwear homepage reference (navy + trust chips + stats).

import {
  ArrowRight,
  CheckCircle2,
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
    <section className="relative overflow-hidden bg-brand-600 text-white">
      {/* decorative gradient layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(900px 500px at 80% -10%, rgba(74,107,216,0.45), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(0,18,74,0.55), transparent 60%)",
        }}
      />
      {/* subtle dotted texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-100 ring-1 ring-white/15">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Procurement Workwear · Indonesia
            </span>

            <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
              Workwear Ready Stock untuk Perusahaan,
              <span className="block text-ochre-400">
                Siap Bordir, Lebih Cepat.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-100/90 lg:text-base">
              Ofissio membantu perusahaan mendapatkan baju kerja ready stock
              yang rapi, stok reliable, dan siap bordir logo — tanpa proses
              custom yang panjang.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href="/catalog"
                size="lg"
                className="bg-white text-brand-700 hover:bg-brand-50"
              >
                Lihat Produk
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink
                href="/quote"
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" />
                Konsultasi Pengadaan
              </ButtonLink>
            </div>

            {/* Trust chips */}
            <div className="mt-7 flex flex-wrap gap-2">
              {TRUST_CHIPS.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-soft-xs"
                >
                  <c.icon className="h-3.5 w-3.5" />
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* Visual: stats + floating cards */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto aspect-square max-w-md">
              {/* big stat — top left */}
              <div className="absolute left-0 top-6 flex items-center gap-3 rounded-2xl bg-brand-900/80 px-5 py-4 shadow-soft-lg ring-1 ring-white/10 backdrop-blur">
                <Scissors className="h-7 w-7 text-ochre-400" />
                <div>
                  <div className="font-display text-2xl font-extrabold leading-none">
                    12.000+
                  </div>
                  <div className="text-[11px] text-brand-100">
                    Logo bordir / bulan
                  </div>
                </div>
              </div>

              {/* product card mock — center */}
              <div className="absolute left-1/2 top-1/2 w-56 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-soft-lg ring-1 ring-black/5">
                <div
                  className="aspect-[4/3] w-full"
                  style={{
                    background:
                      "linear-gradient(135deg, #142766 0%, #4a6bd8 100%)",
                  }}
                  aria-hidden
                />
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Ready Stock
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted">
                    KK-006 · Kemeja Abu List
                  </span>
                </div>
              </div>

              {/* second stat — bottom right */}
              <div className="absolute bottom-4 right-0 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-soft-lg ring-1 ring-black/5">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                <div>
                  <div className="font-display text-2xl font-extrabold leading-none text-brand-700">
                    340+
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Perusahaan klien
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
