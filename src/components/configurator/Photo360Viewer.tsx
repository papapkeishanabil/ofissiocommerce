// src/components/configurator/Photo360Viewer.tsx
// 360° photo spin viewer — uses REAL product photos instead of 3D render.
// Customer drags horizontally to rotate; we swap frames based on angle.
// Logo placements are overlaid via CSS positioning on top of the photo
// (only on the angle range where that zone is actually visible).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LogoPlacement } from "@/types/uniform-3d";
import {
  type Photo360Set,
  isZoneVisibleAtAngle,
} from "@/data/uniform-3d";

interface Photo360ViewerProps {
  photoSet: Photo360Set;
  placements: LogoPlacement[];
  /** zone currently being configured — highlighted */
  highlightZone?: string | null;
}

export function Photo360Viewer({
  photoSet,
  placements,
  highlightZone,
}: Photo360ViewerProps) {
  const sortedFrames = [...photoSet.frames].sort((a, b) => a.angle - b.angle);
  const [angle, setAngle] = useState(sortedFrames[0]?.angle ?? 0);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startAngle: number } | null>(null);

  // pick nearest frame for current angle
  const activeFrame = pickNearestFrame(sortedFrames, angle);

  // Drag-to-spin
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragStateRef.current = { startX: e.clientX, startAngle: angle };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [angle]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStateRef.current || !containerRef.current) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const width = containerRef.current.clientWidth;
    // 1 full drag across container width = 360°
    const deltaAngle = (dx / width) * 360;
    let next = dragStateRef.current.startAngle + deltaAngle;
    next = ((next % 360) + 360) % 360;
    setAngle(next);
  }, [isDragging]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  // Keyboard arrows for a11y
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setAngle((a) => (((a - 15) % 360) + 360) % 360);
      if (e.key === "ArrowRight") setAngle((a) => (a + 15) % 360);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {/* Photo stage */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
        style={{
          background:
            "radial-gradient(circle at 50% 60%, #ffffff, #eef4ff 80%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeFrame.src}
          alt={`KK-006 ${activeFrame.label}`}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain p-4 transition-[opacity] duration-150"
          style={{
            transform: `scale(${zoom})`,
            transitionProperty: isDragging ? "none" : "transform, opacity",
          }}
        />

        {/* Logo overlay layer — placements shown only when zone visible at angle */}
        {placements.map((p) => {
          const overlay = photoSet.zoneOverlays[p.zone];
          if (!overlay) return null;
          if (!isZoneVisibleAtAngle(p.zone, angle)) return null;
          // width: cm → % of frame (approx; 30cm chest width maps to maxWidthPct)
          const widthPct = Math.min(
            overlay.maxWidthPct,
            (p.widthCm / 30) * overlay.maxWidthPct + 4,
          );
          const heightPct = widthPct / 2.5;
          const isHighlighted = highlightZone === p.zone;
          return (
            <div
              key={p.zone}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${overlay.xPct}%`,
                top: `${overlay.yPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              {p.logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logoPreviewUrl}
                  alt={p.logoFileName}
                  className={`h-full w-full object-contain drop-shadow-md ${
                    isHighlighted ? "ring-2 ring-ochre-400" : ""
                  }`}
                />
              ) : (
                <div
                  className={`grid h-full w-full place-items-center rounded bg-white/80 text-[9px] font-semibold text-ink ring-1 ${
                    isHighlighted ? "ring-ochre-400" : "ring-line"
                  }`}
                >
                  LOGO
                </div>
              )}
            </div>
          );
        })}

        {/* Zone marker for highlighted zone (when not yet placed) */}
        {highlightZone &&
          !placements.some((p) => p.zone === highlightZone) &&
          photoSet.zoneOverlays[highlightZone as keyof typeof photoSet.zoneOverlays] &&
          isZoneVisibleAtAngle(highlightZone as any, angle) && (() => {
            const overlay =
              photoSet.zoneOverlays[highlightZone as keyof typeof photoSet.zoneOverlays]!;
            return (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${overlay.xPct}%`,
                  top: `${overlay.yPct}%`,
                }}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-dashed border-brand-500 bg-brand-500/20 text-[9px] font-bold text-brand-700">
                  +
                </span>
              </div>
            );
          })()}
      </div>

      {/* Angle indicator + drag hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-ink-muted shadow-soft-xs backdrop-blur">
        {Math.round(angle)}° · {activeFrame.label} · drag untuk putar
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-ink shadow-soft-sm hover:bg-white"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-ink shadow-soft-sm hover:bg-white"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-[9px] font-bold text-ink shadow-soft-sm hover:bg-white"
          aria-label="Reset zoom"
        >
          1×
        </button>
      </div>
    </div>
  );
}

/** Snap to nearest available frame for current drag angle. */
function pickNearestFrame(
  sorted: { src: string; angle: number; label: string }[],
  angle: number,
) {
  if (sorted.length === 0) return { src: "", angle: 0, label: "" };
  let nearest = sorted[0]!;
  let bestDelta = 360;
  for (const f of sorted) {
    let d = Math.abs(f.angle - angle);
    if (d > 180) d = 360 - d; // wrap-around
    if (d < bestDelta) {
      bestDelta = d;
      nearest = f;
    }
  }
  return nearest;
}
