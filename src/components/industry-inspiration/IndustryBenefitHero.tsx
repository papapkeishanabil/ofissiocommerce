"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  IndustryInspirationAnnotation,
  IndustryInspirationData,
} from "@/features/site-content/content.schema";
import { buildBentConnector } from "@/features/site-content/inspiration-connector.geometry";

interface FrameGeometry {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface DisplayPoint {
  x: number;
  y: number;
}

function mapSourcePoint(
  x: number,
  y: number,
  geometry: FrameGeometry,
  focalX: number,
  focalY: number,
  fit: "cover" | "contain" = "cover",
): DisplayPoint {
  const scale = (fit === "contain" ? Math.min : Math.max)(
    geometry.width / geometry.naturalWidth,
    geometry.height / geometry.naturalHeight,
  );
  const renderedWidth = geometry.naturalWidth * scale;
  const renderedHeight = geometry.naturalHeight * scale;
  const offsetX = (geometry.width - renderedWidth) * (focalX / 100);
  const offsetY = (geometry.height - renderedHeight) * (focalY / 100);
  return {
    x: offsetX + renderedWidth * (x / 100),
    y: offsetY + renderedHeight * (y / 100),
  };
}

function clampPoint(point: DisplayPoint, width: number, height: number, inset = 28) {
  return {
    x: Math.min(width - inset, Math.max(inset, point.x)),
    y: Math.min(height - inset, Math.max(inset, point.y)),
  };
}

function DisplayAnnotation({
  annotation,
  geometry,
  focalX,
  focalY,
  fit = "cover",
}: {
  annotation: IndustryInspirationAnnotation;
  geometry: FrameGeometry;
  focalX: number;
  focalY: number;
  fit?: "cover" | "contain";
}) {
  const anchor = mapSourcePoint(
    annotation.anchorX,
    annotation.anchorY,
    geometry,
    focalX,
    focalY,
    fit,
  );
  const label = clampPoint(
    mapSourcePoint(annotation.labelX, annotation.labelY, geometry, focalX, focalY, fit),
    geometry.width,
    geometry.height,
    fit === "contain" ? 100 : 38,
  );
  const labelOnRight = label.x >= anchor.x;
  const points = buildBentConnector(anchor, label, {
    markerRadius: 20,
    markerGap: 1,
    maxAnchorStem: 36,
    maxMarkerStem: 28,
  });

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#e7a51a"
          strokeOpacity="0.9"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={anchor.x} cy={anchor.y} r="3.25" fill="#e7a51a" />
      </svg>
      <div
        role="group"
        aria-label={`${annotation.number}. ${annotation.title}`}
        className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: label.x, top: label.y }}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-ochre-300 bg-[#07162b]/92 text-[10px] font-extrabold tabular-nums text-ochre-300 shadow-[0_0_0_3px_rgba(255,255,255,0.12)] backdrop-blur-sm">
          {annotation.number}
        </span>
        <span
          className={`absolute top-[calc(100%+0.35rem)] w-44 text-sm font-extrabold leading-[1.18] text-white [text-shadow:0_1px_2px_#07162b,0_0_4px_#07162b] xl:text-base ${fit === "contain" ? "left-1/2 -translate-x-1/2 text-center" : labelOnRight ? "left-1 text-left" : "right-1 text-right"}`}
        >
          {annotation.title}
        </span>
      </div>
    </>
  );
}

