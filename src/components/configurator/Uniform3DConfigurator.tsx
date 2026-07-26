// src/components/configurator/Uniform3DConfigurator.tsx
// Orchestrator for the 3D configurator. This is the component that gets
// lazy-loaded (dynamic import) by ProductDetail — the heavy R3F bundle only
// arrives when the customer actually opens the 3D tab.

"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Box, Save, Sparkles } from "lucide-react";

import type { Product } from "@/types/product";
import {
  type CameraPreset,
  type EmbroideryZone,
  type LogoPlacement,
} from "@/types/uniform-3d";
import { getModel3DForProduct } from "@/data/uniform-3d";
import { useUniform3DConfig } from "@/hooks/use-uniform-3d-config";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CameraPresetControls } from "./CameraPresetControls";
import { EmbroideryZoneSelector } from "./EmbroideryZoneSelector";
import { LogoPlacementControls } from "./LogoPlacementControls";
import { LogoUploadPanel } from "./LogoUploadPanel";
import { PreviewSnapshotPanel } from "./PreviewSnapshotPanel";

// Lazy-load the R3F canvas + three.js bundle.
const Uniform3DViewer = dynamic(
  () => import("./Uniform3DViewer").then((m) => m.Uniform3DViewer),
  {
    ssr: false,
    loading: () => <ViewerSkeleton />,
  },
);

interface Uniform3DConfiguratorProps {
  product: Product;
  initialColor: string;
  onSave: (config: import("@/types/uniform-3d").Uniform3DConfig) => void;
  onCancel: () => void;
}

