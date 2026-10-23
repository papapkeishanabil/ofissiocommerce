import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { INSPIRATION_PAGES } from "@/features/site-content/industry-inspiration.routes";
import { resolveInspirationPage } from "@/features/site-content/industry-inspiration.content";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Inspirasi Seragam untuk Bisnis dan Korporasi",
  description: "Jelajahi inspirasi seragam sesuai bidang usaha dan perusahaan Anda, lalu temukan pilihan produk Ofissio yang relevan.",
};

export default async function InspirationsPage() {
  const content = await getPublicSiteContent();
  return (
    <main className="bg-[#f8f4ec] px-5 py-8 text-brand-950 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1440px]">
        <Link href="/#usaha" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bisnis dan Korporasi</Link>
        <header className="mb-12 mt-8 max-w-4xl">
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">Inspirasi Seragam untuk Berbagai Usaha.</h1>
          <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-ink-muted sm:text-lg">Temukan tampilan dan manfaat yang sesuai dengan cara tim Anda bekerja. Pilih bidang usaha atau perusahaan Anda, lalu jelajahi produk yang relevan.</p>
        </header>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {(["business", "corporate"] as const).map((group) => {
            const pages = INSPIRATION_PAGES.filter((page) => page.group === group);
            const lead = pages[0];
            if (!lead) return null;
            const image = resolveInspirationPage(lead, content.industri);
            return (
              <section key={group} id={group === "business" ? "bisnis-naik-kelas" : "solusi-korporasi"} className="scroll-mt-24">
                <h2 className="text-3xl font-extrabold tracking-[-0.025em]">{group === "business" ? "Bisnis Naik Kelas" : "Solusi Korporasi"}</h2>
                <p className="mb-6 mt-3 max-w-[60ch] text-base leading-relaxed text-ink-muted">{group === "business" ? "Identitas profesional untuk tim yang mengembangkan usaha Anda." : "Keselarasan tampilan untuk berbagai divisi, unit, dan lingkungan kerja."}</p>
                <Link href={`/inspirasi/${lead.slug}`} className="relative block aspect-[3/2] overflow-hidden rounded-2xl bg-[#e8e3da] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">
                  <Image src={image.image} alt={image.imageAlt} fill sizes="(max-width: 1024px) 94vw, 660px" className="object-cover object-center" />
                </Link>
                <nav aria-label={group === "business" ? "Inspirasi bisnis" : "Inspirasi korporasi"} className="mt-6 divide-y divide-ochre-600/25">
                  {pages.map((page) => (
                    <Link key={page.slug} href={`/inspirasi/${page.slug}`} className="group flex min-h-14 items-center justify-between gap-4 py-4 text-base font-semibold hover:text-ochre-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">{page.label}<ArrowRight className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" /></Link>
                  ))}
                </nav>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
