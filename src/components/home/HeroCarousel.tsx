"use client";

// src/components/home/HeroCarousel.tsx
// Hero as a real carousel: the WHOLE hero content — eyebrow, headline, subhead,
// CTAs, trust chips, and the right-hand panel — rotates together across slides,
// with dot + arrow navigation under the copy. This is the "slide" the approved
// screenshots depict (not a single rotating card).
//
// The slide DATA (copy, icons, panel fields, the 3D path) now arrives as a
// `slides` prop (validated by the site-content registry + sourced from
// /admin/site-content). What stays CODE here: layout, motion, the CTA arrow
// glyph, and the decorative motifs (feature ticks, floating proof chips, the
// "New Arrival" / "Siap Logo" badges) — those are presentation, not marketing
// copy. Icons in the data are string keys resolved through `resolveHomepageIcon`
// (the constrained allowlist); a bad key falls back to Sparkles, never throws.
//
// Height stability: every slide is rendered into the SAME grid cell
// (col-start-1 row-start-1) in both the copy column and the panel column, so
// each grid track sizes once to its TALLEST slide. Slides crossfade via opacity,
// so the hero height never changes between slides — no page jank. Inactive
// slides are `inert` (not focusable, hidden from AT) and opacity-0.
//
// Behaviour:
//  • Auto-advances every 6s; pauses on hover/focus.
//  • Respects prefers-reduced-motion (no auto-advance, instant opacity swap).
//  • Keyboard: dots + arrows are real buttons; arrow keys move slides when the
//    carousel region is focused.
//  • Desktop shows the right-hand panel (hidden lg:block); mobile keeps the
//    rotating copy + CTAs + dots/arrows.
//
// Craft floor: translucent panels over the hero video — a light tint + a
// two-layer text-shadow carry legibility (NO backdrop-blur: the slides
// crossfade via opacity on their wrapper, and backdrop-filter drops out
// mid-fade because it can't sample through an opacity-grouped ancestor, so a
// blur would flicker "clear"→"frosted" on every slide change), 1px white/15 edges,
// soft shadow, ochre accents, lucide icons (no emoji, no gradient text). The
// dark hero video stays (premium backdrop); copy sits on a darkened left
// overlay; panels are translucent so the video reads through them. The New
// Arrival panel is portrait so the uniform sample reads large.

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { OfistantOpenButton } from "./OfistantOpenButton";
import { resolveHomepageIcon } from "@/features/site-content/icon-registry";
import type {
  HeroCta,
  HeroPackagePanel,
  HeroProductPanel,
  HeroPromoPanel,
  HeroSlide,
  TextSegment,
  TrustStat,
} from "@/features/site-content/content.schema";

/* The three.js renderer is split into its own client chunk and loaded
 * client-side only (ssr: false) so it never weighs down the initial bundle.
 * Dark-theme spinner matches the glass panel it sits inside. */
const Product3D = dynamic(() => import("./ProductCategory3D").then((m) => m.ProductCategory3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-ochre-300" />
    </div>
  ),
});

/* --------------------------------- styles -------------------------------- */

const PRIMARY_CTA =
  "inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-brand-900 transition-all hover:-translate-y-px hover:bg-slate-100 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const SECONDARY_CTA =
  "inline-flex min-h-12 items-center gap-2.5 rounded-xl border border-white/35 bg-transparent px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-px hover:border-ochre-400 hover:bg-[#07101e]/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const HERO_BENEFIT =
  "inline-flex min-h-11 items-center gap-2.5 rounded-full border border-white/25 bg-[#07101e]/55 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_rgba(3,9,20,0.16)]";

const AUTO_ADVANCE_MS = 6000;

/* ------------------------------ slide pieces ------------------------------ */

/** Segmented hero headline: each fragment is plain text unless `highlight` is
 *  set, in which case it takes this section's fixed ochre tint. The color is
 *  code-owned (a design decision), never stored — marketing only toggles WHICH
 *  fragments pop. Mirrors the `Headline` helper in HomePage.tsx. */
function HeroHeadline({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        const previousText = segments[index - 1]?.text ?? "";
        const needsLeadingSpace =
          index > 0 &&
          !/\s$/.test(previousText) &&
          !/^[\s.,!?;:)]/.test(segment.text);

        return (
          <span key={index} className={segment.highlight ? "text-ochre-400" : undefined}>
            {needsLeadingSpace ? " " : null}
            {segment.text}
          </span>
        );
      })}
    </>
  );
}

