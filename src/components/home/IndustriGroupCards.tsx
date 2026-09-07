"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { resolveHomepageIcon } from "@/features/site-content/icon-registry";
import type { IndustriGroup, IndustriTile } from "@/features/site-content/content.schema";
import { cn } from "@/lib/utils";

const INDUSTRY_ACCENT_CLASS: Record<string, string> = {
  ochre: "bg-ochre-500",
  brand: "bg-brand-400",
};

const GROUP_LABEL: Record<IndustriGroup["dot"], string> = {
  ochre: "Ready stock & siap bordir",
  brand: "Solusi pengadaan korporasi",
};

const MAX_FEATURED = 4;

function hasPhoto(tile: { photo?: string }) {
  return (tile.photo ?? "").trim() !== "";
}

function groupId(label: string) {
  return `industri-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function IndustriGroupCards({ group }: { group: IndustriGroup }) {
  const [expanded, setExpanded] = useState(false);
  const shown = group.tiles.filter((tile) => tile.hidden !== true);
  if (shown.length === 0) return null;

  const featured = shown.filter(hasPhoto).slice(0, MAX_FEATURED);
  const featuredSet = new Set(featured);
  const more = shown.filter((tile) => !featuredSet.has(tile));
  const disclosureId = groupId(group.label);

  return (
    <section aria-labelledby={`${disclosureId}-title`}>
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={cn("h-2 w-2 rounded-full", INDUSTRY_ACCENT_CLASS[group.dot] ?? "bg-ochre-500")}
              aria-hidden="true"
            />
            <h3 id={`${disclosureId}-title`} className="text-sm font-extrabold uppercase tracking-[0.11em] text-ink-strong sm:text-base">
              {group.label}
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">
            {GROUP_LABEL[group.dot] ?? GROUP_LABEL.ochre}
          </p>
        </div>
        <p className="max-w-md text-sm font-semibold text-ink-muted sm:text-right">{group.meta}</p>
      </div>

      {featured.length > 0 ? (
        <div className="mt-5 grid gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))] lg:gap-x-3">
          {featured.map((tile, index) => (
            <EditorialIndustryTile
              key={tile.label}
              tile={tile}
              lead={index === 0}
            />
          ))}
        </div>
      ) : null}

      {more.length > 0 ? (
        <div className="mt-7 flex flex-col items-start">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={disclosureId}
            className="group inline-flex min-h-11 items-center gap-2 border-b border-ochre-400 py-2 text-sm font-bold text-brand-800 transition-colors hover:border-brand-700 hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          >
            {expanded ? "Tutup pilihan lainnya" : `Jelajahi ${more.length} bidang usaha lainnya`}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {expanded ? (
            <div id={disclosureId} className="mt-7 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {more.map((tile) => (
                <EditorialIndustryTile key={tile.label} tile={tile} compact />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function EditorialIndustryTile({
  tile,
  lead = false,
  compact = false,
  className,
}: {
  tile: IndustriTile;
  lead?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const Icon = resolveHomepageIcon(tile.icon);

  return (
    <Link
      href={`/catalog?industri=${encodeURIComponent(tile.industry)}`}
      aria-label={`Lihat produk seragam untuk ${tile.label}`}
      className={cn(
        "group min-w-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-sm bg-brand-950",
          lead ? "h-[25rem] sm:h-[29rem] lg:h-[22rem] ring-1 ring-ochre-500" : "h-[25rem] sm:h-[29rem] lg:h-[22rem]",
          compact && "h-[23rem] sm:h-[27rem] lg:h-[24rem]",
        )}
      >
        {hasPhoto(tile) ? (
          <Image
            src={tile.photo}
            alt={`Model mengenakan seragam ${tile.label.toLowerCase()} buatan Ofissio`}
            fill
            sizes={lead ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"}
            className="object-cover object-[50%_34%] transition-transform duration-500 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-brand-900" aria-hidden="true">
            <Icon className="h-20 w-20 text-white/20" strokeWidth={1.2} />
          </div>
        )}
      </div>

      <div className={cn("border-b border-line px-1 pb-5 pt-4", lead && "border-ochre-500")}>
        <div className="mb-3 h-px w-6 bg-ochre-500" aria-hidden="true" />
        <h4 className={cn("text-lg font-extrabold leading-[1.2] tracking-[-0.025em] text-ink-strong", lead && "sm:text-xl")}>
          {tile.label}
        </h4>
        {tile.caption ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {tile.caption}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
