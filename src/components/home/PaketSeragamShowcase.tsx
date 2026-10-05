"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Coffee, ImageIcon, PackageOpen, UsersRound, UtensilsCrossed } from "lucide-react";
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
    imageAlt: "Tim kafe memakai polo navy, apron taupe, seragam dapur hitam, dan celana beige",
    imageLabel: "Identitas Kafe",
    imageHeadline: "Navy–taupe untuk suasana hangat dan kasual",
    imageCopy: "Selaras dengan produk pada halaman inspirasi Kafe.",
    colors: ["#06183b", "#b8a184", "#2d3035"],
    colorsLabel: "Navy, taupe, dan hitam",
  },
  restaurant: {
    name: "Paket Restoran",
    items: "Kemeja formal, vest pelayanan, chef jacket, apron bistro",
    cocokUntuk: "Restoran formal, hotel dining, banquet, dan hospitality",
    href: "/inspirasi/restoran-kafe?business=restaurant",
    image: "/inspirasi/kafe-restoran/tim-restoran-ofissio.png",
    imageAlt: "Tim restoran memakai kemeja putih, vest navy, chef jacket putih, jas navy, dan apron hitam",
    imageLabel: "Identitas Restoran",
    imageHeadline: "Putih–navy–hitam untuk layanan yang lebih formal",
    imageCopy: "Selaras dengan produk pada halaman inspirasi Restoran.",
    colors: ["#06183b", "#f3f0e9", "#252a32"],
    colorsLabel: "Navy, putih, dan hitam",
  },
} as const satisfies Record<FoodBusiness, {
  name: string;
  items: string;
  cocokUntuk: string;
  href: string;
  image: string;
  imageAlt: string;
  imageLabel: string;
  imageHeadline: string;
  imageCopy: string;
  colors: readonly string[];
  colorsLabel: string;
}>;

function isFoodServicePackage(item: PaketItem) {
  return item.icon === "Coffee" || item.href.includes("/inspirasi/restoran-kafe");
}

