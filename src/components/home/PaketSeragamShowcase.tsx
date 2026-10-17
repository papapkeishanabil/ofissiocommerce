"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Coffee, UtensilsCrossed } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import type { PaketItem, PaketSectionData, TextSegment } from "@/features/site-content/content.schema";
import { INSPIRATION_PAGES } from "@/features/site-content/industry-inspiration.routes";
import { HomeSectionMarker } from "./HomeSectionMarker";

const FALLBACK_VISUAL_BY_ICON: Record<string, string> = {
  Wrench: "/packages/paket-bengkel.png",
  Store: "/packages/paket-toko-retail.png",
  Plus: "/packages/paket-apotek-klinik.png",
  Coffee: "/packages/paket-cafe-service.png",
  Building2: "/packages/paket-corporate.png",
  HardHat: "/packages/paket-lapangan-konstruksi.png",
};

const FALLBACK_VISUALS = [
  "/packages/paket-bengkel.png",
  "/packages/paket-toko-retail.png",
  "/packages/paket-apotek-klinik.png",
  "/packages/paket-cafe-service.png",
  "/packages/paket-corporate.png",
  "/packages/paket-lapangan-konstruksi.png",
] as const;

type FoodBusiness = "cafe" | "restaurant";

const FOOD_SERVICE_VARIANTS = {
  cafe: {
    name: "Paket Kafe",
    items: "Polo premium, apron cross-back, kemeja front counter, atasan dapur",
    cocokUntuk: "Coffee shop, bakery, kedai minuman, dan kafe kasual",
    href: "/inspirasi/restoran-kafe?business=cafe",
    image: "/inspirasi/kafe-restoran/tim-kafe-ofissio.png",
    imageAlt: "Tim kafe memakai seragam Ofissio",
  },
  restaurant: {
    name: "Paket Restoran",
    items: "Kemeja formal, vest pelayanan, chef jacket, apron bistro",
    cocokUntuk: "Restoran formal, hotel dining, banquet, dan hospitality",
    href: "/inspirasi/restoran-kafe?business=restaurant",
    image: "/inspirasi/kafe-restoran/tim-restoran-ofissio.png",
    imageAlt: "Tim restoran memakai seragam Ofissio",
  },
} as const satisfies Record<FoodBusiness, {
  name: string;
  items: string;
  cocokUntuk: string;
  href: string;
  image: string;
  imageAlt: string;
}>;

function isFoodServicePackage(item: PaketItem) {
  return item.icon === "Coffee" || item.href.includes("/inspirasi/restoran-kafe");
}

function packageInspirationHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const url = new URL(href, "https://ofissio.local");
  const page = INSPIRATION_PAGES.find((entry) =>
    url.pathname === `/inspirasi/${entry.slug}` ||
    (url.pathname === "/catalog" && url.searchParams.get("industri") === entry.industry),
  );
  if (!page) return null;
  return url.pathname === "/catalog" ? `/inspirasi/${page.slug}` : href;
}

function visualFor(item: PaketItem, index: number) {
  return item.photo || FALLBACK_VISUAL_BY_ICON[item.icon] || FALLBACK_VISUALS[index % FALLBACK_VISUALS.length] || FALLBACK_VISUALS[0];
}

function SegmentedHeadline({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        const previousText = segments[index - 1]?.text ?? "";
        const needsLeadingSpace =
          index > 0 &&
          !/\s$/.test(previousText) &&
          !/^\s/.test(segment.text) &&
          !/^[.,!?;:)]/.test(segment.text);

        return (
          <span key={`${segment.text}-${index}`} className={segment.highlight ? "text-brand-700" : undefined}>
            {needsLeadingSpace ? " " : null}
            {segment.text}
          </span>
        );
      })}
    </>
  );
}

