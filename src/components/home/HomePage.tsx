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
      <section className="bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="type-eyebrow text-brand-600">
                <span className="mr-2 inline-block h-px w-8 bg-brand-600 align-middle" />
                Pilih industri
              </span>
              <h2
                className="type-display mt-5 text-ink-strong"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
              >
                Solusi seragam
                <br />
                berdasarkan <span className="text-brand-600">industri.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm text-ink-muted">
              Klik kartu untuk melihat produk yang relevan dengan industri Anda.
            </p>
          </div>

          {/* industry list — bold editorial, list-style rows on desktop */}
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRY_META.map((m, i) => (
              <Link
                key={m.name}
                href={`/catalog?industri=${encodeURIComponent(m.name)}`}
                className="group relative flex flex-col justify-between bg-surface p-7 transition-colors duration-300 hover:bg-brand-700"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="type-display-tight text-3xl text-ink-strong transition-colors group-hover:text-ochre-400"
                  >
                    {m.name.charAt(0)}
                  </span>
                  <span className="type-mono-label text-ink-subtle transition-colors group-hover:text-brand-200">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-12">
                  <h3
                    className="type-display text-lg text-ink-strong transition-colors group-hover:text-white"
                    style={{ fontWeight: 600 }}
                  >
                    {m.name}
                  </h3>
                  <p className="mt-1 text-xs leading-snug text-ink-muted transition-colors group-hover:text-brand-100">
                    {m.tagline}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-brand-600 transition-colors group-hover:text-ochre-400">
                    Lihat produk
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured products */}
      <section className="bg-surface py-20 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="type-eyebrow text-brand-600">
                <span className="mr-2 inline-block h-px w-8 bg-brand-600 align-middle" />
                Produk unggulan
              </span>
              <h2
                className="type-display mt-5 text-ink-strong"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
              >
                Pilihan <span className="text-brand-600">populer.</span>
              </h2>
              <p className="mt-3 text-sm text-ink-muted lg:text-base">
                Sebagian produk dapat dipakai lintas industri.
              </p>
            </div>
            <ButtonLink href="/catalog" variant="outline" className="group">
              Lihat semua produk
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </ButtonLink>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-soft-lg"
              >
                <div className="relative overflow-hidden">
                  <ProductImagePlaceholder
                    name={p.name}
                    accentColor={p.accentColor}
                    category={p.category}
                    className="aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider " +
                        (p.fulfillment === "READY_STOCK"
                          ? "bg-emerald-600 text-white"
                          : "bg-ochre-500 text-white")
                      }
                    >
                      {fulfillmentLabel(p.fulfillment)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex items-center justify-between type-mono-label text-ink-subtle">
                    <span>{p.category}</span>
                    <span>{p.sku}</span>
                  </div>
                  <h3
                    className="type-display text-lg leading-snug text-ink-strong transition-colors group-hover:text-brand-700"
                    style={{ fontWeight: 600 }}
                  >
                    {p.name}
                  </h3>
                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink-subtle">
                        Mulai dari
                      </p>
                      <p
                        className="type-display text-2xl text-ink-strong"
                        style={{ fontWeight: 700 }}
                      >
                        {formatIDR(p.priceFrom)}
                      </p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-strong transition-all duration-300 group-hover:border-brand-700 group-hover:bg-brand-700 group-hover:text-white">
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