export function IndustryBenefitHero({ data, presentation = "immersive", productSectionId = "produk-bengkel" }: {
  data: IndustryInspirationData;
  presentation?: "immersive" | "framed";
  productSectionId?: string;
}) {
  const visibleAnnotations = useMemo(
    () => data.annotations.filter((annotation) => !annotation.hidden),
    [data.annotations],
  );
  const [activeBenefit, setActiveBenefit] = useState(
    visibleAnnotations[0]?.id ?? "",
  );
  const [geometry, setGeometry] = useState<FrameGeometry | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!visibleAnnotations.some((annotation) => annotation.id === activeBenefit)) {
      setActiveBenefit(visibleAnnotations[0]?.id ?? "");
    }
  }, [activeBenefit, visibleAnnotations]);

  useEffect(() => {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image) return;
    const update = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setGeometry({
        width: rect.width,
        height: rect.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    image.addEventListener("load", update);
    return () => {
      observer.disconnect();
      image.removeEventListener("load", update);
    };
  }, [data.image]);

  const activeDescription = visibleAnnotations.find(
    (annotation) => annotation.id === activeBenefit,
  )?.description;
  const titleWithoutPeriod = data.title.endsWith(".") ? data.title.slice(0, -1) : data.title;
  const hasPeriod = data.title.endsWith(".");

  // Separate the introduction from the image on the new pages: existing
  // campaign photos have different compositions and must not be cropped to
  // fit the Bengkel headline. Pins retain source-image coordinates.
  if (presentation === "framed") {
    return (
      <section className="bg-[#061126] px-5 pb-10 pt-6 text-white sm:px-8 lg:px-12 lg:pb-16">
        <div className="mx-auto max-w-[1440px]">
          <Link href="/#usaha" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/85 hover:text-ochre-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke Bisnis &amp; Korporasi
          </Link>
          <div className="mb-9 mt-7 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
            <h1 className="max-w-[24ch] text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">{data.title}</h1>
            <div>
              <p className="max-w-[60ch] text-base leading-relaxed text-white/85 sm:text-lg">{data.lede}</p>
              <a href={`#${productSectionId}`} className="mt-5 inline-flex min-h-11 items-center gap-3 border-b border-ochre-400 text-sm font-bold text-ochre-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400">
                Lihat pilihan seragam <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div ref={frameRef} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#10223a] sm:aspect-[16/10]">
            <Image ref={imageRef} src={data.image} alt={data.imageAlt} fill priority quality={95} sizes="(max-width: 1536px) 94vw, 1440px" className="object-contain" style={{ objectPosition: `${data.focalX}% ${data.focalY}%` }} />
            {data.enabled && geometry ? (
              <div className="pointer-events-none absolute inset-0 hidden lg:block">
                {visibleAnnotations.map((annotation) => <DisplayAnnotation key={annotation.id} annotation={annotation} geometry={geometry} focalX={data.focalX} focalY={data.focalY} fit="contain" />)}
              </div>
            ) : null}
          </div>
          {data.enabled && visibleAnnotations.length > 0 ? (
            <ol className="mt-7 grid gap-6 md:grid-cols-3">
              {visibleAnnotations.map((annotation) => (
                <li key={annotation.id} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ochre-300 text-xs font-bold tabular-nums text-ochre-300">{annotation.number}</span>
                  <div><h2 className="text-base font-bold text-white">{annotation.title}</h2><p className="mt-2 max-w-[55ch] text-sm leading-relaxed text-white/85">{annotation.description}</p></div>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="relative isolate overflow-hidden bg-[#061126] text-white">
      <div ref={frameRef} className="relative min-h-[820px] sm:min-h-[900px] lg:min-h-[calc(100svh-3.5rem)] lg:max-h-[1080px]">
        <Image
          ref={imageRef}
          src={data.image}
          alt={data.imageAlt}
          fill
          priority
          quality={95}
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: `${data.focalX}% ${data.focalY}%` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,11,27,0.92)_0%,rgba(3,11,27,0.58)_29%,rgba(3,11,27,0.04)_54%,rgba(3,11,27,0.48)_76%,rgba(3,11,27,0.82)_100%)]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(0deg,rgba(3,11,27,0.94),transparent)]" />

        <div className="relative z-10 mx-auto h-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <Link href="/#usaha" className="inline-flex min-h-11 items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-white/80 transition-colors hover:text-ochre-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke Bisnis &amp; Korporasi
          </Link>

          <div className="mt-12 max-w-lg lg:mt-16 lg:max-w-[31rem]">
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.18em] text-ochre-300">
              <span className="h-px w-9 bg-ochre-400" aria-hidden="true" /> {data.eyebrow}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4rem] xl:text-[4.35rem]">
              {titleWithoutPeriod}{hasPeriod ? <span className="text-ochre-400">.</span> : null}
            </h1>
            <p className="mt-6 max-w-[39ch] text-base leading-relaxed text-white/78 sm:text-lg">
              {data.lede}
            </p>
          </div>

          <a href={`#${productSectionId}`} aria-label={`Lihat pilihan produk ${data.industry}`} className="absolute bottom-8 left-1/2 hidden h-12 w-12 -translate-x-1/2 place-items-center rounded-full border border-white/35 bg-[#07162b]/50 text-ochre-300 backdrop-blur-sm transition-colors hover:border-ochre-300 hover:bg-ochre-400 hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400 sm:grid">
            <ArrowDown className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>

        {data.enabled && geometry ? (
          <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
            {visibleAnnotations.map((annotation) => (
              <DisplayAnnotation
                key={annotation.id}
                annotation={annotation}
                geometry={geometry}
                focalX={data.focalX}
                focalY={data.focalY}
              />
            ))}
          </div>
        ) : null}

        {data.enabled && visibleAnnotations.length ? (
          <div className="absolute inset-x-5 bottom-6 z-20 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleAnnotations.map((annotation) => (
                <button key={annotation.id} type="button" onClick={() => setActiveBenefit(annotation.id)} aria-pressed={activeBenefit === annotation.id} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold transition-colors ${activeBenefit === annotation.id ? "border-ochre-300 bg-ochre-400 text-brand-950" : "border-white/30 bg-[#07162b]/70 text-white"}`}>
                  {annotation.number}, {annotation.title}
                </button>
              ))}
            </div>
            <p className="mt-2 min-h-10 text-sm leading-relaxed text-white/80">{activeDescription}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
