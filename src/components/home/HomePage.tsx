// src/components/home/HomePage.tsx
// Commerce workspace entry for first-time visitors.
// Sections: HeroIntro → WhyOfissio → HowItWorks → Industries → Featured products.
// Brand-aligned with the Ofissio Workwear design language (navy + ochre + Manrope).

import Link from "next/link";

import { INDUSTRY_META } from "@/data/industries";
import { getAllProducts } from "@/data/products";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import { HeroIntro } from "./HeroIntro";
import { WhyOfissio } from "./WhyOfissio";
import { HowItWorks } from "./HowItWorks";

export function HomePage() {
  const featured = getAllProducts().slice(0, 3);

  return (
    <div>
      {/* 1. Intro hero (above the fold) */}
      <HeroIntro />

      {/* 2. Why Ofissio — value props */}
      <WhyOfissio />

      {/* 3. How it works — 4-step process */}
      <HowItWorks />

      {/* 4. Industries */}
      <section className="relative overflow-hidden bg-surface py-16 lg:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(20,39,102,0.05) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Pilih industri
            </span>
            <h2
              className="font-display mt-4 font-extrabold tracking-tight text-ink-strong"
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
            >
              Solusi seragam berdasarkan{" "}
              <span className="text-gradient-brand">industri.</span>
            </h2>
            <p className="mt-3 text-sm text-ink-muted lg:text-base">
              Klik kartu untuk melihat produk yang relevan dengan industri Anda.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRY_META.map((m, i) => (
              <Link
                key={m.name}
                href={`/catalog?industri=${encodeURIComponent(m.name)}`}
                className="hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-soft-sm hover:border-brand-300 hover:shadow-soft-lg"
              >
                {/* gradient hover wash */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.04]"
                />
                <div className="relative flex items-center justify-between">
                  <span className="font-display grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition-all duration-300 group-hover:from-brand-600 group-hover:to-brand-800 group-hover:text-white">
                    <IndustryGlyph index={i} />
                  </span>
                  <span className="font-mono text-[10px] font-bold text-ink-subtle transition-colors group-hover:text-brand-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="relative">
                  <h3 className="font-display text-base font-bold text-ink-strong">
                    {m.name}
                  </h3>
                  <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                    {m.tagline}
                  </p>
                </div>
                <div className="relative mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-600 opacity-0 transition-all duration-300 group-hover:opacity-100">
                  Lihat produk
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured products */}
      <section className="bg-cool-100 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 shadow-soft-xs">
                Produk unggulan
              </span>
              <h2
                className="font-display mt-4 font-extrabold tracking-tight text-ink-strong"
                style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
              >
                Pilihan <span className="text-gradient-brand">populer.</span>
              </h2>
              <p className="mt-2 text-sm text-ink-muted lg:text-base">
                Sebagian produk dapat dipakai lintas industri.
              </p>
            </div>
            <ButtonLink
              href="/catalog"
              variant="outline"
              className="group bg-surface"
            >
              Lihat semua produk
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </ButtonLink>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="hover-lift group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm hover:shadow-soft-lg"
              >
                <div className="relative">
                  <ProductImagePlaceholder
                    name={p.name}
                    accentColor={p.accentColor}
                    category={p.category}
                    className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  {/* badge overlay */}
                  <div className="absolute left-3 top-3">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-soft-sm " +
                        (p.fulfillment === "READY_STOCK"
                          ? "bg-emerald-500 text-white"
                          : "bg-ochre-500 text-white")
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {fulfillmentLabel(p.fulfillment)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                    <span className="font-semibold uppercase tracking-wide">
                      {p.category}
                    </span>
                    <span className="font-mono">{p.sku}</span>
                  </div>
                  <span className="font-display text-base font-bold leading-snug text-ink-strong transition-colors group-hover:text-brand-600">
                    {p.name}
                  </span>
                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-ink-subtle">
                        Mulai dari
                      </p>
                      <p className="font-display text-xl font-extrabold text-ink-strong">
                        {formatIDR(p.priceFrom)}
                      </p>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// Small glyph set for industry cards (varied icons per index)
function IndustryGlyph({ index }: { index: number }) {
  const glyphs = ["⛏️", "🏗️", "🏭", "🏨", "⚕️", "🍴", "🛡️", "💼"];
  const g = glyphs[index % glyphs.length] ?? "👔";
  return <span className="text-xl leading-none">{g}</span>;
}
