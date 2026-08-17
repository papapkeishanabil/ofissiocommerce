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
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shirt,
  Sparkles,
  Tag,
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
  "inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-brand-900 transition-all hover:-translate-y-px hover:bg-slate-100 hover:shadow-lg";
const SECONDARY_CTA =
  "inline-flex items-center gap-2 rounded-xl border border-white/30 bg-brand-950/45 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-ochre-300 hover:bg-brand-900/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Frost-glass panel over the hero video: a mid tint (~45%) + real backdrop
 *  blur carry the glass, and a two-layer inherited text-shadow (tight dark edge
 *  + soft glow) keeps copy legible over any frame. backdrop-filter is back by
 *  request — and it is safe here ONLY because the panel column never fades
 *  opacity: opacity is excluded from its transition and snaps 0↔1 in one frame,
 *  so no fractional-opacity frame ever holds a backdrop-filter (that mid-state
 *  is exactly what flickered "clear→frosted" before). See cardLayerClasses. The
 *  copy column has no backdrop-filter and crossfades normally via layerClasses.
 *  Each panel owns its border color; roots cap width to max-w-[24rem] and
 *  center, so every card reads as a compact near-square, not a wide bar. */
const GLASS_CARD =
  "rounded-2xl bg-brand-950/45 backdrop-blur-xl shadow-soft-lg [text-shadow:0_1px_2px_rgba(7,13,28,0.85),0_2px_14px_rgba(7,13,28,0.55)]";

const AUTO_ADVANCE_MS = 6000;

/* ------------------------------ slide pieces ------------------------------ */

/** Segmented hero headline: each fragment is plain text unless `highlight` is
 *  set, in which case it takes this section's fixed ochre tint. The color is
 *  code-owned (a design decision), never stored — marketing only toggles WHICH
 *  fragments pop. Mirrors the `Headline` helper in HomePage.tsx. */
