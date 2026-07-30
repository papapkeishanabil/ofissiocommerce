// src/types/uniform-3d.ts
// Domain types for the 3D uniform configurator (Phase 4 / MVP).
// Designed to be GLB-agnostic at first — the viewer has a graceful fallback
// when no GLB model is registered for a product.

/** Predefined embroidery zones. Locked set — customers can only pick these. */
export const EMBROIDERY_ZONES = [
  "left_chest",
  "right_chest",
  "left_sleeve",
  "right_sleeve",
  "upper_back",
  "middle_back",
] as const;

export type EmbroideryZone = (typeof EMBROIDERY_ZONES)[number];

export function zoneLabel(z: EmbroideryZone): string {
  switch (z) {
    case "left_chest":
      return "Dada Kiri";
    case "right_chest":
      return "Dada Kanan";
    case "left_sleeve":
      return "Lengan Kiri";
    case "right_sleeve":
      return "Lengan Kanan";
    case "upper_back":
      return "Punggung Atas";
    case "middle_back":
      return "Punggung Tengah";
  }
}

export function zoneShortCode(z: EmbroideryZone): string {
  switch (z) {
    case "left_chest":
      return "DL";
    case "right_chest":
      return "DK";
    case "left_sleeve":
      return "LK";
    case "right_sleeve":
      return "RK";
    case "upper_back":
      return "PA";
    case "middle_back":
      return "PT";
  }
}

export type EmbroideryTechnique = "embroidery" | "print" | "patch";

/** A single logo placement on the uniform. */
export interface LogoPlacement {
  zone: EmbroideryZone;
  /** Object-storage file id (placeholder for Phase 4; AV scan in Phase 8) */
  logoFileId: string;
  /** Display filename for UI */
  logoFileName: string;
  logoLabel?: string;
  /** Object URL for in-memory preview (client only, not persisted) */
  logoPreviewUrl?: string;
  widthCm: number;
  heightCm: number;
  /** degrees, 0 / 90 / 180 / 270 */
  rotation: number;
  technique: EmbroideryTechnique;
  /** Raycast surface point [x,y,z] — set when customer clicks on GLB surface */
  surfacePoint?: [number, number, number];
  /** Surface normal [x,y,z] at click point — logo oriented to face this */
  surfaceNormal?: [number, number, number];
  notes?: string;
}

/** Camera presets the customer can switch between. */
export const CAMERA_PRESETS = [
  "front",
  "back",
  "left",
  "right",
  "right_chest",
  "left_chest",
] as const;

export type CameraPreset = (typeof CAMERA_PRESETS)[number];

export function cameraLabel(c: CameraPreset): string {
  switch (c) {
    case "front":
      return "Depan";
    case "back":
      return "Belakang";
    case "left":
      return "Kiri";
    case "right":
      return "Kanan";
    case "right_chest":
      return "Dada Kanan";
    case "left_chest":
      return "Dada Kiri";
  }
}

/**
 * Full 3D configuration snapshot. Persisted to cart item, quotation, order.
 */
export interface Uniform3DConfig {
  productId: string;
  /** Stable model id (used to look up GLB in registry). */
  model3dId: string;
  color: string;
  placements: LogoPlacement[];
  /** snapshot URLs (placeholder for Phase 4 — image-based, not live render) */
  snapshots: Partial<Record<CameraPreset, string>>;
  /** last preset the customer viewed */
  activeCamera: CameraPreset;
  updatedAt: string;
}

export function empty3DConfig(productId: string, model3dId: string, color: string): Uniform3DConfig {
  return {
    productId,
    model3dId,
    color,
    placements: [],
    snapshots: {},
    activeCamera: "front",
    updatedAt: new Date().toISOString(),
  };
}
