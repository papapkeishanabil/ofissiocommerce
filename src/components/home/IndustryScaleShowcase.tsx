import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, TrendingUp, UsersRound } from "lucide-react";

import { resolveHomepageIcon } from "@/features/site-content/icon-registry";
import type { IndustriGroup, IndustriSectionData, IndustriTile } from "@/features/site-content/content.schema";
import { HomeSectionMarker } from "./HomeSectionMarker";
import { INSPIRATION_PAGES, INSPIRATION_ROUTES, inspirationHref } from "@/features/site-content/industry-inspiration.routes";
import { HOME_FRAME_RATIOS, homeImageFrame, type HomeFrameKind } from "@/features/site-content/inspiration-framing";
import { defaultInspirationPage } from "@/features/site-content/industry-inspiration.content";
import { homepageBusinessTiles } from "@/features/site-content/industry-showcase";

function frameFor(industry: IndustriTile["industry"], data: IndustriSectionData, kind: HomeFrameKind) {
  const page = data.inspirationPages.find((item) => item.industry === industry && item.slug === INSPIRATION_ROUTES[industry].slug)
    ?? (industry === "Bengkel" ? data.inspiration : undefined);
  const frame = homeImageFrame(page, kind);
  return { objectFit: frame.fit, objectPosition: `${frame.x}% ${frame.y}%` };
}

const CAMPAIGN_PHOTOS: Record<string, string> = {
  "/industries/bengkel-model.jpg": "/industries/campaign/bengkel-teknisi.png",
  "/industries/klinik-model.jpg": "/industries/campaign/apotek-klinik.png",
  "/industries/retail-model.jpg": "/industries/campaign/retail-restoran.png",
};

const PROOFS = [
  { label: "Quotation Formal", description: "Dokumen resmi dan transparan untuk proses pengadaan.", icon: FileCheck2 },
  { label: "Multi-Divisi", description: "Seragam untuk berbagai departemen dalam satu standar.", icon: UsersRound },
  { label: "Pengadaan Skala Besar", description: "Kapasitas produksi dan distribusi terukur.", icon: Building2 },
] as const;

function visibleTiles(group: IndustriGroup | undefined) {
  return (group?.tiles ?? []).filter((tile) => tile.hidden !== true);
}

function photoFor(tile: IndustriTile, data: IndustriSectionData) {
  const page = data.inspirationPages.find((item) =>
    item.industry === tile.industry && item.slug === INSPIRATION_ROUTES[tile.industry].slug,
  );
  const inspiration = page ?? (tile.industry === "Bengkel" ? data.inspiration : undefined);
  if (inspiration?.image.trim()) return inspiration.image.trim();
  const industry = INSPIRATION_PAGES.find((item) => item.industry === tile.industry)?.industry;
  return CAMPAIGN_PHOTOS[tile.photo] ?? (tile.photo || (industry ? defaultInspirationPage(industry).image : ""));
}

export function corporatePhotoFor(data: IndustriSectionData) {
  const page = data.inspirationPages.find((item) =>
    item.industry === "Corporate" && item.slug === INSPIRATION_ROUTES.Corporate.slug,
  );
  return page?.image.trim() || "/industries/ofissio-team-campaign-v2.png";
}

function compactTitle(tile: IndustriTile) {
  if (tile.industry === "Bengkel") return "Bengkel dan Teknisi";
  if (tile.industry === "Kesehatan") return "Apotek dan Klinik";
  if (tile.industry === "Retail") return "Toko dan Retail";
  if (tile.industry === "Grosir") return "Grosir dan Distributor";
  return tile.label;
}

function industryHref(tile: IndustriTile) {
  return inspirationHref(tile.industry);
}

