"use client";

// src/components/home/HeroCarousel.tsx
// Hero as a real carousel: the WHOLE hero content — eyebrow, headline, subhead,
// CTAs, trust chips, and the right-hand panel — rotates together across slides,
// with dot + arrow navigation under the copy. This is the "slide" the approved
// screenshots depict (not a single rotating card).
//
// Slides (per approved screenshots):
//  0 · Seragam Ready Stock (B2B core)      → "Paket Bengkel" example card
//  1 · Gajian Sale (promo)                 → navy "20% OFF" promo card
//  2 · Koleksi Baru (Kemeja Lapangan)      → "NEW ARRIVAL" icon product card
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
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  PackageCheck,
  RotateCcw,
  Scissors,
  Shield,
  Shirt,
  Sparkles,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { OfistantOpenButton } from "./OfistantOpenButton";

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

/* --------------------------------- types --------------------------------- */

type Chip = { icon: LucideIcon; label: string };

type Cta =
  | { kind: "link"; href: string; label: string; variant: "primary" | "secondary"; icon?: LucideIcon }
  | { kind: "ofistant"; variant: "primary" | "secondary" };

type PkgItem = { name: string; tag: string; color: string };

type PackagePanel = {
  type: "package";
  badge: LucideIcon;
  title: string;
  meta: string;
  items: PkgItem[];
  pill: string;
};

type ProductPanel = {
  type: "product";
  icon: LucideIcon;
  name: string;
  subtitle: string;
  features: string[];
};

type PromoPanel = {
  type: "promo";
  label: string;
  off: string;
  sub: string;
  code: string;
  validity: string;
};

type Panel = PackagePanel | ProductPanel | PromoPanel;

type Slide = {
  eyebrow: { icon: LucideIcon; text: string };
  title: ReactNode;
  subhead: string;
  ctas: Cta[];
  chips: Chip[];
  panel: Panel;
};

/* --------------------------------- data ---------------------------------- */

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

const SLIDES: Slide[] = [
  {
    eyebrow: { icon: Sparkles, text: "Ready Stock · Siap Bordir Logo · B2B" },
    title: (
      <>
        Seragam Ready Stock, Siap Bordir Logo.{" "}
        <span className="text-ochre-300">Bisnis Anda Naik Kelas</span> dalam 2–4 Hari.
      </>
    ),
    subhead:
      "Tanpa tunggu jahit berminggu-minggu. Ofissio menyediakan seragam kerja ready stock berkualitas — tinggal bordir logo usaha Anda, selesai dan siap kirim dalam 2–4 hari. Mulai 8 pcs untuk bisnis yang sedang tumbuh, hingga pengadaan korporasi ribuan pcs.",
    ctas: [
      { kind: "link", variant: "primary", href: "/catalog", label: "Lihat Paket Seragam", icon: ArrowRight },
      { kind: "ofistant", variant: "secondary" },
    ],
    chips: [
      { icon: PackageCheck, label: "Mulai dari 8 Pcs" },
      { icon: Scissors, label: "Siap Bordir Logo" },
      { icon: Users, label: "Untuk Semua Skala Bisnis" },
      { icon: RotateCcw, label: "Reorder Mudah" },
    ],
    panel: {
      type: "package",
      badge: Wrench,
      title: "Paket Bengkel",
      meta: "Polo + kemeja kerja · siap bordir",
      items: [
        { name: "Polo Staff", tag: "Cotton pique · bordir dada", color: "#142766" },
        { name: "Kemeja Kerja", tag: "Oxford · bordir lengan opsional", color: "#324382" },
      ],
      pill: "8 pcs · 48 jam",
    },
  },
  {
    eyebrow: { icon: Gift, text: "Promo Toko · Periode Terbatas" },
    title: (
      <>
        Gajian Sale — Diskon hingga <span className="text-ochre-300">20%</span> Semua Polo &amp; Kemeja
        Kerja.
      </>
    ),
    subhead:
      "Waktunya lengkapi seragam tim tanpa menunggu budget besar. Berlaku untuk semua warna dan ukuran ready stock — tetap bisa langsung bordir logo, tetap selesai 2–4 hari.",
    ctas: [
      { kind: "link", variant: "primary", href: "/catalog", label: "Belanja Sekarang", icon: ArrowRight },
      { kind: "link", variant: "secondary", href: "/catalog", label: "Lihat Semua Promo" },
    ],
    chips: [
      { icon: Boxes, label: "Semua Ukuran Ready" },
      { icon: Scissors, label: "Tetap Bisa Bordir Logo" },
      { icon: Clock, label: "Selesai 2–4 Hari" },
    ],
    panel: {
      type: "promo",
      label: "Gajian Sale",
      off: "20% OFF",
      sub: "Polo staff & kemeja kerja pilihan, selama periode promo atau selama stok tersedia.",
      code: "GAJIANOFISSIO",
      validity: "Berlaku 25 Agu – 5 Sep 2026 • S&K berlaku",
    },
  },
  {
    eyebrow: { icon: Sparkles, text: "Baru di Ofissio Store" },
    title: (
      <>
        Koleksi Baru: Kemeja Lapangan Tahan Cuaca —{" "}
        <span className="text-ochre-300">Ready Stock Semua Ukuran.</span>
      </>
    ),
    subhead:
      "Dirancang untuk tim yang bekerja di luar ruangan: bahan tahan cuaca, jahitan kuat, dan tetap siap bordir logo. Tersedia S–3XL, langsung kirim dari gudang kami.",
    ctas: [
      { kind: "link", variant: "primary", href: "/catalog", label: "Lihat Koleksi", icon: ArrowRight },
      { kind: "ofistant", variant: "secondary" },
    ],
    chips: [
      { icon: Boxes, label: "S–3XL Ready" },
      { icon: Shield, label: "Tahan Cuaca & Abrasi" },
      { icon: Scissors, label: "Siap Bordir Logo" },
    ],
    panel: {
      type: "product",
      icon: Shirt,
      name: "Kemeja Lapangan Ofissio",
      subtitle: "Ripstop tahan cuaca · bordir dada & lengan",
      features: [
        "Ready stock, langsung dari gudang",
        "Bordir logo selesai 2–4 hari",
        "Reorder mudah saat tim bertambah",
      ],
    },
  },
];

