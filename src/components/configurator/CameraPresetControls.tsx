// src/components/configurator/CameraPresetControls.tsx
"use client";

import { cameraLabel, type CameraPreset } from "@/types/uniform-3d";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

interface CameraPresetControlsProps {
  value: CameraPreset;
  onChange: (preset: CameraPreset) => void;
  presets: CameraPreset[];
  thumbnails?: Partial<Record<CameraPreset, string>>;
  visual?: boolean;
}

export function CameraPresetControls({
  value,
  onChange,
  presets,
  thumbnails = {},
  visual = false,
}: CameraPresetControlsProps) {
  if (visual) {
    return (
      <div>
        <p className="mb-3 text-base font-semibold text-ink">Tampilan</p>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {presets.map((preset) => {
            const thumbnail = thumbnails[preset];
            const active = value === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                aria-pressed={active}
                className={cn(
                  "relative flex min-h-[100px] w-[92px] shrink-0 flex-col overflow-hidden rounded-xl border bg-white text-[13px] font-medium text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 lg:w-full",
                  active
                    ? "border-brand-500 ring-1 ring-brand-500"
                    : "border-line hover:border-brand-300",
                )}
              >
                <span className="grid min-h-[70px] flex-1 place-items-center overflow-hidden">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail}
                      alt=""
                      className="h-[82px] w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : <Camera className="h-6 w-6 text-ink-subtle" aria-hidden="true" />}
                </span>
                <span className="w-full px-2 py-1.5 text-center">{cameraLabel(preset)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
