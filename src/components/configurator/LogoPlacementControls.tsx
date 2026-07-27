// src/components/configurator/LogoPlacementControls.tsx
"use client";

import { RotateCw, Trash2 } from "lucide-react";

import type { EmbroideryZone, LogoPlacement } from "@/types/uniform-3d";
import { zoneLabel } from "@/types/uniform-3d";
import { Button } from "@/components/ui/Button";

interface LogoPlacementControlsProps {
  zone: EmbroideryZone;
  placement: LogoPlacement | null;
  onChangeSize: (widthCm: number) => void;
  onChangeRotation: (rotation: 0 | 90 | 180 | 270) => void;
  onRemove: () => void;
  /** Fine-tune position offsets (added to zone anchor) */
  onChangePosition?: (axis: "x" | "y" | "z", offset: number) => void;
}

export function LogoPlacementControls({
  zone,
  placement,
  onChangeSize,
  onChangeRotation,
  onRemove,
  onChangePosition,
}: LogoPlacementControlsProps) {
  if (!placement) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface-muted px-4 py-3 text-center text-xs text-ink-muted">
        Pilih zona <strong className="text-ink">{zoneLabel(zone)}</strong> lalu
        upload logo untuk mulai mengatur.
      </div>
    );
  }

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

      {/* Position fine-tune (X/Y/Z sliders) */}
      {onChangePosition && (
        <div className="space-y-2 border-t border-line pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            Geser posisi
          </p>
          {(["x", "y", "z"] as const).map((axis) => {
            const val = (placement.surfacePoint?.[axis === "x" ? 0 : axis === "y" ? 1 : 2] ?? 0);
            const anchorOffset = 0; // relative to default anchor
            return (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-bold uppercase text-ink-subtle">
                  {axis === "x" ? "↔" : axis === "y" ? "↕" : "⇄"} {axis}
                </span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={val}
                  onChange={(e) => onChangePosition(axis, parseFloat(e.target.value))}
                  className="flex-1 accent-brand-700"
                />
                <span className="w-10 text-right font-mono text-[9px] text-ink-muted">
                  {val.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