function CtaButton({ cta }: { cta: HeroCta }) {
  if (cta.kind === "ofistant") {
    return (
      <OfistantOpenButton
        className={cta.variant === "primary" ? PRIMARY_CTA : SECONDARY_CTA}
        label={cta.label}
      />
    );
  }
  // The CTA arrow glyph is presentation, not marketing copy, so it stays CODE
  // (lives on primary link CTAs only — secondary links read label-only).
  return (
    <Link href={cta.href} className={cta.variant === "primary" ? PRIMARY_CTA : SECONDARY_CTA}>
      {cta.variant === "primary" ? (
        <>
          {cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      ) : (
        cta.label
      )}
    </Link>
  );
}

function PackagePanel({ panel }: { panel: HeroPackagePanel }) {
  const Badge = resolveHomepageIcon(panel.badge);
  const legacyPackageImages = [
    "/products/hero-polo-staff-navy.png",
    "/products/kk-006/KK-006-front-nobg.webp",
  ] as const;

  return (
    <div className="min-w-0 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-400">
        <Badge className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" />
        {panel.title}
      </div>
      <div className="mt-2 text-2xl font-extrabold leading-tight">
        {panel.items.map((item) => item.name).join(" + ")}
      </div>
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-white/90">{panel.meta}</p>
      <div className="mt-3 flex items-end gap-5" aria-label="Contoh produk dalam paket">
        {panel.items.map((item, index) => {
          const imageSrc = item.image || legacyPackageImages[index];
          return (
            <figure key={item.name} className="flex w-28 min-w-0 flex-col items-center gap-1.5">
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt={item.name}
                  width={128}
                  height={136}
                  className="h-28 w-auto max-w-28 object-contain brightness-110 contrast-105 drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]"
                  sizes="112px"
                  priority
                />
              ) : (
                <span className="grid h-28 w-24 place-items-center rounded-xl border border-dashed border-white/30 bg-[#07101e]/45 text-ochre-400">
                  <Badge className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
                  <span className="sr-only">Foto {item.name} belum tersedia</span>
                </span>
              )}
              <figcaption className="text-center text-sm font-bold leading-tight text-white">
                {item.name}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-bold text-ochre-300">
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        Siap bordir logo
        <span className="font-semibold text-white/90">, {panel.pill}</span>
      </div>
    </div>
  );
}

function ProductPanel({
  panel,
  active,
  reduce,
}: {
  panel: HeroProductPanel;
  active: boolean;
  reduce: boolean;
}) {
  const Icon = resolveHomepageIcon(panel.icon);
  return (
    <div className="min-w-0 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-400">
        <Sparkles className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        New Arrival
      </div>
      {panel.glb ? (
        <div className="relative -ml-4 mt-1 h-48 w-[calc(100%+1rem)] max-w-[18rem] overflow-hidden">
          <Product3D url={panel.glb} active={active} autoRotate={!reduce} />
        </div>
      ) : (
        <Icon className="mt-3 h-12 w-12 text-ochre-400" strokeWidth={1.4} aria-hidden="true" />
      )}
      <div className="mt-1 text-xl font-extrabold leading-tight">{panel.name}</div>
      <p className="mt-1 text-sm font-medium leading-relaxed text-white/90">{panel.subtitle}</p>
      <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-ochre-300">
        <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        {panel.features[0]}
      </div>
    </div>
  );
}

function PromoPanel({ panel }: { panel: HeroPromoPanel }) {
  return (
    <div className="min-w-0 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-400">{panel.label}</div>
      <div className="mt-2 text-[clamp(2.25rem,3vw,3rem)] font-extrabold leading-none tracking-[-0.04em]">
        {panel.off}
      </div>
      <p className="mt-2 text-sm font-medium leading-relaxed text-white/90">{panel.sub}</p>
      <div className="mt-3 text-sm font-semibold text-white/80">
        Kode: <strong className="font-extrabold tracking-wide text-ochre-300">{panel.code}</strong>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs font-medium text-white/65">
        <Clock className="h-3.5 w-3.5 text-ochre-400" strokeWidth={2} aria-hidden="true" />
        {panel.validity}
      </div>
    </div>
  );
}

/** Copy-column layer classes — all slides share one grid cell so the track
 *  sizes to the tallest; the active slide crossfades in. The transition is
 *  opacity + a hair of scale and vertical drift on a slow easeOutQuint, so each
 *  slide settles instead of hard-cutting. Reduced motion snaps. Only opacity +
 *  transform-derived props animate (compositor-only, no layout thrash). This is
 *  safe for the copy column because it holds NO backdrop-filter — the panel
 *  column uses cardLayerClasses instead, since a backdrop-filter cannot ride an
 *  opacity fade. */
function layerClasses(active: boolean, reduce: boolean) {
  return [
    "col-start-1 row-start-1",
    reduce
      ? ""
      : "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
    active
      ? "opacity-100 scale-100 translate-y-0"
      : "opacity-0 pointer-events-none scale-[1.04] translate-y-2",
  ].join(" ");
}

/** Panel-column layer classes — same stacked-grid trick, but the cards carry a
 *  real backdrop-filter (frost glass), which BREAKS under an opacity<1 ancestor:
 *  the blur samples an empty offscreen backdrop and drops out mid-fade (the
 *  "clear→frosted" flicker). So opacity is excluded from the transition and
 *  snaps 0↔1 in a single frame — no fractional-opacity frame ever holds a
 *  backdrop-filter — while a pure vertical drift carries the motion on the same
 *  slow easeOutQuint (translate is the backdrop-safe transform; the video behind
 *  barely shifts). The card therefore appears at full opacity and settles up
 *  into place, with zero flicker. Reduced motion snaps. */
function cardLayerClasses(active: boolean, reduce: boolean) {
  return [
    "col-start-1 row-start-1",
    reduce
      ? ""
      : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
    active
      ? "opacity-100 translate-y-0"
      : "opacity-0 pointer-events-none translate-y-2",
  ].join(" ");
}

/* -------------------------------- carousel -------------------------------- */

function HeroTrustRail({
  items,
  context,
  compact = false,
}: {
  items: TrustStat[];
  context: ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="border-t border-white/15 pt-5 text-white">
        <div className="mb-5 border-l-2 border-ochre-400 pl-4">{context}</div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {items.map((item) => {
            const Icon = resolveHomepageIcon(item.icon);
            return (
              <div key={item.label} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ochre-400/55 bg-[#07101e]/75 text-ochre-400">
                  <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </span>
                <span className="min-w-0 pt-0.5">
                  <strong className="block text-xl font-bold tabular-nums">{item.value}</strong>
                  <span className="mt-1 block text-[15px] font-semibold leading-relaxed text-white/90">{item.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-center gap-4 text-white">
      <span aria-hidden="true" className="absolute bottom-7 left-5 top-7 w-px bg-ochre-400/55" />
      <div className="relative flex items-start gap-4 pb-1">
        <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ochre-400 bg-[#07101e]/80 text-sm font-extrabold tabular-nums text-ochre-300 shadow-[0_0_0_5px_rgba(7,16,30,0.35)]">
          01
        </span>
        <div className="min-w-0 flex-1 pt-0.5">{context}</div>
      </div>
      {items.map((item, index) => {
        const Icon = resolveHomepageIcon(item.icon);
        return (
          <div key={item.label} className="relative flex items-center gap-4">
            <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ochre-400/70 bg-[#07101e]/80 text-xs font-extrabold tabular-nums text-ochre-300 shadow-[0_0_0_5px_rgba(7,16,30,0.35)]">
              {String(index + 2).padStart(2, "0")}
            </span>
            <span className="flex min-w-0 items-start gap-3 pt-0.5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ochre-400" strokeWidth={2.1} aria-hidden="true" />
              <span>
                <strong className="block text-xl font-bold text-white tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
                  {item.value}
                </strong>
                <span className="mt-1 block text-[15px] font-semibold leading-relaxed text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]">
                  {item.label}
                </span>
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function HeroCarousel({
  slides,
  trustItems,
  videoSrc,
}: {
  slides: HeroSlide[];
  trustItems: TrustStat[];
  videoSrc: string;
}) {
  const [active, setActive] = useState(0);
  const [reduce, setReduce] = useState(false);
  const paused = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const go = useCallback((i: number) => setActive((i + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      if (!paused.current) setActive((a) => (a + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [reduce, slides.length]);

  const contextualRail = (
    <div className="grid">
      {slides.map((slide, index) => {
        const isActive = index === active;
        return (
          <div
            key={index}
            inert={!isActive ? true : undefined}
            aria-hidden={isActive ? undefined : "true"}
            className={cardLayerClasses(isActive, reduce)}
          >
            {slide.panel.type === "package" ? (
              <PackagePanel panel={slide.panel} />
            ) : slide.panel.type === "product" ? (
              <ProductPanel panel={slide.panel} active={isActive} reduce={reduce} />
            ) : (
              <PromoPanel panel={slide.panel} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      className="relative flex min-h-[min(620px,100svh)] w-full items-center overflow-hidden bg-[#070d1c] sm:min-h-[clamp(620px,88svh,900px)]"
      aria-roledescription="carousel"
      aria-label="Sorotan Ofissio"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(active - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(active + 1);
        }
      }}
    >
      {/* Video background — kept clear across the product area; contrast is
          concentrated behind the copy instead of tinting the whole frame. */}
      <video
        key={videoSrc || "/hero-workers.mp4"}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover brightness-[1.08] contrast-[1.04] saturate-[1.04]"
      >
        <source
          src={videoSrc || "/hero-workers.mp4"}
          type={(videoSrc || "/hero-workers.mp4").toLowerCase().includes(".webm") ? "video/webm" : "video/mp4"}
        />
      </video>
      <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(3,7,18,0.68)_0%,rgba(3,7,18,0.44)_44%,rgba(3,7,18,0.16)_78%,rgba(3,7,18,0)_100%)] sm:w-[72%] xl:w-[64%]" />
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-[clamp(3rem,7vh,5rem)] sm:px-6 lg:px-[clamp(1.5rem,3vw,3rem)]">
        <div className="grid items-center gap-[clamp(2rem,4vw,5rem)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.38fr)]">
          {/* Left: stacked rotating copy. All slides share one grid cell so the
              column height is constant (= tallest slide); only opacity swaps. */}
          <div className="min-w-0 max-w-3xl">
            <div className="grid" aria-live="polite" role="group" aria-label="Sorotan Ofissio">
              {slides.map((s, i) => {
                const on = i === active;
                const EyebrowIcon = resolveHomepageIcon(s.eyebrowIcon);
                return (
                  <div
                    key={i}
                    // `inert` makes inactive slides non-focusable + hidden from AT.
                    inert={!on ? true : undefined}
                    aria-hidden={on ? undefined : "true"}
                    className={layerClasses(on, reduce)}
                  >
                    <span className="mb-[clamp(1rem,2.5vh,1.5rem)] inline-flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white">
                      <EyebrowIcon className="h-3.5 w-3.5 text-ochre-300" aria-hidden="true" />
                      <span aria-hidden="true" className="h-px w-8 bg-ochre-400" />
                      {s.eyebrowText}
                    </span>

                    <h1 className="max-w-[15ch] text-[clamp(2.35rem,3.7vw,3.75rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-white [text-shadow:0_2px_22px_rgba(7,13,28,0.55)]">
                      <HeroHeadline segments={s.title} />
                    </h1>

                    <p className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-xl text-[clamp(1rem,1.35vw,1.25rem)] leading-[1.65] text-white/90 [text-shadow:0_2px_14px_rgba(7,13,28,0.6)]">
                      {s.subhead}
                    </p>

                    <div className="mt-[clamp(1.25rem,3vh,2rem)] flex flex-wrap gap-3">
                      {s.ctas.map((cta, ci) => (
                        <CtaButton key={ci} cta={cta} />
                      ))}
                    </div>

                    <div className="mt-[clamp(1rem,2.5vh,2rem)] flex flex-wrap gap-2.5">
                      {s.chips
                        .filter((chip) => !/(?:^|\s)8\s*pcs|2\s*[--]\s*4\s*hari/i.test(chip.label))
                        .slice(0, 2)
                        .map((c) => {
                        const ChipIcon = resolveHomepageIcon(c.icon);
                        return (
                          <span
                            key={c.label}
                            className={HERO_BENEFIT}
                          >
                            <ChipIcon className="h-4 w-4 shrink-0 text-ochre-400" strokeWidth={2.1} aria-hidden="true" />
                            {c.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel navigation — dots + prev/next (persistent, outside the stacked stage) */}
            <div className="mt-[clamp(1rem,2.5vh,2rem)] flex items-center gap-3" role="group" aria-label="Navigasi slide">
              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label="Slide sebelumnya"
                className="grid h-12 w-12 place-items-center rounded-full border border-white/35 bg-[#07101e]/35 text-white transition-colors hover:border-ochre-400 hover:bg-[#07101e]/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Slide ${i + 1} dari ${slides.length}: ${s.eyebrowText}`}
                    aria-current={i === active ? "true" : undefined}
                    className="group grid h-11 min-w-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === active ? "w-7 bg-ochre-400" : "w-2 bg-white/45 group-hover:bg-white/70"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label="Slide berikutnya"
                className="grid h-12 w-12 place-items-center rounded-full border border-white/35 bg-[#07101e]/35 text-white transition-colors hover:border-ochre-400 hover:bg-[#07101e]/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 xl:hidden">
              <HeroTrustRail items={trustItems} context={contextualRail} compact />
            </div>
          </div>

          {/* The selected Preview 1 system: contextual slide content is step 01,
              followed by the four persistent trust facts on one open rail. */}
          <aside className="hidden self-stretch xl:flex xl:items-center" aria-label="Keunggulan Ofissio">
            <HeroTrustRail items={trustItems} context={contextualRail} />
          </aside>
        </div>
      </div>
    </section>
  );
}
