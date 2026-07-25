// src/components/home/HeroIntro.tsx
// Above-the-fold intro for first-time visitors.
// Modern aesthetic: animated gradient mesh, glassmorphism, floating accents.

import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  PackageCheck,
  Scissors,
  Sparkles,
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
      {/* Animated gradient mesh background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 500px at 85% -5%, rgba(74,107,216,0.55), transparent 60%)," +
            "radial-gradient(700px 500px at 0% 100%, rgba(0,18,74,0.7), transparent 60%)," +
            "radial-gradient(500px 400px at 50% 50%, rgba(220,152,20,0.10), transparent 70%)",
        }}
      />
      {/* fine dotted texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* soft top sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* ============ Copy ============ */}
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5 text-ochre-400" />
              Procurement Workwear · Indonesia
            </span>

            <h1
              className="font-display mt-5 font-extrabold leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Workwear Ready Stock
              <br />
              untuk Perusahaan,
              <span className="block text-gradient-ochre">Siap Bordir, Lebih Cepat.</span>
            </h1>

            <p
              className="mt-5 max-w-xl leading-relaxed text-brand-100/90"
              style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.125rem)" }}
            >
              Ofissio membantu perusahaan mendapatkan baju kerja ready stock
              yang rapi, stok reliable, dan siap bordir logo — tanpa proses
              custom yang panjang.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink
                href="/catalog"
                size="lg"
                className="group bg-white text-brand-700 shadow-glow-brand transition-all hover:bg-brand-50 hover:shadow-soft-xl"
              >
                Lihat Produk
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink
                href="/quote"
                size="lg"
                variant="outline"
                className="glass text-white transition-all hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" />
                Konsultasi Pengadaan
              </ButtonLink>
            </div>

            {/* Trust chips */}
            <div className="mt-8 flex flex-wrap gap-2">
              {TRUST_CHIPS.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-soft-sm"
                >
                  <c.icon className="h-3.5 w-3.5 text-brand-500" />
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* ============ Visual collage ============ */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto h-[420px] w-full max-w-md">
              {/* Decorative gradient orb behind */}
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(220,152,20,0.6), transparent 70%)",
                }}
              />

              {/* Big stat — top left, floating */}
              <div className="absolute -left-2 top-2 flex animate-float-slow items-center gap-3 rounded-2xl glass px-5 py-4 shadow-soft-xl">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ochre-500/20 text-ochre-400">
                  <Scissors className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-display text-2xl font-extrabold leading-none">
                    12.000+
                  </div>
                  <div className="text-[11px] text-brand-100">
                    Logo bordir / bulan
                  </div>
                </div>
              </div>

              {/* Product card mock — center, primary */}
              <div className="absolute left-1/2 top-1/2 w-60 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-soft-xl ring-1 ring-black/5">
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden"
                  aria-hidden
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #142766 0%, #4a6bd8 60%, #8090d5 100%)",
                    }}
                  />
                  {/* sheen overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  {/* mock product silhouette */}
                  <div className="absolute inset-0 grid place-items-center">
                    <Scissors className="h-12 w-12 text-white/40" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                  <div className="min-w-0">
                    <span className="inline-block rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Ready Stock
                    </span>
                    <p className="mt-1 truncate font-mono text-[10px] text-ink-muted">
                      KK-006 · Kemeja Abu List
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-brand-700">
                    Rp145rb
                  </span>
                </div>
              </div>

              {/* Second stat — bottom right */}
              <div
                className="absolute -right-2 bottom-4 flex animate-float-slow items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-soft-xl ring-1 ring-black/5"
                style={{ animationDelay: "1s" }}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-display text-2xl font-extrabold leading-none text-brand-700">
                    340+
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Perusahaan klien
                  </div>
                </div>
              </div>

              {/* tiny floating badge — ochre accent */}
              <div className="absolute right-12 top-0 animate-float-slow rounded-full bg-ochre-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-glow-ochre" style={{ animationDelay: "0.5s" }}>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  In-house
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