export function PaketSeragamShowcase({ data }: { data: PaketSectionData }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [foodBusiness, setFoodBusiness] = useState<FoodBusiness>("cafe");
  const activeItem = data.items[activeIndex] ?? data.items[0];

  if (!activeItem) return null;

  const foodServiceActive = isFoodServicePackage(activeItem);
  const foodVariant = FOOD_SERVICE_VARIANTS[foodBusiness];
  const visibleName = foodServiceActive ? foodVariant.name : activeItem.name;
  const visibleItems = foodServiceActive ? foodVariant.items : activeItem.items;
  const visibleFit = foodServiceActive ? foodVariant.cocokUntuk : activeItem.cocokUntuk;
  const visibleHref = foodServiceActive ? foodVariant.href : packageInspirationHref(activeItem.href) ?? activeItem.href;
  const visibleCta = foodServiceActive
    ? `Lihat inspirasi ${foodBusiness === "cafe" ? "Kafe" : "Restoran"}`
    : packageInspirationHref(activeItem.href)
      ? `Lihat inspirasi ${activeItem.name.replace(/^Paket\s+/i, "")}`
      : data.ctaLabel;
  const activeVisual = foodServiceActive ? foodVariant.image : visualFor(activeItem, activeIndex);
  const secondaryItems = data.items.map((item, index) => ({ item, index })).filter(({ index }) => index !== activeIndex);

  const selectPackage = (index: number) => setActiveIndex(index);

  const handlePackageKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = data.items.length - 1;
    let nextIndex = index;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    selectPackage(nextIndex);
  };

  const selectFoodBusiness = (business: FoodBusiness) => setFoodBusiness(business);

  return (
    <section id="paket" className="scroll-reveal scroll-mt-24 bg-[#f7f2e9] py-20 lg:py-28">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)] lg:items-end lg:gap-20">
          <div className="max-w-5xl">
            <HomeSectionMarker number="03" label={data.eyebrow} />
            <h2 className="mt-6 max-w-[18ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-ink-strong sm:text-6xl lg:text-[4rem]">
              <SegmentedHeadline segments={data.headline} />
            </h2>
          </div>

          <div className="border-b border-ochre-500/70 pb-6 lg:mb-1">
            <p className="max-w-[58ch] text-base leading-relaxed text-ink-muted sm:text-lg">{data.lede}</p>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700 sm:text-sm">
              {String(data.items.length).padStart(2, "0")} pilihan paket
            </p>
          </div>
        </header>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.7fr)]" role="tablist" aria-label="Pilihan paket seragam" aria-orientation="vertical">
          <article className="overflow-hidden rounded-2xl border border-ochre-600/25 bg-white shadow-[0_18px_45px_rgba(7,27,67,0.06)]">
            <div className="grid min-h-[34rem] lg:grid-cols-[minmax(19rem,0.86fr)_minmax(24rem,1.14fr)]">
              <div className="flex flex-col p-7 sm:p-9 lg:p-10">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">Opsi {String(activeIndex + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] text-brand-950 sm:text-5xl">{visibleName}</h3>
                <p className="mt-5 text-sm leading-relaxed text-ink-muted">{visibleFit}</p>

                {foodServiceActive ? (
                  <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-brand-900/15" role="tablist" aria-label="Pilih jenis usaha">
                    {(["cafe", "restaurant"] as const).map((business) => {
                      const selected = foodBusiness === business;
                      const Icon = business === "cafe" ? Coffee : UtensilsCrossed;
                      return (
                        <button
                          key={business}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => selectFoodBusiness(business)}
                          className={`flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-extrabold transition-colors ${selected ? "bg-ochre-50 text-ochre-800" : "bg-white text-brand-950 hover:bg-brand-50"}`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                          {business === "cafe" ? "Kafe" : "Restoran"}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <dl className="mt-7 border-y border-ochre-600/20">
                  <div className="grid gap-2 border-b border-ochre-600/20 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ochre-700">{data.isiLabel}</dt>
                    <dd className="text-sm font-semibold leading-relaxed text-brand-950">{visibleItems}</dd>
                  </div>
                  <div className="grid gap-2 border-b border-ochre-600/20 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ochre-700">{data.cocokUntukLabel}</dt>
                    <dd className="text-sm leading-relaxed text-ink-muted">{visibleFit}</dd>
                  </div>
                  <div className="grid gap-2 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ochre-700">{data.opsiLogoLabel}</dt>
                    <dd className="text-sm leading-relaxed text-ink-muted">{activeItem.opsiLogo}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap items-center gap-4 pt-7">
                  <Link href={visibleHref} className="inline-flex min-h-11 items-center gap-4 rounded-full bg-ochre-500 px-5 text-sm font-extrabold text-brand-950 transition-colors hover:bg-ochre-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">
                    {visibleCta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href={visibleHref} className="text-sm font-extrabold text-brand-950 underline decoration-ochre-500 underline-offset-4 hover:text-ochre-800">Lihat detail</Link>
                </div>
              </div>
              <div className="relative min-h-[19rem] bg-[#e9dfd0] lg:min-h-0">
                <Image src={activeVisual} alt={`Tampilan seragam ${visibleName}`} fill sizes="(max-width: 1023px) 100vw, 43vw" className="object-cover object-center" priority={activeIndex === 0} />
              </div>
            </div>
          </article>

          <div className="grid gap-4">
            {secondaryItems.slice(0, 2).map(({ item, index }) => (
              <button
                key={`${item.name}-${index}`}
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => selectPackage(index)}
                onKeyDown={(event) => handlePackageKeyDown(event, index)}
                className="group grid min-h-[16rem] grid-cols-[minmax(0,1.05fr)_minmax(8rem,0.95fr)] overflow-hidden rounded-2xl border border-ochre-600/20 bg-white text-left transition-shadow hover:shadow-[0_16px_35px_rgba(7,27,67,0.08)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
              >
                <span className="flex flex-col p-6 sm:p-7">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">{String(index + 1).padStart(2, "0")}</span>
                  <span className="mt-3 text-xl font-extrabold leading-tight tracking-[-0.03em] text-brand-950">{item.name}</span>
                  <span className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">{item.cocokUntuk}</span>
                  <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-extrabold text-brand-950">Lihat paket <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                </span>
                <span className="relative min-h-full bg-[#e9dfd0]">
                  <Image src={visualFor(item, index)} alt={`Tampilan ${item.name}`} fill sizes="(max-width: 1023px) 45vw, 20vw" className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {secondaryItems.slice(2).map(({ item, index }) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              role="tab"
              aria-selected={false}
              onClick={() => selectPackage(index)}
              onKeyDown={(event) => handlePackageKeyDown(event, index)}
              className="group grid min-h-[13rem] grid-cols-[minmax(0,1.1fr)_minmax(7rem,0.9fr)] overflow-hidden rounded-2xl border border-ochre-600/20 bg-white text-left transition-shadow hover:shadow-[0_16px_35px_rgba(7,27,67,0.08)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
            >
              <span className="flex flex-col p-5 sm:p-6">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-3 text-lg font-extrabold leading-tight tracking-[-0.03em] text-brand-950">{item.name}</span>
                <span className="mt-auto flex items-center gap-2 pt-4 text-xs font-extrabold text-brand-950">Lihat paket <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
              </span>
              <span className="relative min-h-full bg-[#e9dfd0]">
                <Image src={visualFor(item, index)} alt={`Tampilan ${item.name}`} fill sizes="(max-width: 639px) 45vw, 25vw" className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 border-b border-ochre-600/30 py-5 text-sm text-ink-muted">
          <BadgeCheck className="h-5 w-5 shrink-0 text-ochre-700" strokeWidth={1.6} aria-hidden="true" />
          <p>Semua paket fleksibel untuk jumlah kecil dan repeat order kapan pun.</p>
        </div>
      </div>
    </section>
  );
}
