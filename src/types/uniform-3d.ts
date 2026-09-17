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

export function embroideryTechniqueLabel(technique: EmbroideryTechnique): string {
  switch (technique) {
    case "embroidery":
      return "Bordir";
    case "print":
      return "Cetak";
    case "patch":
      return "Patch";
  }
}

/** A single logo placement on the uniform. */
export interface LogoPlacement {
  textBordir?: {
    mode: "same" | "individual";
    name: string;
    font: "sans" | "serif";
    color: string;
    allocations: { name: string; size: "S" | "M" | "L" | "XL" | "2XL" | "3XL"; quantity: number }[];
  };
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
  /** Whole degrees, -360 through 360; independently stored for each zone. */
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

/**
 * Rotasi koreksi terhadap sumbu Y agar bagian depan GLB menghadap kamera +Z.
 * Export dari aplikasi 3D tidak selalu memakai sumbu depan yang sama.
 */
export const MODEL_ORIENTATION_Y_OPTIONS = [0, 90, 180, 270] as const;
export type ModelOrientationY = (typeof MODEL_ORIENTATION_Y_OPTIONS)[number];

export function normalizeModelOrientationY(
  value: number | null | undefined,
  fallback: ModelOrientationY = 0,
): ModelOrientationY {
  const normalized = ((Number(value) % 360) + 360) % 360;
  return MODEL_ORIENTATION_Y_OPTIONS.includes(normalized as ModelOrientationY)
    ? (normalized as ModelOrientationY)
    : fallback;
}

/** Koreksi bawaan untuk model lama yang belum memiliki metadata orientasi. */
export function defaultModelOrientationY(sku: string | null | undefined): ModelOrientationY {
  return sku?.trim().toUpperCase() === "KK-006" ? 90 : 0;
}

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
