// src/components/configurator/CameraPresetControls.tsx
"use client";

import { cameraLabel, type CameraPreset } from "@/types/uniform-3d";
import { cn } from "@/lib/utils";

interface CameraPresetControlsProps {
  value: CameraPreset;
  onChange: (preset: CameraPreset) => void;
  presets: CameraPreset[];
}

export function CameraPresetControls({ value, onChange, presets }: CameraPresetControlsProps) {
  return (
    <div>
      <p className="type-eyebrow mb-2 text-ink-subtle">Sudut pandang</p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={value === p}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all",
              value === p
                ? "border-brand-700 bg-brand-700 text-white shadow-soft-sm"
                : "border-line bg-surface text-ink-muted hover:border-brand-300 hover:text-brand-700",
            )}
          >
            {cameraLabel(p)}
          </button>
        ))}
      </div>
    </div>
  );
}
