// src/components/configurator/Uniform3DConfigurator.tsx
// Orchestrator for the 3D configurator. This is the component that gets
// lazy-loaded (dynamic import) by ProductDetail — the heavy R3F bundle only
// arrives when the customer actually opens the 3D tab.

"use client";

import { productColorDisplayLabel, productColorSwatchStyle } from "@/lib/product-colors";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Info, Plus, ShoppingCart, Sparkles, X } from "lucide-react";

import type { OfissioProduct } from "@/features/products/product.types";
import { selectedColorVariant } from "@/features/products/color-variants";
import {
  zoneLabel,
  type CameraPreset,
  type EmbroideryZone,
  type LogoPlacement,
  type Uniform3DConfig,
} from "@/types/uniform-3d";
import { getModel3DForProduct, ZONE_ANCHORS, ZONE_CAMERA_MAP } from "@/data/uniform-3d";
import { useUniform3DConfig } from "@/hooks/use-uniform-3d-config";
import { Badge } from "@/components/ui/Badge";
import { CameraPresetControls } from "./CameraPresetControls";
import { EmbroideryZoneSelector } from "./EmbroideryZoneSelector";
import { LogoPlacementControls } from "./LogoPlacementControls";
import { LogoUploadPanel } from "./LogoUploadPanel";
import { Photo360Viewer } from "./Photo360Viewer";
import { PreviewSnapshotPanel } from "./PreviewSnapshotPanel";
import { ModelViewerErrorBoundary } from "./ModelViewerErrorBoundary";
import { hasPendingLogoUpload } from "@/schemas/uniform-3d";
import { calculateEmbroideryPricing, normalizeEmbroideryZoneId, type EmbroideryPricing } from "@/features/products/embroidery-pricing";
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import { formatIDR } from "@/types/product";
import { logoWidthRange } from "./placement-controls";
import { garmentReference, LEGACY_MODEL_UNITS_PER_CM } from "./garment-scale";
import { NameEmbroideryEditor } from "./NameEmbroideryEditor";
import { validateNameAllocations } from "@/lib/embroidery-names";
import { SizeQuantityMatrix } from "@/components/product/SizeQuantityMatrix";
import type { SizeMatrix } from "@/types/industry";
import styles from "./Studio.module.css";

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
  orderUnavailableReason?: string;
  product: OfissioProduct;
  sizes: SizeMatrix;
  onSizesChange: (sizes: SizeMatrix) => void;
  embroideryPricing?: EmbroideryPricing;
  embroideryMoq?: number;
  initialColor: string;
  selectedSleeve?: string;
  initialConfig?: Uniform3DConfig | null;
  onSave: (config: import("@/types/uniform-3d").Uniform3DConfig) => void;
  onCancel: () => void;
  priceLabel: string;
  onAddToCart: (config: import("@/types/uniform-3d").Uniform3DConfig) => void;
}



