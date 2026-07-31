// src/hooks/useUniform3DConfig.ts
// Local React state for the 3D configurator. Not persisted globally — the
// config is committed to the cart item only when the customer saves.
// Phase 8 will move this to a server-persisted Uniform3DConfig entity.

"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  CameraPreset,
  EmbroideryZone,
  LogoPlacement,
  Uniform3DConfig,
} from "@/types/uniform-3d";
import { empty3DConfig } from "@/types/uniform-3d";
import { logoPlacementSchema } from "@/schemas/uniform-3d";
import { getModel3DForProduct } from "@/data/uniform-3d";

export interface UseUniform3DConfig {
  config: Uniform3DConfig | null;
  hasModel: boolean;
  isFallback: boolean;
  init: (productId: string, color: string) => void;
  setColor: (color: string) => void;
  setActiveCamera: (preset: CameraPreset) => void;
  addOrUpdatePlacement: (placement: LogoPlacement) => { ok: boolean; reason?: string };
  removePlacement: (zone: EmbroideryZone) => void;
  getPlacement: (zone: EmbroideryZone) => LogoPlacement | undefined;
  setSnapshot: (preset: CameraPreset, dataUrl: string) => void;
  reset: () => void;
}

export function useUniform3DConfig(
  productId: string,
  initialColor: string,
  model3dIdOverride?: string,
): UseUniform3DConfig {
  const registeredModel = useMemo(() => getModel3DForProduct(productId), [productId]);
  const model3dId = registeredModel?.model3dId ?? model3dIdOverride;
  const hasModel = Boolean(model3dId);
  const isFallback = !!registeredModel && registeredModel.glbUrl === null;

  const [config, setConfig] = useState<Uniform3DConfig | null>(() => {
    if (!model3dId) return null;
    return empty3DConfig(productId, model3dId, initialColor);
  });

  const init = useCallback(
    (pid: string, color: string) => {
      if (!model3dId) return;
      setConfig(empty3DConfig(pid, model3dId, color));
    },
    [model3dId],
  );

  const setColor = useCallback((color: string) => {
    setConfig((c) => (c ? { ...c, color, updatedAt: new Date().toISOString() } : c));
  }, []);

  const setActiveCamera = useCallback((preset: CameraPreset) => {
    setConfig((c) => (c ? { ...c, activeCamera: preset } : c));
  }, []);

  const addOrUpdatePlacement = useCallback(
    (placement: LogoPlacement): { ok: boolean; reason?: string } => {
      const parsed = logoPlacementSchema.safeParse(placement);
      if (!parsed.success) {
        return { ok: false, reason: parsed.error.issues[0]?.message ?? "Placement tidak valid." };
      }
      setConfig((c) => {
        if (!c) return c;
        const others = c.placements.filter((p) => p.zone !== placement.zone);
        return {
          ...c,
          placements: [...others, parsed.data],
          updatedAt: new Date().toISOString(),
        };
      });
      return { ok: true };
    },
    [],
  );

  const removePlacement = useCallback((zone: EmbroideryZone) => {
    setConfig((c) =>
      c
        ? {
            ...c,
            placements: c.placements.filter((p) => p.zone !== zone),
            updatedAt: new Date().toISOString(),
          }
        : c,
    );
  }, []);

  const getPlacement = useCallback(
    (zone: EmbroideryZone) => config?.placements.find((p) => p.zone === zone),
    [config],
  );

  const setSnapshot = useCallback((preset: CameraPreset, dataUrl: string) => {
    setConfig((c) =>
      c
        ? {
            ...c,
            snapshots: { ...c.snapshots, [preset]: dataUrl },
            updatedAt: new Date().toISOString(),
          }
        : c,
    );
  }, []);

  const reset = useCallback(() => {
    if (!model3dId) return;
    setConfig(empty3DConfig(productId, model3dId, initialColor));
  }, [model3dId, productId, initialColor]);

  return {
    config,
    hasModel,
    isFallback,
    init,
    setColor,
    setActiveCamera,
    addOrUpdatePlacement,
    removePlacement,
    getPlacement,
    setSnapshot,
    reset,
  };
}
