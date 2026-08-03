// src/components/configurator/Uniform3DConfigurator.tsx
// Orchestrator for the 3D configurator. This is the component that gets
// lazy-loaded (dynamic import) by ProductDetail — the heavy R3F bundle only
// arrives when the customer actually opens the 3D tab.

"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Save, Sparkles } from "lucide-react";

import type { OfissioProduct } from "@/features/products/product.types";
import {
  type CameraPreset,
  type EmbroideryZone,
  type LogoPlacement,
} from "@/types/uniform-3d";
import { getModel3DForProduct, ZONE_ANCHORS, ZONE_CAMERA_MAP } from "@/data/uniform-3d";
import { useUniform3DConfig } from "@/hooks/use-uniform-3d-config";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CameraPresetControls } from "./CameraPresetControls";
import { EmbroideryZoneSelector } from "./EmbroideryZoneSelector";
import { LogoPlacementControls } from "./LogoPlacementControls";
import { LogoUploadPanel } from "./LogoUploadPanel";
import { Photo360Viewer } from "./Photo360Viewer";
import { PreviewSnapshotPanel } from "./PreviewSnapshotPanel";
import { ModelViewerErrorBoundary } from "./ModelViewerErrorBoundary";
import { hasPendingLogoUpload } from "@/schemas/uniform-3d";

// Lazy-load the R3F canvases (three.js bundle). Photo360 is plain HTML so it
// doesn't need to be lazy.
const Depth3DViewer = dynamic(
  () => import("./Depth3DViewer").then((m) => m.Depth3DViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> },
);
const Uniform3DViewer = dynamic(
  () => import("./Uniform3DViewer").then((m) => m.Uniform3DViewer),
  {
    ssr: false,
    loading: () => <ViewerSkeleton />,
  },
);

interface Uniform3DConfiguratorProps {
  product: OfissioProduct;
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
  const model = useMemo(() => {
    if (!product.model_3d) return undefined;
    const registered = getModel3DForProduct(product.id);
    return {
      productId: product.id,
      model3dId: product.model_3d.id,
      glbUrl: product.model_3d.url,
      photo360: registered?.photo360 ?? null,
      depth3D: registered?.depth3D ?? null,
      depth3DDual: registered?.depth3DDual ?? null,
      depth3DQuad: registered?.depth3DQuad ?? null,
      fallbackColor: registered?.fallbackColor ?? product.accentColor,
    };
  }, [product]);
  const {
    config,
    isFallback,
    setColor,
    setActiveCamera,
    addOrUpdatePlacement,
    removePlacement,
    getPlacement,
    setSnapshot,
  } = useUniform3DConfig(product.id, initialColor, model?.model3dId);

  const [selectedZone, setSelectedZone] = useState<EmbroideryZone | null>("left_chest");
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [logoUploadPending, setLogoUploadPending] = useState(false);

  // Per-zone upload state (logo + size + rotation), kept locally so each zone
  // has its own working file before being committed as a placement.
  const [pendingLogo, setPendingLogo] = useState<{
    previewUrl: string;
    fileName: string;
    fileId: string;
    aspectRatio: number;
  } | null>(null);

  // When Meshy.ai generates a real GLB, override the registry entry so the
  // viewer swaps from depth/photo360 mode into true GLB rendering.
  const [generatedGlbUrl, setGeneratedGlbUrl] = useState<string | null>(null);
  const effectiveModel = useMemo(
    () =>
      generatedGlbUrl && model
        ? { ...model, glbUrl: generatedGlbUrl, depth3D: null, depth3DDual: null, photo360: null }
        : model,
    [generatedGlbUrl, model],
  );

  useEffect(() => {
    setViewerReady(!effectiveModel?.glbUrl);
  }, [effectiveModel?.glbUrl]);

  useEffect(() => {
    if (selectedZone && product.embroidery_zones.includes(selectedZone)) return;
    setSelectedZone(product.embroidery_zones[0] ?? null);
  }, [product.embroidery_zones, selectedZone]);

