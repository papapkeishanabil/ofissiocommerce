import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { HeroIntro } from "./HeroIntro";
import { HomeSectionMarker } from "./HomeSectionMarker";
import { IndustryScaleShowcase } from "./IndustryScaleShowcase";
import { OfistantOpenButton } from "./OfistantOpenButton";
import { PaketSeragamShowcase } from "./PaketSeragamShowcase";
import { ProductCategory3DWrapper } from "./ProductCategory3DWrapper";
import { ScrollRevealInit } from "./ScrollRevealInit";
import { resolveHomepageIcon } from "@/features/site-content/icon-registry";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";
import type { TextSegment } from "@/features/site-content/content.schema";

export async function HomePage() {
  // Admin-editable content (cached, tagged "site-content"; revalidated on
  // save from /admin/site-content). Falls back to the registry defaults if
  // the table is absent or a row is corrupt, so this page never breaks.
  const content = await getPublicSiteContent();
  return (
    <div className="bg-surface">
      <HeroIntro trustItems={content.trust.items} />

      {/* 01 — BISNIS NAIK KELAS */}
      <section id="naik-kelas" className="scroll-reveal scroll-mt-24 bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] lg:items-start lg:gap-24">
          <div className="max-w-2xl lg:sticky lg:top-28">
            <HomeSectionMarker number="01" label="Bisnis Naik Kelas" />
            <h2 className="mt-6 text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-ink-strong sm:text-6xl lg:text-[4rem]">
              Bisnis Naik Kelas Dimulai dari <span className="text-brand-600">Tim yang Tampil Profesional.</span>
            </h2>
            <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-ink-muted sm:text-xl">
              Seragam bukan sekadar baju — ia adalah identitas bisnis yang dilihat pelanggan setiap hari. Dari anggota tim pertama hingga tim yang terus bertambah, Ofissio menjaga tampilan bisnis Anda tetap konsisten dan profesional di setiap fase pertumbuhan.
            </p>
          </div>
          <div className="border-y border-line">
            {content.bisnis_naik_kelas.items.map((b, i) => {
              const Icon = resolveHomepageIcon(b.icon);
              return (
                <article
                  key={b.title}
                  className="group grid gap-5 border-t border-line py-7 first:border-t-0 sm:grid-cols-[4rem_minmax(0,1fr)_2.5rem] sm:items-start sm:gap-6 sm:py-8"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-xl bg-brand-700 text-ochre-400 transition-colors duration-300 group-hover:bg-brand-800 group-hover:text-ochre-300">
                    <Icon className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-[-0.02em] text-ink-strong sm:text-2xl">{b.title}</h3>
                    <p className="mt-2 max-w-[48ch] text-base leading-relaxed text-ink-muted sm:text-lg">{b.desc}</p>
                  </div>
                  <span className="self-start text-right text-sm font-bold tabular-nums tracking-[0.12em] text-ochre-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 02 — COCOK UNTUK BERBAGAI USAHA */}
      <IndustryScaleShowcase data={content.industri} />

      <PaketSeragamShowcase data={content.paket} />

      {/* 04 — Video remains visually unobstructed. Capabilities live in a dedicated
          dock below it so they never compete with stage labels baked into the film. */}
      <section className="scroll-reveal overflow-hidden bg-black">
        <div className="relative flex min-h-[75dvh] flex-col justify-start overflow-hidden py-14 sm:py-16 lg:h-[min(56.25vw,calc(100dvh-13rem))] lg:min-h-0 lg:py-[clamp(3rem,5vw,6rem)] xl:h-[min(56.25vw,calc(100dvh-4rem))]">
          <video
            key={content.bordir.mediaSrc || "/KK-006.mp4"}
            src={content.bordir.mediaSrc || "/KK-006.mp4"}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover object-[center_55%]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.38)_34%,rgba(0,0,0,0.10)_62%,transparent_82%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-l from-black/70 via-black/35 to-transparent xl:block" />
          <div className="relative mx-auto w-full max-w-[1600px] px-6 lg:px-8">
            <div className="max-w-3xl">
              <HomeSectionMarker number="04" label={content.bordir.eyebrow} tone="dark" />
              <h2 className="mt-6 text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4rem]">
                <Headline segments={content.bordir.headline} highlightClass="text-ochre-400" />
              </h2>
              <p className="mt-5 text-xl leading-relaxed text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] lg:text-2xl">
                {content.bordir.lede}
              </p>
            </div>
          </div>

          <aside className="absolute right-[clamp(2rem,4vw,5rem)] top-1/2 hidden w-[min(26rem,30vw)] -translate-y-1/2 xl:block" aria-label="Kapabilitas produksi Ofissio">
            <div className="mb-3 pl-1">
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-ochre-400">Kapabilitas Produksi</p>
              <p className="mt-1.5 text-base text-white/75 [text-shadow:0_2px_12px_rgba(0,0,0,0.65)]">Kontrol kualitas di setiap tahap pengerjaan.</p>
            </div>
            <div className="relative py-1">
              <div aria-hidden className="absolute bottom-9 left-5 top-9 w-px bg-gradient-to-b from-ochre-400/75 via-ochre-400/35 to-transparent" />
              {content.bordir.capabilities.map((c, index) => (
                <div key={c.title} className="group relative flex gap-4 py-4 transition-transform duration-300 hover:translate-x-1">
                  <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ochre-400/55 bg-black/45 text-xs font-bold tabular-nums text-ochre-400 shadow-[0_0_0_5px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-colors group-hover:border-ochre-400 group-hover:bg-ochre-400 group-hover:text-black">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-ochre-400" strokeWidth={2.4} aria-hidden="true" />
                      <p className="text-lg font-bold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.75)]">{c.title}</p>
                    </div>
                    <p className="mt-1.5 text-base leading-relaxed text-white/75 [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="relative border-t border-white/10 bg-[#07101e] py-10 shadow-[0_-18px_50px_rgba(0,0,0,0.22)] xl:hidden">
          <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-6 sm:grid-cols-2 lg:px-8 xl:grid-cols-4">
            <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-gradient-to-r from-transparent via-ochre-400/55 to-transparent xl:block" />
            {content.bordir.capabilities.map((c) => (
              <div key={c.title} className="group relative flex flex-col items-center text-center">
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ochre-400/35 bg-[#0d192a] text-ochre-400 shadow-[0_0_0_6px_#07101e] transition-colors group-hover:border-ochre-400 group-hover:bg-ochre-400 group-hover:text-black">
                  <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </span>
                <div className="mt-4">
                  <p className="font-bold text-white">{c.title}</p>
                  <p className="mx-auto mt-1 max-w-[250px] text-sm leading-relaxed text-white/65">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — CARA ORDER MUDAH */}
      <section id="cara" className="scroll-mt-24 overflow-hidden bg-[#06152e] pb-10 pt-16 text-white lg:pb-12 lg:pt-20">
        <div className="mx-auto max-w-[1600px]">
          <div className="px-6 lg:px-8">
          <div className="max-w-3xl">
            <HomeSectionMarker number="05" label={content.cara_order.eyebrow} tone="dark" />
            <h2 className="mt-6 text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-[#f6f0e6] sm:text-6xl lg:text-[4rem]">
              <Headline segments={content.cara_order.headline} highlightClass="text-ochre-400" />
            </h2>
            <p className="sr-only">
              {content.cara_order.lede}
            </p>
          </div>
          </div>

          <div className="relative mt-12 lg:mt-14">
            <ol className="relative grid gap-10 lg:grid-cols-5 lg:gap-0 lg:before:absolute lg:before:inset-x-0 lg:before:top-80 lg:before:z-10 lg:before:h-[3px] lg:before:bg-ochre-400 lg:before:content-['']">
              {content.cara_order.steps.map((step, index) => {
                return (
                  <li
                    key={step.title}
                    className="group relative border-t border-white/10 lg:border-t-0"
                  >
                    <div className="relative h-72 overflow-hidden bg-brand-950 lg:h-80">
                      <Image
                        src="/process/order-filmstrip-ofissio-v3.png"
                        alt=""
                        width={1950}
                        height={807}
                        loading="eager"
                        quality={95}
                        sizes="100vw"
                        className="absolute top-1/2 h-auto w-[500%] max-w-none -translate-y-1/2 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                        style={{ left: `${index * -100}%` }}
                      />
                    </div>

                    <div className="relative z-20 -mt-7 px-6 pb-2 lg:px-8">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-ochre-400 text-xl font-extrabold text-brand-950 ring-4 ring-[#06152e] tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="mt-6">
                        <h3 className="text-xl font-extrabold leading-tight tracking-[-0.02em] text-[#f6f0e6] sm:text-2xl lg:text-xl xl:text-2xl">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-4 text-base leading-relaxed text-[#c7d1df]">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* 06 — executive corporate case study */}
      <section id="korporasi" className="scroll-mt-24 overflow-hidden border-t border-ochre-400/35 bg-[#06152e] text-white">
        <div className="relative min-h-[40rem] overflow-hidden sm:min-h-[46rem] lg:min-h-[50rem]">
          <Image
            src="/industries/ofissio-team-campaign-v2.png"
            alt="Tim lintas divisi mengenakan seragam kerja Ofissio"
            fill
            sizes="100vw"
            quality={95}
            className="object-cover object-[58%_center] sm:object-center"
          />
          <div aria-hidden className="absolute inset-0 bg-[#020b1d]/55 sm:bg-[#020b1d]/45" />

          <div className="relative z-10 mx-auto flex min-h-[40rem] max-w-[1600px] flex-col justify-between px-6 py-14 sm:min-h-[46rem] sm:py-16 lg:min-h-[50rem] lg:px-8 lg:py-20">
            <HomeSectionMarker number="06" label="Solusi Korporasi" tone="dark" />

            <div className="max-w-5xl pb-3 sm:pb-5">
              <h2 className="max-w-[18ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-[#f6f0e6] sm:text-6xl lg:text-[4rem]">
                Solusi Korporasi dengan <span className="text-ochre-400">Standar Pengadaan Profesional.</span>
              </h2>
              <p className="mt-7 max-w-[48ch] text-base leading-relaxed text-[#e2e8f0] sm:text-lg">
                Proses pengadaan yang tertib, dokumentasi lengkap, dan kualitas seragam yang konsisten untuk kebutuhan perusahaan.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1600px] border-t border-ochre-400/80 sm:grid-cols-2 lg:grid-cols-5">
          {content.korporasi.items.slice(0, 4).map((item, index) => {
            const Icon = resolveHomepageIcon(item.icon);
            return (
              <article key={item.title} className="group border-b border-white/10 px-6 py-8 sm:border-r lg:border-b-0 lg:px-8 lg:py-10">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-3xl font-extrabold text-ochre-400 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <Icon className="h-6 w-6 text-ochre-400" strokeWidth={1.7} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-extrabold leading-tight tracking-[-0.02em] text-[#f6f0e6]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#b9c6d8]">{item.desc}</p>
              </article>
            );
          })}
          <div className="flex min-h-48 flex-col justify-between px-6 py-8 sm:border-r lg:border-r-0 lg:px-8 lg:py-10">
            <Phone className="h-8 w-8 text-ochre-400" strokeWidth={1.7} aria-hidden="true" />
            <div>
              <p className="text-xl font-extrabold leading-tight text-[#f6f0e6]">Konsultasi Pengadaan</p>
              <Link href="#cta" className="group mt-4 inline-flex items-center gap-2 border-b border-ochre-400 pb-1 text-sm font-bold text-ochre-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-300">
                Bicara dengan tim kami
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 07 — curated 3D product stage */}
      <section id="produk" className="scroll-mt-24 overflow-hidden bg-[#f8f4ec] py-16 lg:py-24">
        <div className="mx-auto grid max-w-[1600px] gap-12 px-6 lg:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1.35fr)] lg:items-center lg:gap-8 lg:px-8">
          <div className="relative z-10">
            <HomeSectionMarker number="07" label={content.produk_pilihan.eyebrow} />
            <h2 className="mt-6 max-w-[15ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-brand-950 sm:text-6xl lg:text-[4rem]">
              <Headline segments={content.produk_pilihan.headline} highlightClass="text-ochre-600" />
            </h2>
            <p className="mt-7 max-w-[42ch] text-base leading-relaxed text-ink-muted sm:text-lg">{content.produk_pilihan.lede}</p>

            <nav aria-label="Kategori produk pilihan" className="mt-9 max-w-sm border-y border-brand-950/15">
              {content.produk_pilihan.items.slice(0, 3).map((item, index) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group flex min-h-14 items-center justify-between gap-4 border-t border-brand-950/15 px-1 text-base font-bold transition-colors first:border-t-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${index === 1 ? "text-ochre-700" : "text-brand-950 hover:text-ochre-700"}`}
                >
                  {item.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <Link href="/catalog" className="group mt-9 inline-flex min-h-12 items-center gap-3 rounded-xl bg-brand-950 px-6 text-sm font-bold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">
              Lihat produk lain
              <ArrowRight className="h-4 w-4 text-ochre-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative min-h-[34rem] sm:min-h-[42rem] lg:min-h-[47rem]">
            <div aria-hidden className="absolute inset-x-[12%] bottom-4 h-20 rounded-[50%] bg-brand-950/10 blur-2xl" />
            {content.produk_pilihan.items.slice(0, 3).map((item, index) => {
              const Icon = resolveHomepageIcon(item.icon);
              const positions = [
                "left-0 bottom-0 z-10 h-[55%] w-[39%]",
                "left-1/2 bottom-0 z-20 h-[88%] w-[58%] -translate-x-1/2",
                "right-0 bottom-0 z-10 h-[55%] w-[39%]",
              ];
              return (
                <Link key={item.title} href={item.href} aria-label={`${content.produk_pilihan.lihatLabel} ${item.title}`} className={`group absolute mb-7 ${positions[index]}`}>
                  <div className="h-full w-full transition-transform duration-500 ease-out group-hover:-translate-y-2">
                    {item.glb ? (
                      <ProductCategory3DWrapper url={item.glb} autoRotate={index === 1} />
                    ) : (
                      <div className="grid h-full place-items-center text-brand-700">
                        <Icon className="h-24 w-24" strokeWidth={1.25} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap border-b border-ochre-500 pb-1 text-sm font-extrabold text-brand-950 ${index !== 1 ? "hidden sm:block" : ""}`}>
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — Ofistant + WhatsApp */}
      <section id="cta" className="scroll-reveal scroll-mt-24 bg-gradient-to-br from-brand-700 to-brand-900 py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ochre-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {content.cta.eyebrow}
              </div>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
                <Headline segments={content.cta.headline} highlightClass="text-ochre-400" />
              </h2>
              <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-400" />
              <p className="mt-5 max-w-xl text-xl leading-relaxed text-brand-100 lg:text-2xl">
                {content.cta.lede}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col lg:items-start">
              <OfistantOpenButton
                label={content.cta.ofistantLabel}
                className="inline-flex items-center gap-2 rounded-xl bg-ochre-400 px-7 py-3.5 text-sm font-bold text-brand-900 transition-all hover:bg-ochre-300"
              />
              <Link
                href={content.cta.whatsappHref}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {content.cta.whatsappLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ScrollRevealInit />
    </div>
  );
}

/**
 * Renders a segmented headline. Each fragment is an inline <span>; fragments
 * flagged `highlight` get the section's accent color (passed in as a
 * code-owned className), the rest inherit the heading color. Marketing toggles
 * WHICH fragments pop — never the color itself, which stays a design decision.
 */
function Headline({
  segments,
  highlightClass,
}: {
  segments: TextSegment[];
  highlightClass: string;
}) {
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
          <span key={index} className={segment.highlight ? highlightClass : undefined}>
            {needsLeadingSpace ? " " : null}
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
