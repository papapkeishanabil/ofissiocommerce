"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { resolveHomepageIcon } from "@/features/site-content/icon-registry";
import type { IndustriGroup } from "@/features/site-content/content.schema";

// §02 Cocok untuk Berbagai Usaha — one group of industry tiles. Tiles carrying a
// `photo` render as photo cards (the featured subset); the remaining compact
// tiles sit behind an expand/collapse "Lihat semua" toggle. Data comes from
// site-content (admin-editable), routing via each tile's canonical Industry
// enum value.

const INDUSTRY_DOT_CLASS: Record<string, string> = {
  ochre: "bg-ochre-500",
  brand: "bg-brand-300",
};

// Featured cards carry the group's value props: a badge on the photo plus the
// same three checkmarked points under every tile in the group, so a row of
// cards reads as one offer with eight faces rather than eight claims. MOQ 8 pcs
// berlaku untuk semua grup — korporasi tidak dibedakan lewat volume.
const GROUP_BADGE: Record<IndustriGroup["dot"], string> = {
  ochre: "Ready Stock",
  brand: "Mulai 8 pcs",
};
const GROUP_POINTS: Record<IndustriGroup["dot"], string[]> = {
  ochre: ["Mulai 8 pcs", "Selesai bordir 2–4 hari", "Reorder fleksibel"],
  brand: ["Bordir multi-divisi", "Harga via penawaran resmi", "Reorder fleksibel"],
};

export function IndustriGroupCards({ group }: { group: IndustriGroup }) {
  const [expanded, setExpanded] = useState(false);
  // `photo` may be absent while a pre-"photo" cached/DB payload is still in
  // flight — treat missing as a compact tile so the section degrades to the
  // previous look instead of crashing.
  const hasPhoto = (tile: { photo?: string }) => (tile.photo ?? "").trim() !== "";
  const featured = group.tiles.filter(hasPhoto);
  const compact = group.tiles.filter((tile) => !hasPhoto(tile));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${INDUSTRY_DOT_CLASS[group.dot] ?? "bg-ochre-500"}`} aria-hidden="true" />
          <span className="text-sm font-bold uppercase tracking-wider text-ink-strong">{group.label}</span>
        </div>
        <span className="text-sm font-semibold text-ink-strong sm:text-base">{group.meta}</span>
      </div>

      {featured.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((tile) => {
            const points = GROUP_POINTS[group.dot] ?? GROUP_POINTS.ochre;
            const badge = GROUP_BADGE[group.dot] ?? GROUP_BADGE.ochre;
            return (
              <Link
                key={tile.label}
                href={`/catalog?industri=${encodeURIComponent(tile.industry)}`}
                aria-label={`Lihat produk seragam untuk ${tile.label}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:border-brand-300 hover:shadow-soft-lg"
              >
                <div className="relative aspect-[4/5] bg-cool-100">
                  <Image
                    src={tile.photo}
                    alt={`Model mengenakan seragam ${tile.label.toLowerCase()} buatan Ofissio`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover object-[50%_20%] transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-brand-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-soft-sm">
                    {badge}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-ink-strong">{tile.label}</span>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                  {tile.caption && (
                    <p className="text-[13px] leading-relaxed text-ink-muted">{tile.caption}</p>
                  )}
                  <ul className="mt-auto space-y-2 pt-1">
                    {points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm font-medium text-ink-strong">
                        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {compact.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={`industri-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {expanded ? "Tampilkan lebih sedikit" : `Lihat semua (${compact.length})`}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {expanded && (
            <div
              id={`industri-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {compact.map((tile) => {
                const Icon = resolveHomepageIcon(tile.icon);
                return (
                  <Link
                    key={tile.label}
                    href={`/catalog?industri=${encodeURIComponent(tile.industry)}`}
                    aria-label={`Lihat produk seragam untuk ${tile.label}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg sm:p-5"
                  >
                    <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-ochre-500 transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-700 group-hover:text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-bold text-ink-strong">{tile.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
