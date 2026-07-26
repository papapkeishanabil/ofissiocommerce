// src/components/configurator/PreviewSnapshotPanel.tsx
// Image-based preview snapshots — NOT active 3D renders. We grab a still from
// the canvas once per camera preset the customer visits, so a small floating
// preview elsewhere (cart item, mini preview) stays cheap.

"use client";

import { cameraLabel, type CameraPreset } from "@/types/uniform-3d";
import { Camera } from "lucide-react";

interface PreviewSnapshotPanelProps {
  snapshots: Partial<Record<CameraPreset, string>>;
  onCapture: (preset: CameraPreset) => void;
}

export function PreviewSnapshotPanel({
  snapshots,
  onCapture,
}: PreviewSnapshotPanelProps) {
  const presetsWithSnap: CameraPreset[] = ["front", "right", "back", "left"];
  return (
    <div>
      <p className="type-eyebrow mb-2 flex items-center gap-1 text-ink-subtle">
        <Camera className="h-3 w-3" />
        Snapshot simpan
      </p>
      <div className="grid grid-cols-2 gap-2">
        {presetsWithSnap.map((p) => {
          const url = snapshots[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => onCapture(p)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface transition-all hover:border-brand-300 hover:shadow-soft-sm"
              aria-label={`Simpan snapshot ${cameraLabel(p)}`}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={cameraLabel(p)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-cool-100 to-cool-200 text-ink-subtle">
                  <Camera className="h-4 w-4" />
                  <span className="text-[10px] font-semibold">
                    {cameraLabel(p)}
                  </span>
                </div>
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-0.5 text-left text-[9px] font-semibold text-white">
                {cameraLabel(p)} · {url ? "tap ulang" : "tap simpan"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
