// src/components/home/TestimoniSection.tsx
//
// §08 — Testimoni Pembeli (kartu kutipan ulasan marketplace). Client
// component karena screenshot ulasan dibuka lewat lightbox (state + ESC +
// focus management). Konten datang dari site-content (admin-editable);
// nomor section, bintang, label platform, dan warna titik tetap milik kode.
//
// Section ini TIDAK dirender selama belum ada satu pun kartu yang
// dipublikasikan — nilai bawaan registri sengaja kosong agar homepage
// tidak pernah menampilkan ulasan contoh yang belum asli.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, ImageIcon, X } from "lucide-react";

import { HomeSectionMarker } from "./HomeSectionMarker";
import styles from "./TestimoniSection.module.css";
import type {
  TestimoniItem,
  TestimoniSectionData,
  TestimoniSource,
} from "@/features/site-content/content.schema";

/** Label + warna titik per platform. Data memilih SUMBER, kode memilih
 *  bentuknya — pola yang sama seperti className highlight headline. */
const SOURCE_META: Record<TestimoniSource, { label: string; dot: string }> = {
  tokopedia: { label: "Tokopedia", dot: "bg-[#42b549]" },
  shopee: { label: "Shopee", dot: "bg-[#ee4d2d]" },
  wa: { label: "WhatsApp", dot: "bg-[#1faf54]" },
  website: { label: "Situs Ofissio", dot: "bg-brand-600" },
};

function Stars({ rating }: { rating: TestimoniItem["rating"] }) {
  const filled = Number(rating);
  return (
    <span className="flex items-center gap-[3px]" role="img" aria-label={`${filled} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12 2.6l2.9 5.9 6.5.95-4.7 4.55 1.1 6.5L12 17.5l-5.8 3 1.1-6.5L2.6 9.45l6.5-.95z"
            className={i <= filled ? "fill-ochre-400" : "fill-line"}
          />
        </svg>
      ))}
    </span>
  );
}

export function TestimoniSection({ data, sectionNumber = "08" }: { data: TestimoniSectionData; sectionNumber?: string }) {
  const [shot, setShot] = useState<TestimoniItem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const reviewsId = useId();
  const items = data.items.filter((item) => !item.hidden);

  // Kosong = belum ada ulasan yang dipublikasikan: section tidak tampil.
  if (items.length === 0) return null;

  const showProofRow = data.proof.length > 0 || data.storeLinkHref.trim() !== "";
  const visibleItems = showAll ? items : items.slice(0, 6);
  const hiddenCount = Math.max(items.length - 6, 0);

  return (
    <section id="testimoni" className="scroll-reveal scroll-mt-24 bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="max-w-3xl">
          <HomeSectionMarker number={sectionNumber} label={data.eyebrow} />
          <h2 className="mt-6 text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-ink-strong sm:text-6xl lg:text-[4rem]">
            <TestimoniHeadline segments={data.headline} />
          </h2>
          {/* Jahitan feston + mata jarum — menggemakan motif jahitan §05;
              pengganti bar ochre solid milik section lain. */}
          <div aria-hidden className="mt-6 flex items-center">
            <span className="w-16 border-t-2 border-dashed border-ochre-500" />
            <span className="-ml-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-ochre-400" />
          </div>
          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-ink-muted sm:text-xl">{data.lede}</p>
        </div>

        {showProofRow ? (
          <div className="mt-10 flex flex-wrap items-center gap-2.5">
            {data.proof.map((chip) => (
              <span
                key={chip.source}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-muted px-3.5 py-2 text-sm text-ink-muted"
              >
                <span className={`h-[7px] w-[7px] rounded-full ${SOURCE_META[chip.source].dot}`} aria-hidden="true" />
                <span className="font-bold text-ink-strong">{SOURCE_META[chip.source].label}</span>
                <span className="inline-flex items-center gap-1 font-extrabold text-ochre-700">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-ochre-500" aria-hidden="true">
                    <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.55 1.1 6.5L12 17.5l-5.8 3 1.1-6.5L2.6 9.45l6.5-.95z" />
                  </svg>
                  {chip.score}
                </span>
                <span aria-hidden="true">,</span> {chip.count}
              </span>
            ))}
            {data.storeLinkHref.trim() !== "" ? (
              <Link
                href={data.storeLinkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group ml-1 inline-flex items-center gap-1.5 border-b-2 border-ochre-400 pb-0.5 text-sm font-bold text-brand-600 transition-colors hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                {data.storeLinkLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}

        <div id={reviewsId} className={styles.grid}>
          {visibleItems.map((item) => (
            <ReviewCard
              key={`${item.name}-${item.date}-${item.quote.slice(0, 12)}`}
              item={item}
              onScreenshot={() => setShot(item)}
            />
          ))}
        </div>

        {hiddenCount > 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-center text-sm text-ink-subtle">
              Menampilkan <span className="font-bold text-ink-strong">{visibleItems.length}</span> dari{" "}
              <span className="font-bold text-ink-strong">{items.length}</span> ulasan pelanggan.
            </p>
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls={reviewsId}
              onClick={() => setShowAll((current) => !current)}
              className={styles.showMore}
            >
              {showAll ? "Sembunyikan ulasan tambahan" : `Tampilkan ${hiddenCount} ulasan lainnya`}
              <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${showAll ? "rotate-[-90deg]" : "rotate-90"}`} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {shot ? <ScreenshotLightbox item={shot} onClose={() => setShot(null)} /> : null}
    </section>
  );
}

