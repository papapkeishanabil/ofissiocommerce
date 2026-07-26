// src/components/home/HeroIntro.tsx
// Hero aligned with the Ofissio Workwear homepage reference:
//   - Light background (white → cool) with subtle navy radial tinge top-right
//   - Navy headline text (NOT white-on-navy)
//   - Trust chips: white with subtle border
//   - Navy "stat" card and white "stat-2" card as visual collage

import {
  ArrowRight,
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
    <section
      className="relative overflow-hidden"
      style={{
        // Reference: radial navy tinge top-right + white → bg-cool vertical gradient
        background:
          "radial-gradient(ellipse 800px 400px at 80% 20%, rgba(20,39,102,0.06), transparent 60%)," +
          "linear-gradient(180deg, #ffffff 0%, #eff4ff 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* ============ Copy ============ */}
          <div>
            <span className="type-eyebrow inline-flex items-center gap-2 text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-ochre-500" />
              Procurement Workwear · Indonesia
            </span>

            <h1
              className="type-display-tight mt-5 text-brand-700"
              style={{ fontSize: "clamp(2.5rem, 6vw, 3.75rem)" }}
            >
              Workwear Ready Stock
              <br />
              untuk Perusahaan,
              <span className="block text-brand-400">
                Siap Bordir, Lebih Cepat.
              </span>
            </h1>

            <p
              className="mt-6 max-w-xl leading-relaxed text-ink-muted"
              style={{ fontSize: "clamp(1rem, 1.4vw, 1.1875rem)" }}
            >
              Ofissio membantu perusahaan mendapatkan baju kerja ready stock
              yang rapi, stok reliable, dan siap bordir logo — tanpa proses
              custom yang panjang.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/catalog" size="lg" className="group">
                Lihat Produk
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink
                href="/quote"
                size="lg"
                variant="outline"
                className="group"
              >
                <MessageCircle className="h-4 w-4" />
                Konsultasi Pengadaan
              </ButtonLink>
            </div>

            {/* Trust chips — white with subtle border, navy text (per reference) */}
            <div className="mt-7 flex flex-wrap gap-2">
              {TRUST_CHIPS.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-brand-700 shadow-soft-xs"
                >
                  <c.icon className="h-3.5 w-3.5 text-brand-700" strokeWidth={2} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* ============ Visual collage ============ */}
          <div className="relative hidden h-[460px] lg:block">
            {/* Navy stat card — top left (per reference .ofs-hero-stat) */}
            <div className="absolute left-0 top-4 flex items-center gap-3 rounded-2xl bg-brand-700 px-5 py-4 text-white shadow-soft-lg">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-ochre-400">
                <Scissors className="h-5 w-5" />
              </span>
              <div>
                <div className="type-display text-2xl font-extrabold leading-none">
                  12.000+
                </div>
                <div className="text-[11px] text-brand-200">
                  Logo bordir / bulan
                </div>
              </div>
            </div>

            {/* Product card mock — center, white card with navy badge */}
            <div className="absolute left-1/2 top-1/2 w-60 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-surface shadow-soft-lg ring-1 ring-black/5">
              <div
                className="relative aspect-[4/3] w-full"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(135deg, #142766 0%, #4a6bd8 60%, #8090d5 100%)",
                }}
              >
                <div className="absolute inset-0 grid place-items-center">
                  <Scissors className="h-12 w-12 text-white/40" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                <div className="min-w-0">
                  <span className="inline-block rounded bg-brand-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Ready Stock
                  </span>
                  <p className="mt-1 truncate font-mono text-[10px] text-ink-muted">
                    KK-006 · Kemeja Abu List
                  </p>
                </div>
                <span className="type-display text-sm font-bold text-brand-700">
                  Rp145rb
                </span>
              </div>
            </div>

            {/* White stat-2 card — bottom right (per reference .ofs-hero-stat-2) */}
            <div className="absolute bottom-6 right-0 flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-soft-lg">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <PackageCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="type-display text-2xl font-extrabold leading-none text-brand-700">
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
    </section>
  );
}
