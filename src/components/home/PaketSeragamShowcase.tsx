"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ImageIcon, PackageOpen, UsersRound } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import type { PaketItem, PaketSectionData, TextSegment } from "@/features/site-content/content.schema";
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
            className="flex min-h-[32rem] flex-col border-b border-ochre-600/25 px-6 py-9 sm:px-9 xl:min-h-[36rem] xl:border-b-0 xl:border-r xl:px-10 xl:py-10"
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
              {activeItem.name}
            </h3>

            <dl className="mt-8 grid gap-0 border-y border-ochre-600/25">
              <div className="grid gap-3 border-b border-ochre-600/20 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                <dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  <PackageOpen className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                  {data.isiLabel}
                </dt>
                <dd className="text-base font-semibold leading-relaxed text-ink-strong">{activeItem.items}</dd>
              </div>
              <div className="grid gap-3 border-b border-ochre-600/20 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                <dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  <UsersRound className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                  {data.cocokUntukLabel}
                </dt>
                <dd className="text-base leading-relaxed text-ink-muted">{activeItem.cocokUntuk}</dd>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
                <dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  <ImageIcon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                  {data.opsiLogoLabel}
                </dt>
                <dd className="text-base leading-relaxed text-ink-muted">{activeItem.opsiLogo}</dd>
              </div>
            </dl>

            <Link
              href={activeItem.name === "Paket Kafe dan Restoran" ? "/inspirasi/restoran-kafe" : activeItem.href}
              aria-label={`${data.ctaLabel}: ${activeItem.name}`}
              className="group mt-auto flex min-h-12 items-center justify-between gap-4 pt-8 text-sm font-extrabold text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
            >
              <span className="border-b border-ochre-500 pb-2">{data.ctaLabel}</span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ochre-600/50 text-ochre-700 transition-all duration-300 group-hover:border-ochre-500 group-hover:bg-ochre-500 group-hover:text-brand-950">
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </article>

          <div className="relative aspect-[4/3] min-h-[24rem] overflow-hidden bg-[#e9dfd0] xl:aspect-auto xl:min-h-[36rem]">
            {data.items.map((item, index) => (
              <Image
                key={`${item.name}-visual`}
                src={visualFor(item, index)}
                alt={`Tampilan seragam ${item.name}`}
                fill
                sizes="(max-width: 1279px) 100vw, 44vw"
                loading={index === 0 ? "eager" : "lazy"}
                className={`object-cover object-center transition-[opacity,transform] duration-500 motion-reduce:transition-none ${
                  index === activeIndex ? "scale-100 opacity-100" : "pointer-events-none scale-[1.015] opacity-0"
                }`}
              />
            ))}
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