function MiniIndustry({ tile, data }: { tile: IndustriTile; data: IndustriSectionData }) {
  const Icon = resolveHomepageIcon(tile.icon);
  const photo = photoFor(tile, data);
  return (
    <Link href={industryHref(tile)} className="group grid items-center grid-cols-[minmax(0,1.05fr)_minmax(8rem,0.95fr)] overflow-hidden rounded-xl bg-white/70 shadow-[0_18px_45px_-36px_rgba(8,29,67,0.55)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-34px_rgba(8,29,67,0.48)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
      <div className="relative w-full overflow-hidden bg-[#e8e3da]" style={{ aspectRatio: HOME_FRAME_RATIOS.card }}>
        {photo ? <Image src={photo} alt={`Seragam ${tile.label}`} fill unoptimized sizes="(max-width: 1024px) 55vw, 18vw" style={frameFor(tile.industry, data, "card")} /> : null}
      </div>
      <div className="flex flex-col justify-center p-5">
        <Icon className="h-7 w-7 text-ochre-600" strokeWidth={1.6} aria-hidden="true" />
        <h3 className="mt-3 text-lg font-extrabold leading-[1.05] tracking-[-0.02em] text-brand-950">{compactTitle(tile)}</h3>
        <span className="mt-4 h-px w-10 bg-ochre-500 transition-[width] duration-300 group-hover:w-16" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function IndustryScaleShowcase({ data }: { data: IndustriSectionData }) {
  const businessGroup = data.groups.find((group) => group.dot === "ochre") ?? data.groups[0];
  const visible = visibleTiles(businessGroup);
  const ordered = homepageBusinessTiles(businessGroup);
  const lead = ordered[0] ?? visible[0];
  const feature = data.businessFeature;

  return (
    <section id="usaha" className="scroll-mt-28 bg-[#f5f7f9] py-16 lg:py-20">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <header className="mx-auto max-w-4xl text-center">
          <div className="mb-6"><HomeSectionMarker number="02" label="Bisnis dan Korporasi" align="center" /></div>
          <h2 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-brand-950 sm:text-6xl lg:text-[4rem]">
            Seragam Profesional untuk <span className="text-ochre-600">Berbagai Usaha.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[55ch] text-base leading-relaxed text-ink-muted sm:text-lg">Dari kebutuhan lapangan hingga organisasi berskala besar. Ofissio siap menjadi mitra andal Anda.</p>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-0">
          <article className="lg:pr-12 xl:pr-16">
            <div className="flex items-center gap-5">
              <TrendingUp className="h-9 w-9 shrink-0 text-ochre-600" strokeWidth={1.65} aria-hidden="true" />
              <h3 className="shrink-0 text-2xl font-extrabold tracking-[-0.025em] text-brand-950 sm:text-3xl">Bisnis Naik Kelas</h3>
              <span className="h-px flex-1 bg-ochre-500/70" aria-hidden="true" />
            </div>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-ink-muted sm:text-lg">Seragam kerja dan penampilan profesional yang dirancang untuk menonjolkan performa tim di berbagai industri.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-[1.08fr_0.92fr]">
              <Link href={feature ? inspirationHref(feature.industry) : lead ? industryHref(lead) : "/inspirasi"} className="group relative aspect-[4/5] self-start sm:aspect-[1/2] overflow-hidden rounded-xl bg-[#e8e3da] shadow-[0_22px_58px_-38px_rgba(8,29,67,0.58)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_68px_-38px_rgba(8,29,67,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
                {feature || (lead && photoFor(lead, data)) ? <Image src={feature?.image ?? photoFor(lead!, data)} alt={feature?.imageAlt ?? `Seragam lengkap ${lead!.label}`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 55vw, 27vw" style={feature ? { objectFit: feature.fit, objectPosition: `${feature.x}% ${feature.y}%` } : frameFor(lead!.industry, data, "feature")} /> : null}
              </Link>
              <div className="grid content-start gap-3">
                {ordered.map((tile) => <MiniIndustry key={`${tile.industry}-${tile.label}`} tile={tile} data={data} />)}
              </div>
            </div>
            <Link href="/inspirasi#bisnis-naik-kelas" className="group mt-7 inline-flex min-h-11 items-center gap-3 border-b border-ochre-500 py-2 text-sm font-bold text-brand-950 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
              Jelajahi Bisnis Naik Kelas <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </article>

          <article className="border-t border-ochre-500/50 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0 xl:pl-16">
            <div className="flex items-center gap-5">
              <Building2 className="h-9 w-9 shrink-0 text-brand-950" strokeWidth={1.65} aria-hidden="true" />
              <h3 className="shrink-0 text-2xl font-extrabold tracking-[-0.025em] text-brand-950 sm:text-3xl">Solusi Korporasi</h3>
              <span className="h-px flex-1 bg-ochre-500/70" aria-hidden="true" />
            </div>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-ink-muted sm:text-lg">Pengadaan seragam terstruktur untuk perusahaan dan organisasi berskala besar dengan standar tinggi.</p>

            <Link href="/inspirasi/solusi-korporasi" className="relative mt-8 block overflow-hidden rounded-xl bg-[#e8e3da] shadow-[0_22px_58px_-38px_rgba(8,29,67,0.58)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700" style={{ aspectRatio: HOME_FRAME_RATIOS.corporate }}>
              <Image src={corporatePhotoFor(data)} alt="Tim berseragam Ofissio untuk solusi korporasi" fill unoptimized sizes="(max-width: 1024px) 100vw, 46vw" style={frameFor("Corporate", data, "corporate")} />
            </Link>

            <div className="mt-5 grid gap-0 sm:grid-cols-3">
              {PROOFS.map(({ label, description, icon: Icon }, index) => (
                <div key={label} className={`py-5 sm:px-5 ${index === 0 ? "sm:pl-0" : "border-t border-ochre-500/40 sm:border-l sm:border-t-0"}`}>
                  <Icon className="h-8 w-8 text-brand-950" strokeWidth={1.55} aria-hidden="true" />
                  <h4 className="mt-3 text-base font-extrabold leading-tight text-brand-950">{label}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
                </div>
              ))}
            </div>
            <Link href="/inspirasi/solusi-korporasi" className="group mt-4 inline-flex min-h-11 items-center gap-3 border-b border-ochre-500 py-2 text-sm font-bold text-brand-950 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
              Jelajahi Solusi Korporasi <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