function ReviewCard({ item, onScreenshot }: { item: TestimoniItem; onScreenshot: () => void }) {
  const meta = SOURCE_META[item.source];
  const quoteId = useId();
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const quote = quoteRef.current;
    if (!quote || expanded) return;
    const measure = () => setCanExpand(quote.scrollHeight > quote.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(quote);
    return () => observer.disconnect();
  }, [expanded, item.quote]);

  return (
    <article className={styles.card}>
      <div className={styles.ratingRail}>
        <Stars rating={item.rating} />
        <span className={styles.source}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
          {meta.label}
        </span>
      </div>
      <div className={styles.content}>
        <div className={styles.buyer}>
          <span className={styles.name}>{item.name}</span>
          <span className={styles.date}>{item.date}</span>
        </div>
        <blockquote ref={quoteRef} id={quoteId} className={`${styles.quote} ${expanded ? styles.expanded : ""}`}>
          {item.quote}
        </blockquote>
        {canExpand ? (
          <button type="button" className={styles.readMore} aria-expanded={expanded} aria-controls={quoteId} onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Ringkas ulasan" : "Baca selengkapnya"}
            <ChevronDown size={16} className={expanded ? styles.rotated : undefined} aria-hidden="true" />
          </button>
        ) : null}
        {item.product || item.screenshot || item.link ? (
          <footer className={styles.cardFooter}>
            {item.product ? <span className={styles.product}>{item.product}</span> : null}
            <div className={styles.actions}>
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>
                  Lihat ulasan asli <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              ) : null}
              {item.screenshot ? (
                <button type="button" onClick={onScreenshot} className={styles.screenshot} aria-label={`Lihat screenshot asli ulasan ${item.name}`}>
                  <ImageIcon size={19} aria-hidden="true" />
                  Lihat screenshot asli
                </button>
              ) : null}
            </div>
          </footer>
        ) : null}
      </div>
    </article>
  );
}

/** Lightbox screenshot asli — dibuka dari kartu, ditutup via tombol, klik
 *  di luar frame, atau ESC. Fokus dipindah ke tombol tutup saat terbuka. */
function ScreenshotLightbox({ item, onClose }: { item: TestimoniItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const meta = SOURCE_META[item.source];

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), a[href]');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-950/75 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot ulasan ${item.name}`}
    >
      <button type="button" tabIndex={-1} aria-label="Tutup lightbox" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" />
      <div className="relative w-full max-w-[1200px]">
        <div className="mb-3 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Tutup
          </button>
        </div>
        <figure className="overflow-hidden rounded-2xl bg-surface shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 text-xs font-bold text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span className={`h-[7px] w-[7px] rounded-full ${meta.dot}`} aria-hidden="true" />
              {meta.label}
            </span>
            <span>Ulasan produk</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL screenshot dari host media eksternal (WordPress Media), rasio bebas */}
          <img
            src={item.screenshot}
            alt={`Screenshot ulasan asli ${item.name} di ${meta.label}`}
            className="block max-h-[72dvh] w-full bg-surface-muted object-contain"
          />
        </figure>
        <div className="mt-3 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-xs leading-relaxed text-white/75">
            Screenshot asli ulasan <span className="font-bold text-white">{item.name}</span> di {meta.label}
            {item.product ? ` (${item.product})` : ""}.
          </p>
          <a
            href={item.screenshot}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Buka ukuran asli
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

/** Segmented headline — logika spasi antar-fragmen sama dengan Headline di
 *  HomePage.tsx (potongan highlight mendapat warna ochre, milik section ini). */
function TestimoniHeadline({ segments }: { segments: TestimoniSectionData["headline"] }) {
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
          <span key={index} className={segment.highlight ? "text-ochre-400" : undefined}>
            {needsLeadingSpace ? " " : null}
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
