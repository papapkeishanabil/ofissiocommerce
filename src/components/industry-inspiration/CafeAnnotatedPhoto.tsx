"use client";

import Image from "next/image";
import { useState } from "react";
import type { IndustryInspirationAnnotation } from "@/features/site-content/content.schema";

type Point = "anchor" | "label";
export function CafeAnnotatedPhoto({ image, alt, ratio, annotations, onMove }: {
  image: string; alt: string; ratio: number; annotations: IndustryInspirationAnnotation[];
  onMove?: (index: number, point: Point, x: number, y: number) => void;
}) {
  const [drag, setDrag] = useState<{ index: number; point: Point; pointer: number } | null>(null);
  return <div className="relative w-full self-center" style={{ aspectRatio: ratio }}
    onPointerMove={(event) => {
      const target = drag;
      if (!target || target.pointer !== event.pointerId || !onMove) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const percent = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
      onMove(target.index, target.point, percent((event.clientX - rect.left) / rect.width * 100), percent((event.clientY - rect.top) / rect.height * 100));
    }}
    onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
    <Image src={image} alt={alt} fill sizes="(max-width: 900px) 100vw, 900px" className="pointer-events-none object-contain" />
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {annotations.filter((pin) => !pin.hidden).map((pin) => <line key={pin.id} x1={pin.anchorX} y1={pin.anchorY} x2={pin.labelX} y2={pin.labelY} stroke="#e69a00" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
    </svg>
    {annotations.map((pin, index) => !pin.hidden && (["anchor", "label"] as const).map((point) => {
      const x = point === "anchor" ? pin.anchorX : pin.labelX;
      const y = point === "anchor" ? pin.anchorY : pin.labelY;
      const content = point === "anchor" ? <span className="block h-2 w-2 rounded-full border border-white bg-amber-500" /> : <>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white bg-slate-900/85 text-xs font-bold text-white">{pin.number}</span>
        <span className={`absolute w-max max-w-32 rounded bg-slate-950/65 px-1.5 py-1 text-left text-xs font-semibold text-white ${pin.labelX < pin.anchorX ? "right-full mr-2" : "left-full ml-2"}`}>{pin.title}</span>
      </>;
      const style = { left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" };
      return onMove ? <button key={`${pin.id}-${point}`} type="button" style={style}
        className="absolute z-10 flex h-9 w-9 touch-none cursor-move items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
        aria-label={`${point === "anchor" ? "Titik" : "Label"} ${pin.number}: ${pin.title}. Gunakan tombol panah untuk menggeser.`}
        onPointerDown={(event) => { event.preventDefault(); setDrag({ index, point, pointer: event.pointerId }); event.currentTarget.setPointerCapture(event.pointerId); }}
        onKeyDown={(event) => {
          const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
          if (!delta) return;
          event.preventDefault();
          onMove(index, point, Math.max(0, Math.min(100, x + delta[0]!)), Math.max(0, Math.min(100, y + delta[1]!)));
        }}>{content}</button> : <span key={`${pin.id}-${point}`} style={style} className="pointer-events-none absolute z-[2] flex items-center justify-center">{content}</span>;
    }))}
  </div>;
}
