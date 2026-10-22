import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CaraOrderSectionData } from "@/features/site-content/content.schema";
import { HomeSectionMarker } from "./HomeSectionMarker";
import { OfistantOpenButton } from "./OfistantOpenButton";

export function ReadyStockOrderSection({ data, sectionNumber = "05" }: { data: CaraOrderSectionData; sectionNumber?: string }) {
  return (
    <section id="cara" aria-labelledby="cara-heading" className="scroll-mt-24 overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 pb-10 pt-16 text-white lg:pb-12 lg:pt-20">
      <div className="mx-auto max-w-[1600px]">
        <div className="px-6 lg:px-8">
          <HomeSectionMarker number={sectionNumber} label={data.eyebrow} tone="dark" />
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <h2 id="cara-heading" className="max-w-[20ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-[#f6f0e6] sm:text-6xl lg:text-[4rem]">
              {data.headline.map((segment, index) => (
                <span key={index} className={segment.highlight ? "text-ochre-400" : undefined}>{segment.text}</span>
              ))}
            </h2>
            <Link href="/catalog" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 self-start rounded-xl bg-ochre-400 px-6 py-3 text-base font-bold text-brand-950 transition-colors hover:bg-ochre-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400 lg:self-auto">
              Lihat Katalog <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-[#c7d1df] sm:text-lg">{data.lede}</p>
        </div>
        <ol className="mt-10 grid gap-y-9 sm:grid-cols-2 lg:mt-12 lg:grid-cols-5 lg:gap-y-0">
          {data.steps.map((step, index) => {
            const isEmbroidery = step.icon === "Scissors";
            const stockIndex = data.steps.slice(0, index).filter(item => item.icon !== "Scissors").length;
            return (
            <li key={`${index}-${step.title}`} className="group min-w-0">
              <div className="relative h-72 overflow-hidden bg-brand-950 sm:h-80 lg:h-96">
                <Image src={isEmbroidery ? "/process/order-filmstrip-ofissio-v3.png" : "/process/ready-stock-filmstrip-v1.png"} alt="" width={isEmbroidery ? 1950 : 1942} height={isEmbroidery ? 807 : 809} sizes="(min-width: 1600px) 1600px, 100vw" quality={95}
                  className="absolute top-1/2 h-auto w-[400%] max-w-none -translate-y-1/2 transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.025]"
                  style={{ width: isEmbroidery ? "500%" : "400%", maxWidth: "none", left: `${isEmbroidery ? -200 : (stockIndex % 4) * -100}%` }} />
              </div>
              <div className="relative border-t-[3px] border-ochre-400 px-6 pb-2 lg:px-8" style={{ borderTop: "3px solid var(--color-ochre-400)" }}>
                <span style={{ marginTop: -31, boxShadow: "0 0 0 5px var(--color-brand-700)" }} className="relative grid h-14 w-14 place-items-center rounded-full bg-ochre-400 text-xl font-extrabold tabular-nums text-brand-950">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 text-xl font-extrabold leading-tight tracking-[-0.02em] text-[#f6f0e6] sm:text-2xl">{step.title}</h3>
                <p className="mt-4 max-w-[35ch] whitespace-pre-line text-base leading-relaxed text-[#c7d1df]">{step.desc}</p>
              </div>
            </li>
          );})}
        </ol>
        <div className="mx-6 mt-10 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between lg:mx-8 lg:mt-12">
          <p className="max-w-[65ch] text-sm leading-relaxed text-[#c7d1df]">
            <span className="font-bold text-[#f6f0e6]">Ingin tambah logo perusahaan?</span>{" "}Konsultasikan opsi bordir dan estimasi pengerjaannya dengan Ofistant.
          </p>
          <OfistantOpenButton label="Tanya tentang bordir" className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg border border-white/25 px-4 py-3 text-sm font-bold text-white transition-colors hover:border-ochre-400 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400" />
        </div>
      </div>
    </section>
  );
}
