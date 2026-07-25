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
      <section className="bg-cool-100 py-14 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
              Pilih industri
            </span>
            <h2 className="font-display mt-2 text-2xl font-extrabold text-ink-strong lg:text-3xl">
              Solusi seragam berdasarkan industri.
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Klik kartu untuk melihat produk yang relevan dengan industri Anda.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRY_META.map((m) => (
              <Link
                key={m.name}
                href={`/catalog?industri=${encodeURIComponent(m.name)}`}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft-xs transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft-md"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-ink-strong">
                    {m.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                    {m.tagline}
                  </p>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured products */}
      <section className="bg-surface py-14 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                Produk unggulan
              </span>
              <h2 className="font-display mt-2 text-2xl font-extrabold text-ink-strong lg:text-3xl">
                Pilihan populer.
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Sebagian produk dapat dipakai lintas industri.
              </p>
            </div>
            <ButtonLink href="/catalog" variant="outline">
              Lihat semua produk
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-xs transition hover:-translate-y-0.5 hover:shadow-soft-md"
              >
                <ProductImagePlaceholder
                  name={p.name}
                  accentColor={p.accentColor}
                  category={p.category}
                  className="aspect-[4/3] w-full"
                />
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                    <span className="font-semibold uppercase tracking-wide">
                      {p.category}
                    </span>
                    <span className="font-mono">{p.sku}</span>
                  </div>
                  <span className="font-display text-base font-bold text-ink-strong group-hover:text-brand-600">
                    {p.name}
                  </span>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-xs text-ink-muted">Mulai dari</span>
                    <span className="font-display text-lg font-extrabold text-ink-strong">
                      {formatIDR(p.priceFrom)}
                    </span>
                  </div>
                  <Badge
                    tone={p.fulfillment === "READY_STOCK" ? "success" : "amber"}
                    className="mt-1 self-start"
                  >
                    {fulfillmentLabel(p.fulfillment)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