function packageInspirationHref(href: string) {
  // Older published content still links to industry-filtered catalogs.
  // Resolve those locally without overwriting links authored for other destinations.
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
  return (
    item.photo ||
    FALLBACK_VISUAL_BY_ICON[item.icon] ||
    FALLBACK_VISUALS[index % FALLBACK_VISUALS.length] ||
    FALLBACK_VISUALS[0]
  );
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

  const selectPackage = (index: number) => {
    setActiveIndex(index);
  };

  const handlePackageKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const lastIndex = data.items.length - 1;
    let nextIndex = index;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;

    selectPackage(nextIndex);
    document.getElementById(`paket-tab-${nextIndex}`)?.focus();
  };

  if (!activeItem) return null;

  const foodServiceActive = isFoodServicePackage(activeItem);
  const foodVariant = FOOD_SERVICE_VARIANTS[foodBusiness];
  const visibleName = foodServiceActive ? foodVariant.name : activeItem.name;
  const visibleItems = foodServiceActive ? foodVariant.items : activeItem.items;
  const visibleFit = foodServiceActive ? foodVariant.cocokUntuk : activeItem.cocokUntuk;
  const inspirationHref = packageInspirationHref(activeItem.href);
  const visibleHref = foodServiceActive ? foodVariant.href : inspirationHref ?? activeItem.href;
  const visibleCta = foodServiceActive
    ? `Lihat inspirasi ${foodBusiness === "cafe" ? "Kafe" : "Restoran"}`
    : inspirationHref ? `Lihat inspirasi ${activeItem.name.replace(/^Paket\s+/i, "")}` : data.ctaLabel;

  const selectFoodBusiness = (nextBusiness: FoodBusiness) => {
    setFoodBusiness(nextBusiness);
  };

  const handleFoodBusinessKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const businesses: readonly FoodBusiness[] = ["cafe", "restaurant"];
    let nextIndex = index;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = businesses.length - 1;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % businesses.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + businesses.length) % businesses.length;
    const nextBusiness = businesses[nextIndex]!;
    selectFoodBusiness(nextBusiness);
    document.getElementById(`food-business-tab-${nextBusiness}`)?.focus();
  };

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

        <div className="mt-12 overflow-hidden rounded-2xl border border-ochre-600/25 bg-[#fbf8f2] xl:grid xl:grid-cols-[18rem_minmax(22rem,0.78fr)_minmax(31rem,1.22fr)]">
          <div
            className="flex snap-x snap-mandatory overflow-x-auto border-b border-ochre-600/25 xl:block xl:overflow-visible xl:border-b-0 xl:border-r"
            role="tablist"
            aria-label="Pilihan paket seragam"
            aria-orientation="vertical"
          >
            {data.items.map((item, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={`${item.name}-${index}`}
                  id={`paket-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="paket-active-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectPackage(index)}
                  onKeyDown={(event) => handlePackageKeyDown(event, index)}
                  className={`group relative flex min-h-20 min-w-[15rem] snap-start items-center gap-5 border-r border-ochre-600/20 px-6 py-5 text-left transition-colors duration-300 last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-700 xl:min-h-[5.75rem] xl:w-full xl:min-w-0 xl:border-b xl:border-r-0 xl:last:border-b-0 ${
                    selected ? "bg-white text-brand-950" : "bg-transparent text-ink-muted hover:bg-white/70 hover:text-brand-950"
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 transition-colors ${selected ? "bg-ochre-500" : "bg-transparent group-hover:bg-ochre-500/35"}`}
                    aria-hidden="true"
                  />
                  <span className={`text-xs font-extrabold tabular-nums tracking-[0.14em] ${selected ? "text-ochre-700" : "text-ochre-700/65"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base font-bold leading-tight tracking-[-0.01em]">{item.name}</span>
                </button>
              );
            })}
          </div>

          <article
            id="paket-active-panel"
            role="tabpanel"
            aria-labelledby={`paket-tab-${activeIndex}`}
            className="flex min-h-[32rem] flex-col border-b border-ochre-600/25 px-6 py-7 sm:px-9 xl:min-h-[36rem] xl:border-b-0 xl:border-r xl:px-10"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                Opsi {String(activeIndex + 1).padStart(2, "0")}
              </p>
              {activeItem.scale ? (
                <span className="rounded-full border border-ochre-600/35 bg-ochre-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-ochre-800">
                  {data.scaleBadgeLabel}
                </span>
              ) : null}
            </div>

            <h3 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] text-brand-950 sm:text-5xl">
              {visibleName}
            </h3>

            {foodServiceActive ? (
              <div
                className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-brand-900/20 bg-white"
                role="tablist"
                aria-label="Pilih bidang usaha makanan dan minuman"
              >
                {(["cafe", "restaurant"] as const).map((business, index) => {
                  const selected = foodBusiness === business;
                  const Icon = business === "cafe" ? Coffee : UtensilsCrossed;
                  const label = business === "cafe" ? "Kafe" : "Restoran";
                  return (
                    <button
                      key={business}
                      id={`food-business-tab-${business}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="food-business-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => selectFoodBusiness(business)}
                      onKeyDown={(event) => handleFoodBusinessKeyDown(event, index)}
                      className={`relative flex min-h-14 items-center justify-center gap-2 border-r border-brand-900/15 px-4 text-sm font-extrabold transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-700 ${
                        selected
                          ? "bg-ochre-50 text-ochre-800 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-ochre-500"
                          : "bg-white text-brand-950 hover:bg-brand-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <dl
              id={foodServiceActive ? "food-business-panel" : undefined}
              role={foodServiceActive ? "tabpanel" : undefined}
              aria-labelledby={foodServiceActive ? `food-business-tab-${foodBusiness}` : undefined}
              aria-live={foodServiceActive ? "polite" : undefined}
              className="mt-6 grid gap-0 border-y border-ochre-600/25 [&>div]:py-4 sm:[&>div]:grid-cols-[5.5rem_minmax(0,1fr)]"
            >
              <div className="grid gap-3 border-b border-ochre-600/20 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                <dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  <PackageOpen className="h-5 w-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                  {data.isiLabel}
                </dt>
                <dd className="text-base font-semibold leading-relaxed text-ink-strong">{visibleItems}</dd>
              </div>
              <div className="grid gap-3 border-b border-ochre-600/20 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                <dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  <UsersRound className="h-5 w-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                  {data.cocokUntukLabel}
                </dt>
                <dd className="text-base leading-relaxed text-ink-muted">{visibleFit}</dd>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                <dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  <ImageIcon className="h-5 w-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                  {data.opsiLogoLabel}
                </dt>
                <dd className="text-base leading-relaxed text-ink-muted">{activeItem.opsiLogo}</dd>
              </div>
            </dl>

            <Link
              href={visibleHref}
              aria-label={`${visibleCta}: ${visibleName}`}
              className="group mt-auto flex min-h-12 items-center justify-between gap-4 pt-8 text-sm font-extrabold text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
            >
              <span className="border-b border-ochre-500 pb-2">{visibleCta}</span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ochre-600/50 text-ochre-700 transition-all duration-300 group-hover:border-ochre-500 group-hover:bg-ochre-500 group-hover:text-brand-950">
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </article>

          <div className={`relative overflow-hidden bg-[#e9dfd0] ${foodServiceActive ? "flex flex-col" : "aspect-[4/3] min-h-[24rem] xl:aspect-auto xl:min-h-[36rem]"}`}>
            {foodServiceActive ? (
              <>
                <p className="shrink-0 px-6 py-4 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ochre-800 sm:px-7">
                  {foodVariant.imageLabel}
                </p>
                <div className="relative aspect-[8/5] w-full flex-1">
                  {(Object.entries(FOOD_SERVICE_VARIANTS) as [FoodBusiness, (typeof FOOD_SERVICE_VARIANTS)[FoodBusiness]][]).map(([business, variant]) => (
                    <Image
                      key={variant.image}
                      src={variant.image}
                      alt={variant.imageAlt}
                      fill
                      sizes="(max-width: 1279px) 100vw, 44vw"
                      aria-hidden={business !== foodBusiness}
                      className={`object-contain object-center transition-opacity duration-500 motion-reduce:transition-none ${
                        business === foodBusiness ? "opacity-100" : "pointer-events-none opacity-0"
                      }`}
                    />
                  ))}
                </div>
                <div className="grid shrink-0 gap-2 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.9fr)] sm:items-start sm:gap-6 sm:px-7 sm:py-6">
                  <strong className="text-sm leading-snug text-brand-950 sm:text-base">{foodVariant.imageHeadline}</strong>
                  <div className="space-y-2 text-xs leading-relaxed text-ink-muted">
                    <div className="flex items-center gap-2" aria-label={`Palet utama: ${foodVariant.colorsLabel}`}>
                      {foodVariant.colors.map((color) => (
                        <span key={color} className="h-5 w-5 shrink-0 rounded-full border-2 border-white" style={{ backgroundColor: color }} aria-hidden="true" />
                      ))}
                      <span>{foodVariant.colorsLabel}</span>
                    </div>
                    <p>{foodVariant.imageCopy}</p>
                  </div>
                </div>
              </>
            ) : (
              data.items.map((item, index) => (
                <Image
                  key={`${item.name}-visual`}
                  src={visualFor(item, index)}
                  alt={`Tampilan seragam ${item.name}`}
                  fill
                  sizes="(max-width: 1279px) 100vw, 44vw"
                  loading={index === 0 ? "eager" : "lazy"}
                  aria-hidden={index !== activeIndex}
                  className={`object-contain object-center transition-opacity duration-500 motion-reduce:transition-none ${
                    index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-ochre-600/30 py-5 text-sm text-ink-muted">
          <BadgeCheck className="h-5 w-5 shrink-0 text-ochre-700" strokeWidth={1.6} aria-hidden="true" />
          <p>Semua paket fleksibel untuk jumlah kecil dan repeat order kapan pun.</p>
        </div>
      </div>
    </section>
  );
}