export function Uniform3DConfigurator({
  orderUnavailableReason,
  product,
  sizes,
  onSizesChange,
  embroideryPricing,
  embroideryMoq = 8,
  initialColor,
  selectedSleeve,
  initialConfig,
  onSave,
  onCancel,
  priceLabel,
  onAddToCart,
}: Uniform3DConfiguratorProps) {
  const processingInfo = resolveOrderProcessingInfo({
    processRoute: product.processRoute,
    fulfillmentType: product.fulfillment,
    leadTimeDays: product.leadTimeDays,
    hasEmbroidery: true,
  });
  const model = useMemo(() => {
    if (!product.model_3d) return undefined;
    const registered = getModel3DForProduct(product.id);
    return {
      referenceLengthCm: garmentReference(product.sku)?.lengthCm,
      productId: product.id,
      model3dId: product.model_3d.id,
      glbUrl: product.model_3d.url,
      orientationY: product.model_3d.orientationY ?? registered?.orientationY ?? 0,
      photo360: registered?.photo360 ?? null,
      depth3D: registered?.depth3D ?? null,
      depth3DDual: registered?.depth3DDual ?? null,
      depth3DQuad: registered?.depth3DQuad ?? null,
      fallbackColor: registered?.fallbackColor ?? product.accentColor,
      adjustment: {
        exposure: product.model_3d.exposure ?? 1.15,
        emissiveIntensity: product.model_3d.emissiveIntensity ?? 0.6,
        brightness: product.model_3d.brightness ?? 1,
        saturation: product.model_3d.saturation ?? 1,
        hue: product.model_3d.hue ?? 0,
        temperature: product.model_3d.temperature ?? 0,
      },
    };
  }, [product]);
  const {
    config,
    isFallback,
    setColor,
    setActiveCamera,
    addOrUpdatePlacement: persistPlacement,
    removePlacement,
    getPlacement,
    setSnapshot,
  } = useUniform3DConfig(product.id, initialColor, model?.model3dId, initialConfig);

  const initialPlacement = initialConfig?.placements[0];
  const [contentKind, setContentKind] = useState<"image" | "text">(() => initialPlacement?.textBordir ? "text" : "image");
  const [textDirty, setTextDirty] = useState(false);
  const [selectedZone, setSelectedZone] = useState<EmbroideryZone | null>(initialPlacement?.zone ?? null);
  const [isZonePickerOpen, setIsZonePickerOpen] = useState(() => !initialPlacement);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const captureFrameRef = useRef<(() => string) | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [logoUploadPending, setLogoUploadPending] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [modelThumbnails, setModelThumbnails] = useState<Partial<Record<CameraPreset, string>>>({});
  const [isQuantityOpen, setIsQuantityOpen] = useState(false);
  const quantitySectionRef = useRef<HTMLDivElement | null>(null);

  // Per-zone upload state (logo + size + rotation), kept locally so each zone
  // has its own working file before being committed as a placement.
  const [pendingLogo, setPendingLogo] = useState<{
    previewUrl: string;
    fileName: string;
    fileId: string;
    aspectRatio: number;
  } | null>(() => {
    const saved = initialPlacement;
    return saved ? {
      previewUrl: saved.logoPreviewUrl ?? "", fileName: saved.logoFileName,
      fileId: saved.logoFileId, aspectRatio: saved.widthCm / saved.heightCm,
    } : null;
  });

  // When Meshy.ai generates a real GLB, override the registry entry so the
  // viewer swaps from depth/photo360 mode into true GLB rendering.
  const [generatedGlbUrl, setGeneratedGlbUrl] = useState<string | null>(null);
  const variantAdjustment = selectedColorVariant(product, config?.color ?? initialColor)?.modelAdjustment;
  const effectiveModel = useMemo(
    () => {
      if (!model) return model;
      const selected = variantAdjustment ? { ...model, adjustment: variantAdjustment } : model;
      return generatedGlbUrl
        ? { ...selected, glbUrl: generatedGlbUrl, depth3D: null, depth3DDual: null, photo360: null }
        : selected;
    },
    [generatedGlbUrl, model, variantAdjustment],
  );

  useEffect(() => {
    setViewerReady(!effectiveModel?.glbUrl);
  }, [effectiveModel?.glbUrl]);

  const scaleSource = effectiveModel?.glbUrl;
  const [loadedScale, setLoadedScale] = useState<{ source: string | null | undefined; units: number } | null>(null);
  const onScaleReady = useCallback((units: number) => {
    setLoadedScale(previous => previous && previous.source === scaleSource && previous.units === units ? previous : { source: scaleSource, units });
  }, [scaleSource]);
  const usesGlbViewer = !!scaleSource && !effectiveModel?.depth3D && !effectiveModel?.depth3DDual && !effectiveModel?.depth3DQuad && !effectiveModel?.photo360;
  const reference = usesGlbViewer ? garmentReference(product.sku) : undefined;
  const scaleReady = !reference || !!loadedScale && loadedScale.source === scaleSource;
  const unitsPerCm = reference && loadedScale && loadedScale.source === scaleSource ? loadedScale.units : LEGACY_MODEL_UNITS_PER_CM;

  useEffect(() => {
    if (!selectedZone || product.embroidery_zones.includes(selectedZone)) return;
    setSelectedZone(null);
    setPendingLogo(null);
    setIsZonePickerOpen(true);
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
  const canAddMoreZones = placedZones.size < product.embroidery_zones.length;
  const currentPlacement = selectedZone ? getPlacement(selectedZone) : undefined;
  const reusableLogo = selectedZone && !currentPlacement
    ? config.placements.find((placement) =>
        !placement.textBordir &&
        Boolean(placement.logoPreviewUrl) &&
        Boolean(placement.logoFileId),
      )
    : undefined;
  const zoneLimits = embroideryPricing?.zones.find((zone) => zone.zoneId === normalizeEmbroideryZoneId(selectedZone));

  const allocationError = validateNameAllocations(config.placements, sizes);
  const quantity = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  const requiredEmbroideryQty = Math.max(1, Math.trunc(embroideryMoq) || 8);
  const requiredOrderQty = config.placements.length > 0
    ? Math.max(product.moq, requiredEmbroideryQty)
    : Math.max(1, product.moq);
  const orderShortfall = Math.max(0, requiredOrderQty - quantity);
  const quantityRequired = orderShortfall > 0;
  const embroideryEstimate = calculateEmbroideryPricing({ totalQty: quantity, selectedZones: config.placements.map(p => p.zone), productSupportedZones: product.embroidery_zones, globalEmbroideryPricing: embroideryPricing });

  function openQuantityStep() {
    setIsQuantityOpen(true);
    requestAnimationFrame(() => {
      quantitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      quantitySectionRef.current?.focus({ preventScroll: true });
    });
  }

  function handleOrderAction() {
    if (quantityRequired) {
      openQuantityStep();
      return;
    }
    onAddToCart(configWithSnapshot());
  }

  function selectZone(z: EmbroideryZone) {
    if (logoUploadPending || textDirty) return;
    setSelectedZone(z); setActiveCamera(ZONE_CAMERA_MAP[z] as CameraPreset);
    const saved = getPlacement(z);
    setIsZonePickerOpen(!saved);
    setContentKind(saved?.textBordir ? "text" : "image");
    setPendingLogo(saved ? { previewUrl: saved.logoPreviewUrl || "", fileName: saved.logoFileName, fileId: saved.logoFileId, aspectRatio: saved.widthCm / saved.heightCm } : null);
  }

  function addOrUpdatePlacement(placement: LogoPlacement) {
    const result = persistPlacement(placement);
    setPlacementError(result.ok ? null : result.reason ?? "Posisi logo belum dapat disimpan.");
    if (result.ok) setIsZonePickerOpen(false);
  }

  function startAddingZone() {
    if (logoUploadPending || textDirty) return;
    setSelectedZone(null);
    setPendingLogo(null);
    setContentKind("image");
    setPlacementError(null);
    setIsZonePickerOpen(true);
  }

  function removeZone(zone: EmbroideryZone) {
    removePlacement(zone);
    if (selectedZone !== zone) return;
    setSelectedZone(null);
    setPendingLogo(null);
    setContentKind("image");
    setIsZonePickerOpen(true);
  }

  function handleSave() {
    if (!config) return;
    if (textDirty || allocationError || logoUploadPending || hasPendingLogoUpload(config.placements)) return;
    onSave(configWithSnapshot());
  }

  function configWithSnapshot(): Uniform3DConfig {
    const current = config!;
    try {
      const frame = captureFrameRef.current?.();
      if (frame) return { ...current, snapshots: { ...current.snapshots, [current.activeCamera]: frame } };
    } catch { /* Saving placements still works if the device cannot export a frame. */ }
    return current;
  }

  function commitPlacementWithLogo(
    logo: { previewUrl: string; fileName: string; fileId: string; aspectRatio: number },
    widthCm: number,
    rotation: number,
  ) {
    if (!selectedZone) return;
    const range = logoWidthRange(logo.aspectRatio, zoneLimits?.maxWidthCm, zoneLimits?.maxHeightCm);
    if (range.max < range.min) {
      setPlacementError("Perbandingan lebar dan tinggi logo tidak sesuai dengan batas zona ini. Gunakan logo dengan proporsi lain.");
      return;
    }
    widthCm = Math.min(range.max, Math.max(range.min, widthCm));
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
    <div className={styles.layout}>
      {/* LEFT: 3D viewer + camera controls */}
      <div className={styles.stage}>
          {!effectiveModel.photo360 ? (
            <div className={styles.rail}>
              <CameraPresetControls
                value={config.activeCamera}
                onChange={(preset) => {
                  if (logoUploadPending || textDirty) return;
                  const candidates: EmbroideryZone[] = preset === "left" ? ["left_sleeve"] : preset === "right" ? ["right_sleeve"] : preset === "left_chest" ? ["left_chest"] : preset === "right_chest" ? ["right_chest"] : preset === "back" ? ["upper_back", "middle_back"] : ["left_chest", "right_chest"];
                  const target = selectedZone && placedZones.has(selectedZone) && candidates.includes(selectedZone)
                    ? selectedZone
                    : candidates.find(zone => placedZones.has(zone));
                  if (target) selectZone(target);
                  setActiveCamera(preset);
                }}
                presets={product.camera_presets}
                thumbnails={modelThumbnails}
                visual
              />
            </div>
          ) : null}
          <div className={styles.viewerColumn}>
            <div className={styles.viewer}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.back}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Produk
          </button>
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
                onScaleReady={onScaleReady}
                model={effectiveModel!}
                color={config.color}
                  fabricColor={selectedColorVariant(product, config.color)?.fabricColor}
                placements={config.placements}
                activeCamera={config.activeCamera}
                onThumbnailsReady={setModelThumbnails}
                highlightZone={selectedZone}
                onModelReady={() => setViewerReady(true)}
                onCanvasReady={({ domElement, captureFrame }) => {
                  canvasElRef.current = domElement;
                  captureFrameRef.current = captureFrame ?? null;
                }}
                onSurfaceClick={(hit) => {
                // Customer clicked on the GLB surface — if a zone is selected
                // and a logo is uploaded, snap the logo to the click point.
                if (!selectedZone || logoUploadPending || textDirty) return;
                const existing = getPlacement(selectedZone);
                if (!existing && !pendingLogo) return;
                const placement: LogoPlacement = existing
                  ? {
                      ...existing,
                      surfacePoint: hit.point,
                      surfaceNormal: hit.normal,
                    }
                  : {
                      zone: selectedZone,
                      logoFileId: pendingLogo!.fileId,
                      logoFileName: pendingLogo!.fileName,
                      logoPreviewUrl: pendingLogo!.previewUrl,
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
              Model 3D dari foto (depth AI)
              {effectiveModel.depth3DQuad
                ? ", 4 sisi volumetrik"
                : effectiveModel.depth3DDual
                  ? ", 360°"
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
              Foto produk asli, 360°
            </Badge>
          )}
          {!effectiveModel.photo360 && (
            <div className={styles.viewerHint}>
              Tarik untuk memutar, gulir untuk memperbesar
            </div>
          )}
          {effectiveModel.glbUrl && !viewerReady && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden bg-surface/35" aria-label="Memuat preview 3D" role="status">
              <span className="absolute inset-0 grid place-items-center text-sm text-ink">Memuat preview 3D…</span>
            </div>
          )}
          {effectiveModel.glbUrl && selectedZone && pendingLogo && (
            <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-ochre-500/90 px-4 py-1.5 text-[11px] font-semibold text-white shadow-soft-md">
              Logo menempel di {zoneLabel(selectedZone)}, klik kemeja untuk geser
            </div>
          )}
            </div>
          </div>
      </div>

      {/* RIGHT: configuration controls */}
      <div className={styles.panel}>
        <div className={styles.panelHeading}>
          <h2 className={styles.title}>Studio Bordir</h2>
          <p className={styles.productName}>{product.name}</p>
          <button type="button" onClick={onCancel} aria-label="Tutup konfigurator" className={styles.close}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-2.5 rounded-lg border border-brand-100 bg-cool-100 px-3 py-2.5 text-xs leading-5 text-brand-700" role="note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Preview bebas dicoba</p>
            <p>Unggah logo dan atur bordir tanpa minimum jumlah. Pemesanan hasil bordir minimal {requiredEmbroideryQty} pcs.</p>
          </div>
        </div>
        {/* Color picker (synced with product detail) */}
        <div>
          <h3 className={styles.label}>Warna Seragam</h3>
          <div className={styles.colors}>
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Pilih warna ${productColorDisplayLabel(c)}`}
                aria-pressed={config.color === c}
                className={styles.color}
              >
                <span
                  className={styles.swatch}
                  style={productColorSwatchStyle(c)}
                  aria-hidden="true"
                >
                </span>
                <span>{productColorDisplayLabel(c)}</span>
              </button>
            ))}
          </div>
        </div>

        <section className={styles.bordirList}>
          <div className={styles.bordirHeading}>
            <h3 className={styles.label}>Bordir Anda</h3>
            <span className={styles.bordirCount}>{config.placements.length} zona</span>
          </div>
          {config.placements.length === 0 ? (
            <div className={styles.emptyBordir}>
              <strong>Belum ada zona bordir</strong>
              <p>Pilih satu zona untuk mulai. Anda dapat menambahkan beberapa zona.</p>
            </div>
          ) : (
            <div className={styles.bordirItems}>
              {config.placements.map((placement) => (
                <div
                  key={placement.zone}
                  className={styles.bordirItem}
                  aria-current={selectedZone === placement.zone ? "true" : undefined}
                >
                  <button
                    type="button"
                    disabled={logoUploadPending || textDirty}
                    onClick={() => selectZone(placement.zone)}
                    aria-label={`Edit bordir ${zoneLabel(placement.zone)}`}
                  >
                    <strong>{zoneLabel(placement.zone)}</strong>
                    <small>{placement.textBordir ? "Bordir nama" : placement.logoFileName}, {placement.widthCm} × {placement.heightCm} cm</small>
                  </button>
                  <button
                    type="button"
                    disabled={logoUploadPending || textDirty}
                    onClick={() => removeZone(placement.zone)}
                    aria-label={`Hapus bordir ${zoneLabel(placement.zone)}`}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
          {config.placements.length > 0 && canAddMoreZones && !isZonePickerOpen ? (
            <button
              type="button"
              className={styles.addZone}
              disabled={logoUploadPending || textDirty}
              onClick={startAddingZone}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah zona bordir lain
            </button>
          ) : null}
          {config.placements.length > 0 && !canAddMoreZones ? (
            <p className={styles.help}>Semua zona bordir yang tersedia sudah ditambahkan.</p>
          ) : null}
        </section>

        {isZonePickerOpen ? (
          <EmbroideryZoneSelector
            heading={config.placements.length === 0 ? "1. Pilih zona bordir" : "Pilih zona berikutnya"}
            description={config.placements.length === 0
              ? "Pilih bagian pakaian yang akan diberi bordir. Pilihan ini belum menambahkan biaya."
              : "Pilih zona baru untuk ditambahkan, atau pilih zona bertanda centang untuk mengeditnya."}
            zones={product.embroidery_zones}
            selectedZone={selectedZone}
            onSelect={selectZone}
            placedZones={placedZones}
          />
        ) : null}

        {selectedZone && (
          <section className={styles.zoneEditor} aria-label={`Pengaturan bordir ${zoneLabel(selectedZone)}`}>
            <div className={styles.editorHeading}>
              <h3 className={styles.label}>
                {currentPlacement ? `Edit isi bordir · ${zoneLabel(selectedZone)}` : "2. Pilih isi bordir"}
              </h3>
              <p className={styles.help}>
                {currentPlacement
                  ? `Perubahan di bawah hanya berlaku untuk ${zoneLabel(selectedZone)}.`
                  : `Tambahkan logo, gambar, atau nama pada ${zoneLabel(selectedZone)}.`}
              </p>
            </div>
            <div className={styles.contentKinds} aria-label="Isi bordir"><button type="button" disabled={logoUploadPending || textDirty} aria-pressed={contentKind === "image"} onClick={() => setContentKind("image")}>Logo / gambar</button><button type="button" disabled={logoUploadPending || textDirty} aria-pressed={contentKind === "text"} onClick={() => setContentKind("text")}>Nama / teks</button></div>
            {contentKind === "text" ? <NameEmbroideryEditor key={selectedZone} value={currentPlacement?.textBordir} sizes={sizes} onDirty={setTextDirty} onApply={(text, preview, aspect) => {
              const anchor = ZONE_ANCHORS[selectedZone];
              const range = logoWidthRange(aspect,zoneLimits?.maxWidthCm,zoneLimits?.maxHeightCm);
              const width = Math.min(range.max,Math.max(range.min,currentPlacement?.widthCm || 8));
              addOrUpdatePlacement({ ...currentPlacement, zone: selectedZone, logoFileId: `text-${selectedZone}`, logoFileName: "Bordir nama", textBordir: text, logoPreviewUrl: preview, widthCm: width, heightCm: Math.max(1,Math.round(width / aspect * 100) / 100), rotation: currentPlacement?.rotation || 0, technique: "embroidery", surfacePoint: currentPlacement?.surfacePoint || [anchor.x,anchor.y,anchor.z] });
              setPendingLogo(null);
            }} /> : (
              <>
                {reusableLogo ? (
                  <button
                    type="button"
                    className={styles.reuseLogo}
                    onClick={() => {
                      const logo = {
                        previewUrl: reusableLogo.logoPreviewUrl!,
                        fileName: reusableLogo.logoFileName,
                        fileId: reusableLogo.logoFileId,
                        aspectRatio: reusableLogo.widthCm / reusableLogo.heightCm,
                      };
                      setPendingLogo(logo);
                      commitPlacementWithLogo(logo, 8, 0);
                    }}
                  >
                    <strong>Gunakan logo yang sama</strong>
                    <span>{reusableLogo.logoFileName} · tidak perlu unggah ulang</span>
                  </button>
                ) : null}
                <LogoUploadPanel
                  key={selectedZone}
                  previewUrl={currentPlacement?.textBordir ? undefined : currentPlacement?.logoPreviewUrl}
                  fileName={pendingLogo?.fileName}
                  onUploaded={({ previewUrl, fileName, fileId, aspectRatio }) => {
                    const logo = { previewUrl, fileName, fileId, aspectRatio };
                    setPendingLogo(logo);
                    // Pass logo directly to commitPlacement (can't rely on state
                    // because setPendingLogo is async — state not updated yet).
                    commitPlacementWithLogo(logo, 8, 0);
                  }}
                  onClear={() => removeZone(selectedZone)}
                  onUploadStateChange={setLogoUploadPending}
                />
              </>
            )}
            {currentPlacement ? (
              <div className={styles.placementSection}>
                <div className={styles.editorHeading}>
                  <h3 className={styles.label}>3. Atur ukuran dan posisi</h3>
                  <p className={styles.help}>Sesuaikan hasil pada model, lalu simpan preview atau tambahkan zona lainnya.</p>
                </div>
                {reference && <p className={styles.help}>
                  Acuan preview: ukuran {reference.size}, panjang {reference.lengthCm} cm, dada {reference.chestWidthCm} cm, bahu {reference.shoulderWidthCm} cm.
                  {" "}Skala visual perkiraan: tinggi model termasuk kerah; posisi dan ukuran akhir dikonfirmasi sebelum produksi.
                </p>}
                <LogoPlacementControls
                  unitsPerCm={unitsPerCm}
                  key={`controls-${selectedZone}`}
                  zone={selectedZone}
                  placement={currentPlacement}
                  maxWidthCm={zoneLimits?.maxWidthCm}
                  maxHeightCm={zoneLimits?.maxHeightCm}
                  disabled={logoUploadPending || textDirty || !scaleReady}
                  onChangeSize={(widthCm) => {
                    addOrUpdatePlacement({
                      ...currentPlacement,
                      widthCm,
                      heightCm: parseFloat(
                        (widthCm / (currentPlacement.widthCm / currentPlacement.heightCm)).toFixed(1),
                      ),
                    });
                  }}
                  onChangeRotation={(rotation) => addOrUpdatePlacement({ ...currentPlacement, rotation })}
                  onRemove={() => removeZone(selectedZone)}
                  onChangePosition={(axis, value) => {
                    const point: [number, number, number] = currentPlacement.surfacePoint
                      ? [currentPlacement.surfacePoint[0], currentPlacement.surfacePoint[1], currentPlacement.surfacePoint[2]]
                      : [ZONE_ANCHORS[selectedZone].x, ZONE_ANCHORS[selectedZone].y, ZONE_ANCHORS[selectedZone].z + 0.3];
                    const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
                    point[index] = value;
                    addOrUpdatePlacement({ ...currentPlacement, surfacePoint: point });
                  }}
                />
              </div>
            ) : null}
          </section>
        )}

        {textDirty && <p className={styles.help} role="status">Terapkan perubahan nama sebelum berpindah zona atau menyimpan.</p>}
        {allocationError && <p role="alert" className="text-xs text-red-700">{allocationError}</p>}
        {placementError && <p role="alert" className="text-sm text-red-700">{placementError}</p>}
        {orderUnavailableReason && <p role="status" className="text-xs text-amber-800">{orderUnavailableReason}</p>}
        {config.placements.length > 0 && (
          <details className={styles.summary}>
            <summary>Ringkasan biaya, {config.placements.length} zona bordir</summary>
            <ul>{config.placements.map((p) => (
              <li key={p.zone}><span>{zoneLabel(p.zone)}</span><span>{p.widthCm} × {p.heightCm} cm</span></li>
            ))}</ul>
            {embroideryEstimate.lines.map(line => <p key={line.zoneId} className={styles.help}>{zoneLabel(config.placements.find(p => normalizeEmbroideryZoneId(p.zone) === line.zoneId)!.zone)}: {formatIDR(line.subtotal)}</p>)}
            <p className={styles.help}>Total bordir: {formatIDR(embroideryEstimate.total)} untuk {quantity} pcs. Harga mengikuti tarif zona yang berlaku.</p>
          </details>
        )}
        {isQuantityOpen && (
          <div
            ref={quantitySectionRef}
            tabIndex={-1}
            className={styles.quantitySection}
            aria-labelledby="studio-quantity-title"
          >
            <div className={styles.quantityHeading}>
              <div>
                <h3 id="studio-quantity-title" className={styles.label}>4. Atur jumlah pesanan</h3>
                <p className={styles.help}>
                  Pilih jumlah setiap ukuran di sini. Jumlah yang sama juga tersimpan di halaman produk.
                </p>
              </div>
              <button
                type="button"
                className={styles.quantityClose}
                onClick={() => setIsQuantityOpen(false)}
                aria-label="Tutup pengaturan quantity"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <SizeQuantityMatrix
              productId={product.id}
              availableSizes={product.available_sizes}
              color={config.color}
              selectedSleeve={selectedSleeve}
              value={sizes}
              onChange={onSizesChange}
              moq={product.moq}
              sizeChart={product.sizeChart}
              embroideryMoq={requiredEmbroideryQty}
              hasEmbroidery={config.placements.length > 0}
              disabled={!!orderUnavailableReason}
            />
          </div>
        )}
        {Object.values(config.snapshots).some(Boolean) && (
          <details className={styles.summary}>
            <summary>Preview tersimpan</summary>
            <div className="mt-3"><PreviewSnapshotPanel snapshots={config.snapshots} onCapture={captureSnapshot} /></div>
          </details>
        )}
        {logoUploadPending && <p className={styles.help} role="status">Menyimpan logo…</p>}
      </div>
      <div className={styles.footer}>
        <div>
          <p className={styles.price}>{priceLabel.replace(/\s*\/\s*pcs$/, "")} <small>/ pcs</small></p>
          <p className={styles.help}>
            {processingInfo.label} {processingInfo.value}{processingInfo.kind === "embroidery" ? ", tergantung jumlah." : "."}
          </p>
          {config.placements.length > 0 && <p className={styles.help}>Harga produk + bordir {quantity > 0 ? `${formatIDR(embroideryEstimate.total / quantity)} / pcs` : "sesuai jumlah pesanan"}{embroideryEstimate.missingPricingZones.length > 0 ? ", Sebagian tarif perlu dikonfirmasi" : ""}</p>}
          {quantityRequired ? (
            <p className="text-xs font-semibold text-ochre-800" role="status">
              Saat ini {quantity} pcs. Tambah {orderShortfall} pcs lagi untuk melanjutkan pesanan{config.placements.length > 0 ? " bordir" : ""}.
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={handleSave}
            disabled={textDirty || !!allocationError || logoUploadPending || hasPendingLogoUpload(config.placements)}
            aria-busy={logoUploadPending} className={styles.save}>
            {logoUploadPending ? "Menyimpan logo…" : "Simpan Preview"}
          </button>
          <button type="button" onClick={handleOrderAction}
            disabled={!!orderUnavailableReason || textDirty || !!allocationError || logoUploadPending || hasPendingLogoUpload(config.placements)}
            className={styles.add}>
            <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden="true" />
            {quantityRequired
              ? config.placements.length > 0
                ? `Atur quantity — min. ${requiredOrderQty} pcs`
                : "Atur quantity untuk memesan"
              : `Tambahkan ${quantity} pcs ke Keranjang`}
          </button>
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
