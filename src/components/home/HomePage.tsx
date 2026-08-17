import Link from "next/link";
import { ArrowRight, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { HeroIntro } from "./HeroIntro";
import { IndustriGroupCards } from "./IndustriGroupCards";
import { OfistantOpenButton } from "./OfistantOpenButton";
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
      <HeroIntro />

      {/* TRUST STRIP — 4 stats on navy */}
      <section aria-label="Keunggulan Ofissio" className="bg-brand-700">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-6 gap-y-5 px-6 py-6 text-white lg:grid-cols-4">
          {content.trust.items.map((t) => {
            const Icon = resolveHomepageIcon(t.icon);
            return (
              <div key={t.label} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-ochre-300">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div>
                  <div className="text-lg font-extrabold leading-tight tabular-nums">{t.value}</div>
                  <div className="text-xs font-medium text-white/70">{t.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 01 — BISNIS NAIK KELAS */}
      <section id="naik-kelas" className="scroll-reveal scroll-mt-24 bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">01</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Bisnis Naik Kelas</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              Bisnis Naik Kelas Dimulai dari <span className="text-brand-600">Tim yang Tampil Profesional.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              Seragam bukan sekadar baju — ia adalah identitas bisnis yang dilihat pelanggan setiap hari. Dari anggota tim pertama hingga tim yang terus bertambah, Ofissio menjaga tampilan bisnis Anda tetap konsisten dan profesional di setiap fase pertumbuhan.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.bisnis_naik_kelas.items.map((b, i) => {
              const Icon = resolveHomepageIcon(b.icon);
              return (
                <div key={b.title} className="group relative overflow-hidden rounded-2xl border border-line bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg">
                  <span className="absolute right-5 top-5 text-5xl font-bold text-brand-50 transition-colors group-hover:text-brand-100">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
                    <Icon className="h-7 w-7" strokeWidth={1.6} />
                  </span>
                  <h3 className="relative mt-5 text-lg font-bold text-ink-strong">{b.title}</h3>
                  <p className="relative mt-2.5 text-base leading-relaxed text-ink-muted">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 02 — COCOK UNTUK BERBAGAI USAHA */}
      <section id="usaha" className="scroll-reveal scroll-mt-24 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">02</span>
                <span className="text-sm font-bold uppercase tracking-wider text-brand-700">{content.industri.eyebrow}</span>
              </div>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
                <Headline segments={content.industri.headline} highlightClass="text-brand-600" />
              </h2>
              <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
                {content.industri.lede}
              </p>
            </div>
            <Link
              href="/catalog"
              className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-brand-700 px-8 text-base font-bold text-white shadow-soft-md transition-colors duration-200 hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:w-auto"
            >
              Lihat semua produk
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-14 space-y-12">
            {content.industri.groups.map((group) => (
              <IndustriGroupCards key={group.label} group={group} />
            ))}
          </div>
        </div>
      </section>

      {/* 03 — PAKET SERAGAM POPULER */}
      <section id="paket" className="scroll-reveal scroll-mt-24 bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">03</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">{content.paket.eyebrow}</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              <Headline segments={content.paket.headline} highlightClass="text-brand-600" />
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              {content.paket.lede}
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {content.paket.items.map((p) => {
              const Icon = resolveHomepageIcon(p.icon);
              return (
              <div key={p.name} className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-700 group-hover:text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-bold text-ink-strong">{p.name}</h3>
                  </div>
                  {p.scale ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">{content.paket.scaleBadgeLabel}</span>
                  ) : null}
                </div>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-bold text-ink-strong">{content.paket.isiLabel}</dt>
                    <dd className="text-ink-muted">{p.items}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-bold text-ink-strong">{content.paket.cocokUntukLabel}</dt>
                    <dd className="text-ink-muted">{p.cocokUntuk}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-bold text-ink-strong">{content.paket.opsiLogoLabel}</dt>
                    <dd className="text-ink-muted">{p.opsiLogo}</dd>
                  </div>
                </dl>
                <Link
                  href={p.href}
                  className="mt-6 inline-flex items-center gap-1.5 self-start border-t border-line pt-4 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800"
                >
                  {content.paket.ctaLabel} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 04 — BORDIR & KUSTOMISASI — full-width video */}
      <section className="scroll-reveal relative overflow-hidden bg-brand-700 py-20 lg:py-28">
        <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover opacity-40">
          <source src={content.bordir.mediaSrc} type="video/mp4" />
        </video>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-sm font-bold text-white backdrop-blur-sm">04</span>
              <span className="text-sm font-bold uppercase tracking-wider text-ochre-300">{content.bordir.eyebrow}</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
              <Headline segments={content.bordir.headline} highlightClass="text-ochre-400" />
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-400" />
            <p className="mt-5 text-xl leading-relaxed text-brand-100 lg:text-2xl">
              {content.bordir.lede}
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.bordir.capabilities.map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ochre-400/15 text-ochre-400">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="font-bold text-white">{c.title}</p>
                    <p className="mt-1 text-sm text-brand-200">{c.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — CARA ORDER MUDAH */}
      <section id="cara" className="scroll-reveal scroll-mt-24 bg-cool-100 py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">05</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">{content.cara_order.eyebrow}</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              <Headline segments={content.cara_order.headline} highlightClass="text-brand-600" />
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              {content.cara_order.lede}
            </p>
          </div>
          <div className="how-journey mt-14">
            {/* Embroidery running-stitch + traveling needle (desktop 5-across).
                Decorative — the numbers on the nodes carry the order semantics. */}
            <div className="how-stitch-h" aria-hidden="true">
              <svg viewBox="0 0 1000 10" preserveAspectRatio="none">
                <line className="under" x1="0" y1="5" x2="1000" y2="5" strokeLinecap="round" strokeDasharray="11 9" />
                <line className="main" x1="0" y1="5" x2="1000" y2="5" strokeLinecap="round" strokeDasharray="11 9" />
              </svg>
              <span className="how-needle" />
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {content.cara_order.steps.map((s, index) => {
                const StepIcon = resolveHomepageIcon(s.icon);
                return (
                <div key={s.title} className="how-step flex flex-col items-center text-center">
                  <div className="how-node">{index + 1}</div>
                  <div className="how-card mt-6 w-full rounded-2xl border border-line bg-white p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-md">
                    <span className="how-icon mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <StepIcon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-ink-strong">{s.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-ink-muted">{s.desc}</p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 06 — SOLUSI KORPORASI — navy band */}
      <section className="scroll-reveal relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-sm font-bold text-white">06</span>
              <span className="text-sm font-bold uppercase tracking-wider text-ochre-300">Solusi Korporasi</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
              Solusi Korporasi dengan <span className="text-ochre-400">Standar Pengadaan Profesional.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-400" />
            <p className="mt-5 text-xl leading-relaxed text-brand-100 lg:text-2xl">
              Untuk pengadaan seragam skala perusahaan, Ofissio siap dengan proses yang dipahami tim procurement: quotation formal, custom logo multi-divisi, tracking order per batch, dan pengiriman ke seluruh Indonesia.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.korporasi.items.map((c) => {
              const Icon = resolveHomepageIcon(c.icon);
              return (
                <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ochre-400/15 text-ochre-400">
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-200">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 07 — PRODUK PILIHAN (3D katalog) */}
      <section id="produk" className="scroll-reveal scroll-mt-24 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">07</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">{content.produk_pilihan.eyebrow}</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              <Headline segments={content.produk_pilihan.headline} highlightClass="text-brand-600" />
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              {content.produk_pilihan.lede}
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {content.produk_pilihan.items.map((cat) => {
              const Icon = resolveHomepageIcon(cat.icon);
              return (
              <Link key={cat.title} href={cat.href} className="group overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:border-brand-300 hover:shadow-soft-lg">
                <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-brand-50/40">
                  <span className="absolute right-3 top-3 rounded-md bg-ochre-50 px-2 py-0.5 text-[10px] font-semibold text-ochre-700">
                    {cat.glb ? "3D" : "Katalog"}
                  </span>
                  {cat.glb ? (
                    <ProductCategory3DWrapper url={cat.glb} />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
                        <Icon className="h-10 w-10" strokeWidth={1.4} />
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-ink-strong">{cat.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-muted">{cat.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ochre-700 bg-ochre-50 px-2.5 py-1 rounded-md">{cat.tag}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-transform group-hover:translate-x-0.5">
                      {content.produk_pilihan.lihatLabel} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
          <div className="mt-12 flex justify-center">
            <Link
              href="/catalog"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 text-sm font-bold text-white shadow-soft-md transition-colors duration-200 hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:text-base"
            >
              Lihat produk lain
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
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
      {segments.map((segment, index) => (
        <span key={index} className={segment.highlight ? highlightClass : undefined}>
          {segment.text}
        </span>
      ))}
    </>
  );
}