  useEffect(() => {
    if (product.camera_presets.includes(config?.activeCamera ?? "front")) return;
    setActiveCamera(product.camera_presets[0] ?? "front");
  }, [config?.activeCamera, product.camera_presets, setActiveCamera]);

  if (!effectiveModel || !config) {
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
    if (logoUploadPending || hasPendingLogoUpload(config.placements)) return;
    onSave(config);
  }

  function commitPlacement(widthCm: number, rotation: 0 | 90 | 180 | 270) {
    if (!selectedZone || !pendingLogo) return;
    commitPlacementWithLogo(pendingLogo, widthCm, rotation);
  }

  function commitPlacementWithLogo(
    logo: { previewUrl: string; fileName: string; fileId: string; aspectRatio: number },
    widthCm: number,
    rotation: 0 | 90 | 180 | 270,
  ) {
    if (!selectedZone) return;
    const heightCm = parseFloat((widthCm / logo.aspectRatio).toFixed(1));
    const anchor = ZONE_ANCHORS[selectedZone];
    const placement: LogoPlacement = {
      zone: selectedZone,
      logoFileId: logo.fileId,
      logoFileName: logo.fileName,
      logoPreviewUrl: logo.previewUrl,
      widthCm,
      heightCm,
      rotation,
      technique: "embroidery",
      surfacePoint: [anchor.x, anchor.y, anchor.z] as [number, number, number],
      surfaceNormal: selectedZone === "upper_back" || selectedZone === "middle_back"
        ? [0, 0, -1]
        : selectedZone === "left_sleeve"
          ? [-1, 0, 0]
          : selectedZone === "right_sleeve"
            ? [1, 0, 0]
            : [0, 0, 1],
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
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(288px,360px)] xl:gap-6">
      {/* LEFT: 3D viewer + camera controls */}
      <div className="space-y-3 rounded-3xl border border-white/80 bg-white/90 p-3 shadow-soft-sm backdrop-blur sm:p-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="type-eyebrow text-brand-700">Kanvas desain</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">Putar model atau pilih sudut pandang untuk mengatur bordir.</p>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">Live 3D</span>
        </div>
        <div className="relative h-[490px] overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-cool-100 via-surface to-cool-200 shadow-inner sm:h-[550px] lg:h-[600px]">
          {effectiveModel.depth3DQuad ? (
            <Depth3DViewer
              colorImageSrc={effectiveModel.depth3DQuad.front.colorImage}
              depthImageSrc={effectiveModel.depth3DQuad.front.depthImage}
              depthStrength={effectiveModel.depth3DQuad.front.depthStrength ?? 0.55}
              backColorImageSrc={effectiveModel.depth3DQuad.back.colorImage}
              backDepthImageSrc={effectiveModel.depth3DQuad.back.depthImage}
              backDepthStrength={effectiveModel.depth3DQuad.back.depthStrength ?? 0.55}
              leftColorImageSrc={effectiveModel.depth3DQuad.left.colorImage}
              leftDepthImageSrc={effectiveModel.depth3DQuad.left.depthImage}
              leftDepthStrength={effectiveModel.depth3DQuad.left.depthStrength ?? 0.55}
              rightColorImageSrc={effectiveModel.depth3DQuad.right.colorImage}
              rightDepthImageSrc={effectiveModel.depth3DQuad.right.depthImage}
              rightDepthStrength={effectiveModel.depth3DQuad.right.depthStrength ?? 0.55}
              placements={config.placements}
              highlightZone={selectedZone}
              onCanvasReady={({ domElement }) => {
                canvasElRef.current = domElement;
              }}
            />
          ) : effectiveModel.depth3DDual ? (
            <Depth3DViewer
              colorImageSrc={effectiveModel.depth3DDual.front.colorImage}
              depthImageSrc={effectiveModel.depth3DDual.front.depthImage}
              depthStrength={effectiveModel.depth3DDual.front.depthStrength ?? 0.6}
              backColorImageSrc={effectiveModel.depth3DDual.back.colorImage}
              backDepthImageSrc={effectiveModel.depth3DDual.back.depthImage}
              backDepthStrength={effectiveModel.depth3DDual.back.depthStrength ?? 0.6}
              placements={config.placements}
              highlightZone={selectedZone}
              onCanvasReady={({ domElement }) => {
                canvasElRef.current = domElement;
              }}
            />
          ) : effectiveModel.depth3D ? (
            <Depth3DViewer
              colorImageSrc={effectiveModel.depth3D.colorImage}
              depthImageSrc={effectiveModel.depth3D.depthImage}
              depthStrength={effectiveModel.depth3D.depthStrength ?? 0.6}
              placements={config.placements}
              highlightZone={selectedZone}
              onCanvasReady={({ domElement }) => {
                canvasElRef.current = domElement;
              }}
            />
          ) : effectiveModel.photo360 ? (
            <Photo360Viewer
              photoSet={effectiveModel.photo360}
              placements={config.placements}
              highlightZone={selectedZone}
            />
          ) : (
            <ModelViewerErrorBoundary
              resetKey={effectiveModel.glbUrl ?? effectiveModel.model3dId}
              onError={() => setViewerReady(true)}
            >
              <Uniform3DViewer
                model={effectiveModel!}
                color={config.color}
                placements={config.placements}
                activeCamera={config.activeCamera}
                highlightZone={selectedZone}
                onModelReady={() => setViewerReady(true)}
                onCanvasReady={({ domElement }) => {
                  canvasElRef.current = domElement;
                }}
                onSurfaceClick={(hit) => {
                // Customer clicked on the GLB surface — if a zone is selected
                // and a logo is uploaded, snap the logo to the click point.
                if (!selectedZone || !pendingLogo) return;
                const existing = getPlacement(selectedZone);
                const placement: LogoPlacement = existing
                  ? {
                      ...existing,
                      surfacePoint: hit.point,
                      surfaceNormal: hit.normal,
                    }
                  : {
                      zone: selectedZone,
                      logoFileId: pendingLogo.fileId,
                      logoFileName: pendingLogo.fileName,
                      logoPreviewUrl: pendingLogo.previewUrl,
                      widthCm: 8,
                      heightCm: 3.2,
                      rotation: 0,
                      technique: "embroidery",
                      surfacePoint: hit.point,
                      surfaceNormal: hit.normal,
                    };
                  addOrUpdatePlacement(placement);
                }}
              />
            </ModelViewerErrorBoundary>
          )}
          {(effectiveModel.depth3D || effectiveModel.depth3DDual || effectiveModel.depth3DQuad) && (
            <Badge
              tone="brand"
              className="absolute left-3 top-3 bg-white/90"
            >
              <Sparkles className="h-3 w-3" />
              Model 3D dari foto · depth AI
              {effectiveModel.depth3DQuad
                ? " · 4-sisi volumetrik"
                : effectiveModel.depth3DDual
                  ? " · 360°"
                  : ""}
            </Badge>
          )}
          {isFallback && (
            <Badge
              tone="neutral"
              className="absolute left-3 top-3 bg-white/90"
            >
              <Sparkles className="h-3 w-3" />
              Preview model prosedural
            </Badge>
          )}
          {effectiveModel.photo360 && (
            <Badge
              tone="brand"
              className="absolute left-3 top-3 bg-white/90"
            >
              Foto produk asli · 360°
            </Badge>
          )}
          {!effectiveModel.photo360 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-ink-muted shadow-soft-xs backdrop-blur">
              Drag untuk rotate · scroll untuk zoom
            </div>
          )}
          {effectiveModel.glbUrl && !viewerReady && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden bg-surface/35" aria-label="Memuat preview 3D" role="status">
              <div className="shimmer absolute inset-0 opacity-70" />
              <div className="absolute left-1/2 top-1/2 h-[58%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[38%_38%_18%_18%] bg-brand-100/70 shadow-soft-md animate-pulse" />
              <div className="absolute left-1/2 top-[25%] h-16 w-20 -translate-x-1/2 rounded-[45%_45%_25%_25%] bg-brand-200/70 animate-pulse" />
              <span className="sr-only">Memuat preview 3D</span>
            </div>
          )}
          {effectiveModel.glbUrl && selectedZone && pendingLogo && (
            <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-ochre-500/90 px-4 py-1.5 text-[11px] font-semibold text-white shadow-soft-md">
              Logo menempel di {selectedZone.replace(/_/g, " ")} · klik kemeja untuk geser
            </div>
          )}
        </div>
        {/* Camera preset only applies to 3D model mode (photo360 uses drag) */}
        {!effectiveModel.photo360 && (
          <CameraPresetControls
            value={config.activeCamera}
            onChange={(p) => setActiveCamera(p)}
            presets={product.camera_presets}
          />
        )}
        <PreviewSnapshotPanel
          snapshots={config.snapshots}
          onCapture={captureSnapshot}
        />
      </div>

      {/* RIGHT: configuration controls */}
      <div className="space-y-4 rounded-3xl border border-white/80 bg-white/95 p-4 shadow-soft-sm backdrop-blur lg:sticky lg:top-0">
        <div className="border-b border-line pb-3">
          <p className="type-eyebrow text-brand-700">Pengaturan bordir</p>
          <p className="mt-1 text-xs text-ink-muted">Pilih area, unggah logo, lalu atur ukuran dan posisi.</p>
        </div>
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
          zones={product.embroidery_zones}
          selectedZone={selectedZone}
          onSelect={(z) => {
            setSelectedZone(z);
            // Auto-rotate camera ke zona yang dipilih
            const camPreset = ZONE_CAMERA_MAP[z];
            if (camPreset) {
              setActiveCamera(camPreset as CameraPreset);
            }
            // reset pending upload when switching zones without commit
            const existing = getPlacement(z);
            if (existing) {
              setPendingLogo({
                previewUrl: existing.logoPreviewUrl ?? "",
                fileName: existing.logoFileName,
                fileId: existing.logoFileId,
                aspectRatio: existing.widthCm / existing.heightCm,
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
              onUploaded={({ previewUrl, fileName, fileId, aspectRatio }) => {
                const logo = { previewUrl, fileName, fileId, aspectRatio };
                setPendingLogo(logo);
                // Pass logo directly to commitPlacement (can't rely on state
                // because setPendingLogo is async — state not updated yet).
                commitPlacementWithLogo(logo, 8, 0);
              }}
              onClear={() => {
                setPendingLogo(null);
                removePlacement(selectedZone);
              }}
              onUploadStateChange={setLogoUploadPending}
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
                  heightCm: parseFloat(
                    (w / (currentPlacement.widthCm / currentPlacement.heightCm)).toFixed(1),
                  ),
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
              onChangePosition={(axis, val) => {
                if (!currentPlacement) return;
                const pt: [number, number, number] = currentPlacement.surfacePoint
                  ? [currentPlacement.surfacePoint[0], currentPlacement.surfacePoint[1], currentPlacement.surfacePoint[2]]
                  : [ZONE_ANCHORS[selectedZone].x, ZONE_ANCHORS[selectedZone].y, ZONE_ANCHORS[selectedZone].z + 0.3];
                const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
                pt[idx] = val;
                addOrUpdatePlacement({
                  ...currentPlacement,
                  surfacePoint: pt,
                });
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
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={logoUploadPending || hasPendingLogoUpload(config.placements)}
            aria-busy={logoUploadPending}
          >
            <Save className="h-4 w-4" />
            {logoUploadPending ? "Menyimpan logo..." : "Simpan Konfigurasi"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Batal
          </Button>
        </div>
        {logoUploadPending || hasPendingLogoUpload(config.placements) ? (
          <p className="text-[11px] text-amber-700" role="status">
            Tunggu sampai logo selesai tersimpan sebelum menyimpan konfigurasi.
          </p>
        ) : null}
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