export function Uniform3DConfigurator({
  product,
  initialColor,
  onSave,
  onCancel,
}: Uniform3DConfiguratorProps) {
  const model = useMemo(() => getModel3DForProduct(product.id), [product.id]);
  const {
    config,
    isFallback,
    setColor,
    setActiveCamera,
    addOrUpdatePlacement,
    removePlacement,
    getPlacement,
    setSnapshot,
  } = useUniform3DConfig(product.id, initialColor);

  const [selectedZone, setSelectedZone] = useState<EmbroideryZone | null>("left_chest");
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  // Per-zone upload state (logo + size + rotation), kept locally so each zone
  // has its own working file before being committed as a placement.
  const [pendingLogo, setPendingLogo] = useState<{
    previewUrl: string;
    fileName: string;
    fileId: string;
  } | null>(null);

  if (!model || !config) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-muted px-6 py-10 text-center">
        <p className="text-sm font-semibold text-ink">Preview 3D belum tersedia</p>
        <p className="mt-1 text-xs text-ink-muted">
          Produk ini belum didukung konfigurator 3D.
        </p>
      </div>
    );
  }

  const placedZones = new Set(config.placements.map((p) => p.zone));
  const currentPlacement = selectedZone ? getPlacement(selectedZone) : undefined;

  function handleSave() {
    if (!config) return;
    onSave(config);
  }

  function commitPlacement(widthCm: number, rotation: 0 | 90 | 180 | 270) {
    if (!selectedZone || !pendingLogo) return;
    // Derive height from typical logo aspect 2.5:1 (W:H). Real logo aspect
    // detection deferred to Phase 8.
    const heightCm = parseFloat((widthCm / 2.5).toFixed(1));
    const placement: LogoPlacement = {
      zone: selectedZone,
      logoFileId: pendingLogo.fileId,
      logoFileName: pendingLogo.fileName,
      logoPreviewUrl: pendingLogo.previewUrl,
      widthCm,
      heightCm,
      rotation,
      technique: "embroidery",
    };
    addOrUpdatePlacement(placement);
  }

  function captureSnapshot(preset: CameraPreset) {
    setActiveCamera(preset);
    // Wait a frame so camera animates, then grab canvas pixels.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = canvasElRef.current;
        if (!canvas) return;
        try {
          const dataUrl = canvas.toDataURL("image/png");
          setSnapshot(preset, dataUrl);
        } catch {
          // tainted canvas / not ready — silent fail (Phase 8 will use server render)
        }
      });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* LEFT: 3D viewer + camera controls */}
      <div className="space-y-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-cool-100 via-surface to-cool-200 shadow-soft-sm sm:aspect-[4/3] lg:aspect-[5/4]">
          <Uniform3DViewer
            model={model}
            color={config.color}
            placements={config.placements}
            activeCamera={config.activeCamera}
            highlightZone={selectedZone}
            onCanvasReady={({ domElement }) => {
              canvasElRef.current = domElement;
            }}
          />
          {isFallback && (
            <Badge
              tone="neutral"
              className="absolute left-3 top-3 bg-white/90"
            >
              <Sparkles className="h-3 w-3" />
              Preview model prosedural
            </Badge>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-ink-muted shadow-soft-xs backdrop-blur">
            Drag untuk rotate · scroll untuk zoom
          </div>
        </div>
        <CameraPresetControls
          value={config.activeCamera}
          onChange={(p) => setActiveCamera(p)}
        />
        <PreviewSnapshotPanel
          snapshots={config.snapshots}
          onCapture={captureSnapshot}
        />
      </div>

      {/* RIGHT: configuration controls */}
      <div className="space-y-4">
        {/* Color picker (synced with product detail) */}
        <div>
          <p className="type-eyebrow mb-2 text-ink-subtle">Warna seragam</p>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={config.color === c}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all " +
                  (config.color === c
                    ? "border-brand-700 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                    : "border-line bg-surface text-ink-muted hover:border-brand-300")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <EmbroideryZoneSelector
          selectedZone={selectedZone}
          onSelect={(z) => {
            setSelectedZone(z);
            // reset pending upload when switching zones without commit
            const existing = getPlacement(z);
            if (existing) {
              setPendingLogo({
                previewUrl: existing.logoPreviewUrl ?? "",
                fileName: existing.logoFileName,
                fileId: existing.logoFileId,
              });
            } else {
              setPendingLogo(null);
            }
          }}
          placedZones={placedZones}
        />

        {selectedZone && (
          <>
            <LogoUploadPanel
              previewUrl={pendingLogo?.previewUrl}
              fileName={pendingLogo?.fileName}
              onUploaded={({ previewUrl, fileName, fileId }) => {
                setPendingLogo({ previewUrl, fileName, fileId });
                // auto-commit with default size so it appears on the model
                commitPlacement(8, 0);
              }}
              onClear={() => {
                setPendingLogo(null);
                removePlacement(selectedZone);
              }}
            />
            <LogoPlacementControls
              zone={selectedZone}
              placement={currentPlacement ?? null}
              onChangeSize={(w) => {
                if (!currentPlacement) {
                  commitPlacement(w, 0);
                  return;
                }
                const next: LogoPlacement = {
                  ...currentPlacement,
                  widthCm: w,
                  heightCm: parseFloat((w / 2.5).toFixed(1)),
                };
                addOrUpdatePlacement(next);
              }}
              onChangeRotation={(r) => {
                if (!currentPlacement) {
                  commitPlacement(8, r);
                  return;
                }
                addOrUpdatePlacement({ ...currentPlacement, rotation: r });
              }}
              onRemove={() => {
                removePlacement(selectedZone);
                setPendingLogo(null);
              }}
            />
          </>
        )}

        {/* Summary + actions */}
        <div className="rounded-xl border border-line bg-surface-muted p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Box className="h-3.5 w-3.5 text-brand-700" />
              {config.placements.length} titik bordir
            </span>
            <span className="font-mono text-[10px] text-ink-subtle">
              {config.snapshots.front ? "snapshot ✓" : "belum snapshot"}
            </span>
          </div>
          {config.placements.length > 0 && (
            <ul className="mt-2 space-y-1 text-[10px] text-ink-muted">
              {config.placements.map((p) => (
                <li key={p.zone} className="flex items-center justify-between">
                  <span>{p.zone.replace(/_/g, " ")}</span>
                  <span className="font-mono">
                    {p.widthCm}×{p.heightCm}cm · {p.rotation}°
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4" />
            Simpan Konfigurasi
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}

function ViewerSkeleton() {
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-cool-100 to-cool-200">
      <div className="flex flex-col items-center gap-2 text-ink-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
        <span className="text-xs font-medium">Memuat model 3D…</span>
      </div>
    </div>
  );
}