function HeroHeadline({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => (
        <span key={index} className={segment.highlight ? "text-ochre-300" : undefined}>
          {segment.text}
        </span>
      ))}
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
  return (
    <div className="relative mx-auto w-full max-w-[19rem] 2xl:max-w-[20rem]">
      {/* Floating proof chips — translucent glass pills that read against the video */}
      <span className="absolute -top-2.5 right-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-brand-950/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
        <Tag className="h-3.5 w-3.5 text-ochre-300" strokeWidth={2.2} aria-hidden="true" />
        Siap Logo
      </span>
      <div className={`${GLASS_CARD} border border-white/15 p-4`}>
        {/* Head */}
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/10 text-ochre-300">
            <Badge className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <div className="text-base font-extrabold leading-tight text-white">
              {panel.title}
              <span className="font-bold text-white/60"> — contoh</span>
            </div>
            <div className="mt-0.5 text-xs font-medium text-white/60">{panel.meta}</div>
          </div>
        </div>

        {/* Product sample rows */}
        {panel.items.map((it, idx) => (
          <div
            key={it.name}
            className={`flex items-center gap-3 py-2.5 ${
              idx < panel.items.length - 1 ? "border-b border-dashed border-white/10" : ""
            }`}
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white ring-1 ring-inset ring-white/15"
              style={{ background: it.color }}
            >
              <Shirt className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-bold leading-tight text-white">{it.name}</div>
              <div className="mt-0.5 text-[11px] font-medium text-white/60">{it.tag}</div>
            </div>
          </div>
        ))}

        {/* Footer — logo + lead-time promise */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-ochre-400 text-ochre-300">
              <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-bold leading-tight text-white">Logo usaha Anda</div>
              <div className="text-[11px] font-semibold text-white/60">bordir presisi · tahan cucian</div>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-ochre-400 px-2.5 py-1 text-[11px] font-extrabold text-brand-950">
            {panel.pill}
          </span>
        </div>
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
    <div className="relative mx-auto w-full max-w-[19rem] 2xl:max-w-[20rem]">
      <span className="absolute -top-2.5 left-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-ochre-300/40 bg-ochre-400 px-2.5 py-1 text-xs font-extrabold text-brand-950 shadow-soft-md">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
        New Arrival
      </span>

      {/* Portrait glass card — the uniform renders as a real 3D model so
          the "New Arrival" example reads large and premium. The stacked grid
          sizes to this (tallest) panel; shorter panels sit top-aligned in the
          same cell, so hero height stays stable across slides. The Canvas is
          transparent and gated — it only spins when this slide is active and
          motion is allowed, so a hidden slide burns no RAF. An empty `glb`
          path omits the model and leaves the faint icon motif behind. */}
      <div className={`${GLASS_CARD} overflow-hidden border border-white/15`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_68%)] ring-1 ring-inset ring-white/10">
          {/* Faint icon sits behind the model as a subtle motif + a progressive
              visual while the 3D chunk/model streams in. */}
          <Icon
            className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 text-white/10"
            strokeWidth={1}
            aria-hidden="true"
          />
          {panel.glb ? (
            <div className="absolute inset-0">
              <Product3D url={panel.glb} active={active} autoRotate={!reduce} />
            </div>
          ) : null}
        </div>
        <div className="p-4">
          <div className="text-base font-extrabold leading-tight text-white">{panel.name}</div>
          <div className="mt-1 text-xs font-medium text-white/60">{panel.subtitle}</div>
          <ul className="mt-3 space-y-1">
            {panel.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[11px] font-medium leading-4 text-white/70">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-ochre-300" strokeWidth={2.4} aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PromoPanel({ panel }: { panel: HeroPromoPanel }) {
  return (
    <div className="relative mx-auto w-full max-w-[19rem] 2xl:max-w-[20rem]">
      {/* Ochre-tinted glass edge marks this as the promo card (vs. the white-edged
          package/product panels) — still translucent so the video reads through. */}
      <div className={`${GLASS_CARD} border border-ochre-400/30 p-4`}>
        <div className="inline-flex items-center rounded-full bg-ochre-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ochre-300 ring-1 ring-inset ring-ochre-300/20">
          {panel.label}
        </div>
        <div className="mt-3 text-[clamp(2.75rem,3.5vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-white">
          {panel.off}
        </div>
        <p className="mt-2 text-xs leading-5 text-white/65">{panel.sub}</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-2.5">
          <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-extrabold tracking-wide text-white">
            {panel.code}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/45">kode promo</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-[11px] font-medium text-white/55">
          <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {panel.validity}
        </div>
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

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
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
      {/* Video background — workers in uniform; darkened overlay for copy contrast */}
      <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover">
        <source src="/hero-workers.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-[#070d1c]/70 via-[#070d1c]/30 to-[#070d1c]/35" />
      {/* Bottom fade — smooth transition to light sections below */}
      <div className="pointer-events-none absolute -bottom-px left-0 right-0 z-[1] h-40 bg-gradient-to-b from-transparent via-surface/60 to-surface" />

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-[clamp(3rem,7vh,5rem)] sm:px-6 lg:px-[clamp(1.5rem,3vw,3rem)]">
        <div className="grid items-center gap-[clamp(1.5rem,3vw,3rem)] xl:grid-cols-[minmax(0,1.22fr)_minmax(280px,0.78fr)]">
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
                    <span className="mb-[clamp(1rem,2.5vh,1.5rem)] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white">
                      <EyebrowIcon className="h-3.5 w-3.5 text-ochre-300" aria-hidden="true" />
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
                      {s.chips.map((c) => {
                        const ChipIcon = resolveHomepageIcon(c.icon);
                        return (
                          <span
                            key={c.label}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-brand-900/70 px-3.5 py-2 text-xs font-bold text-white shadow-soft-sm"
                          >
                            <ChipIcon className="h-3.5 w-3.5 text-white/70" strokeWidth={2} aria-hidden="true" />
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
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Slide ${i + 1} dari ${slides.length}: ${s.eyebrowText}`}
                    aria-current={i === active ? "true" : undefined}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label="Slide berikutnya"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Right: stacked rotating panel (desktop only). Same grid-cell trick
              keeps the panel column a constant height across slides. */}
          <div className="hidden min-w-0 xl:block xl:[&>div]:origin-center xl:[&>div]:scale-[0.92] 2xl:[&>div]:scale-100">
            <div className="grid items-center">
              {slides.map((s, i) => {
                const on = i === active;
                return (
                  <div
                    key={i}
                    inert={!on ? true : undefined}
                    aria-hidden={on ? undefined : "true"}
                    className={cardLayerClasses(on, reduce)}
                  >
                    {s.panel.type === "package" ? (
                      <PackagePanel panel={s.panel} />
                    ) : s.panel.type === "product" ? (
                      <ProductPanel panel={s.panel} active={on} reduce={reduce} />
                    ) : (
                      <PromoPanel panel={s.panel} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