const AUTO_ADVANCE_MS = 6000;

/* ------------------------------ slide pieces ------------------------------ */

function CtaButton({ cta }: { cta: Cta }) {
  if (cta.kind === "ofistant") {
    return <OfistantOpenButton className={cta.variant === "primary" ? PRIMARY_CTA : SECONDARY_CTA} />;
  }
  const Icon = cta.icon;
  return (
    <Link href={cta.href} className={cta.variant === "primary" ? PRIMARY_CTA : SECONDARY_CTA}>
      {cta.variant === "primary" ? (
        <>
          {cta.label}
          {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        </>
      ) : (
        <>
          {Icon ? <Icon className="h-4 w-4 text-ochre-300" aria-hidden="true" /> : null}
          {cta.label}
        </>
      )}
    </Link>
  );
}

function PackagePanel({ panel }: { panel: PackagePanel }) {
  const Badge = panel.badge;
  return (
    <div className="relative mx-auto w-full max-w-[24rem]">
      {/* Floating proof chips — translucent glass pills that read against the video */}
      <span className="absolute -top-3 right-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-base font-extrabold text-white backdrop-blur-md">
        <Tag className="h-3.5 w-3.5 text-ochre-300" strokeWidth={2.2} aria-hidden="true" />
        Siap Logo
      </span>
      <span className="absolute -bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-base font-extrabold text-white backdrop-blur-md">
        <RotateCcw className="h-3.5 w-3.5 text-ochre-300" strokeWidth={2.2} aria-hidden="true" />
        Reorder
      </span>
      <span className="absolute bottom-16 -right-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-base font-extrabold text-white backdrop-blur-md">
        <Boxes className="h-3.5 w-3.5 text-ochre-300" strokeWidth={2.2} aria-hidden="true" />
        Mulai 8 pcs
      </span>

      <div className={`${GLASS_CARD} border border-white/15 p-5`}>
        {/* Head */}
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/10 text-ochre-300">
            <Badge className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <div className="text-xl font-extrabold leading-tight text-white">
              {panel.title}
              <span className="font-bold text-white/60"> — contoh</span>
            </div>
            <div className="text-base font-semibold text-white/65">{panel.meta}</div>
          </div>
        </div>

        {/* Product sample rows */}
        {panel.items.map((it, idx) => (
          <div
            key={it.name}
            className={`flex items-center gap-3.5 py-3.5 ${
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
              <div className="text-lg font-bold leading-tight text-white">{it.name}</div>
              <div className="text-base font-semibold text-white/65">{it.tag}</div>
            </div>
          </div>
        ))}

        {/* Footer — logo + lead-time promise */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dashed border-ochre-400 text-ochre-300">
              <Sparkles className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-bold leading-tight text-white">Logo usaha Anda</div>
              <div className="text-[11px] font-semibold text-white/60">bordir presisi · tahan cucian</div>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-ochre-400 px-3 py-1 text-sm font-extrabold text-brand-950">
            {panel.pill}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProductPanel({ panel, active, reduce }: { panel: ProductPanel; active: boolean; reduce: boolean }) {
  const Icon = panel.icon;
  return (
    <div className="relative mx-auto w-full max-w-[24rem]">
      <span className="absolute -top-3 left-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-ochre-300/40 bg-ochre-400/90 px-3 py-1.5 text-base font-extrabold text-brand-950 backdrop-blur-md shadow-soft-md">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
        New Arrival
      </span>

      {/* Portrait glass card — the KK-006 uniform renders as a real 3D model so
          the "New Arrival" example reads large and premium. The stacked grid
          sizes to this (tallest) panel; shorter panels sit top-aligned in the
          same cell, so hero height stays stable across slides. The Canvas is
          transparent and gated — it only spins when this slide is active and
          motion is allowed, so a hidden slide burns no RAF. */}
      <div className={`${GLASS_CARD} overflow-hidden border border-white/15`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-white/5 ring-1 ring-inset ring-white/10">
          {/* Faint icon sits behind the model as a subtle motif + a progressive
              visual while the 3D chunk/model streams in. */}
          <Icon
            className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 text-white/10"
            strokeWidth={1}
            aria-hidden="true"
          />
          <div className="absolute inset-0">
            <Product3D url="/3d/kk-006-mini.glb" active={active} autoRotate={!reduce} />
          </div>
        </div>
        <div className="p-5">
          <div className="text-xl font-extrabold leading-tight text-white">{panel.name}</div>
          <div className="text-base font-semibold text-white/65">{panel.subtitle}</div>
          <ul className="mt-3 space-y-1.5">
            {panel.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-base font-medium text-white/75">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ochre-300" strokeWidth={2.4} aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PromoPanel({ panel }: { panel: PromoPanel }) {
  return (
    <div className="relative mx-auto w-full max-w-[24rem]">
      {/* Ochre-tinted glass edge marks this as the promo card (vs. the white-edged
          package/product panels) — still translucent so the video reads through. */}
      <div className={`${GLASS_CARD} border border-ochre-400/30 p-6`}>
        <div className="text-base font-extrabold uppercase tracking-[0.18em] text-ochre-300">
          {panel.label}
        </div>
        <div className="mt-2 text-7xl font-extrabold leading-none tracking-tight text-white">
          {panel.off}
        </div>
        <p className="mt-3 text-lg leading-relaxed text-white/75">{panel.sub}</p>
        <div className="mt-4 flex items-center gap-2.5">
          <span className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-lg font-bold tracking-wide text-white">
            {panel.code}
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide text-white/55">kode promo</span>
        </div>
        <div className="mt-4 flex items-center gap-1.5 border-t border-white/15 pt-3 text-sm font-medium text-white/60">
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

export function HeroCarousel() {
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

  const go = useCallback((i: number) => setActive((i + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      if (!paused.current) setActive((a) => (a + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <section
      className="relative flex min-h-[92svh] w-full items-center overflow-hidden bg-[#070d1c]"
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

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]">
          {/* Left: stacked rotating copy. All slides share one grid cell so the
              column height is constant (= tallest slide); only opacity swaps. */}
          <div className="max-w-3xl">
            <div className="grid" aria-live="polite" role="group" aria-label="Sorotan Ofissio">
              {SLIDES.map((s, i) => {
                const on = i === active;
                return (
                  <div
                    key={i}
                    // `inert` makes inactive slides non-focusable + hidden from AT.
                    inert={!on ? true : undefined}
                    aria-hidden={on ? undefined : "true"}
                    className={layerClasses(on, reduce)}
                  >
                    <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white">
                      <s.eyebrow.icon className="h-3.5 w-3.5 text-ochre-300" aria-hidden="true" />
                      {s.eyebrow.text}
                    </span>

                    <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white [text-shadow:0_2px_22px_rgba(7,13,28,0.55)] sm:text-5xl lg:text-[4.25rem]">
                      {s.title}
                    </h1>

                    <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/90 [text-shadow:0_2px_14px_rgba(7,13,28,0.6)] sm:text-2xl">
                      {s.subhead}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      {s.ctas.map((cta, ci) => (
                        <CtaButton key={ci} cta={cta} />
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2.5">
                      {s.chips.map((c) => (
                        <span
                          key={c.label}
                          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-brand-900/70 px-3.5 py-2 text-xs font-bold text-white shadow-soft-sm"
                        >
                          <c.icon className="h-3.5 w-3.5 text-white/70" strokeWidth={2} aria-hidden="true" />
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel navigation — dots + prev/next (persistent, outside the stacked stage) */}
            <div className="mt-8 flex items-center gap-3" role="group" aria-label="Navigasi slide">
              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label="Slide sebelumnya"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1.5">
                {SLIDES.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Slide ${i + 1} dari ${SLIDES.length}: ${s.eyebrow.text}`}
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
          <div className="hidden lg:block">
            <div className="grid items-center">
              {SLIDES.map((s, i) => {
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
