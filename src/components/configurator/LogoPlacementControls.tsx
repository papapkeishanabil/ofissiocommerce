// src/components/configurator/LogoPlacementControls.tsx
"use client";

import { RotateCw, Trash2 } from "lucide-react";

import type { EmbroideryZone, LogoPlacement } from "@/types/uniform-3d";
import { zoneLabel } from "@/types/uniform-3d";
import { Button } from "@/components/ui/Button";

interface LogoPlacementControlsProps {
  zone: EmbroideryZone;
  placement: LogoPlacement | null;
  /** only meaningful when placement exists (logo uploaded) */
  onChangeSize: (widthCm: number) => void;
  onChangeRotation: (rotation: 0 | 90 | 180 | 270) => void;
  onRemove: () => void;
}

export function LogoPlacementControls({
  zone,
  placement,
  onChangeSize,
  onChangeRotation,
  onRemove,
}: LogoPlacementControlsProps) {
  if (!placement) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface-muted px-4 py-3 text-center text-xs text-ink-muted">
        Pilih zona <strong className="text-ink">{zoneLabel(zone)}</strong> lalu
        upload logo untuk mulai mengatur.
      </div>
    );
  }

  // Approximate aspect 2.5:1 for typical chest logo; height derived.
  const widthCm = placement.widthCm;
  const heightCm = placement.heightCm;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">
          {zoneLabel(zone)} · {placement.logoFileName}
        </p>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Hapus bordir zona ini"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
          Hapus
        </button>
      </div>

      {/* Width slider */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <label htmlFor={`width-${zone}`} className="font-semibold text-ink">
            Lebar logo
          </label>
          <span className="font-mono text-brand-700">
            {widthCm.toFixed(1)} cm × {heightCm.toFixed(1)} cm
          </span>
        </div>
        <input
          id={`width-${zone}`}
          type="range"
          min={3}
          max={12}
          step={0.5}
          value={widthCm}
          onChange={(e) => onChangeSize(parseFloat(e.target.value))}
          className="w-full accent-brand-700"
        />
      </div>

      {/* Rotation */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-ink">Rotasi</p>
        <div className="flex gap-1.5">
          {([0, 90, 180, 270] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChangeRotation(r)}
              aria-pressed={placement.rotation === r}
              className={
                "flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-all " +
                (placement.rotation === r
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-line text-ink-muted hover:border-brand-300")
              }
            >
              <RotateCw className="h-3 w-3" />
              {r}°
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
