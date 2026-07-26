// src/data/uniform-3d.ts
// 3D model registry + embroidery zone anchor positions.
//
// Three rendering modes are supported per product, in priority order:
//   1. GLB model       (`glbUrl` non-null)  — premium, manual 3D
//   2. 360° photo set  (`photo360` non-null) — accurate, uses real product photos
//   3. Procedural      (fallback)            — generic parametric shape
//
// The viewer picks whichever is set. 360° photo is the recommended path for
// real catalog products because it uses actual product imagery and is far
// more accurate for apparel than AI-generated 3D.

import type { EmbroideryZone } from "@/types/uniform-3d";

/** One frame in a 360° photo spin sequence. */
export interface Photo360Frame {
  /** path under /public */
  src: string;
  /** angle in degrees this frame represents (0 = front, 90 = right, 180 = back, 270 = left) */
  angle: number;
  /** human label */
  label: string;
}

export interface Photo360Set {
  /** ordered list of frames (will be sorted by angle for spin) */
  frames: Photo360Frame[];
  /**
   * Logo anchor overlays per zone, in PERCENTAGE of frame dimensions
   * (0–100 from top-left). Tuned per product since each photo set frames
   * the product differently. Front-facing zones only need overlays on the
   * front frames; back zones on back frames; etc.
   */
  zoneOverlays: Partial<
    Record<EmbroideryZone, { xPct: number; yPct: number; maxWidthPct: number }>
  >;
}

export interface Model3DEntry {
  /** matches Product.id */
  productId: string;
  /** stable model id, persisted in Uniform3DConfig */
  model3dId: string;
  /** path under /public — null = skip GLB */
  glbUrl: string | null;
  /** 360° photo set — null = skip photo mode. Takes priority over procedural. */
  photo360: Photo360Set | null;
  /** base tint used by procedural fallback shape (hex). */
  fallbackColor: string;
}

/**
 * Registry of products that have 3D configurator support.
 * A product NOT in this registry simply doesn't show the 3D tab.
 */
export const MODEL_3D_REGISTRY: Model3DEntry[] = [
  {
    productId: "p-011",
    model3dId: "kl-rip-201-v1",
    glbUrl: null,
    photo360: null, // Ripstop: no photos yet, uses procedural
    fallbackColor: "#1f3a8a",
  },
  {
    productId: "p-012",
    model3dId: "kk-006-v1",
    glbUrl: null,
    photo360: {
      // 6 frames. Angles are best-guess until photos are tagged precisely;
      // the spin viewer interpolates between nearest frames.
      frames: [
        { src: "/products/kk-006/KK-006-3.jpeg", angle: 0, label: "Depan" },
        { src: "/products/kk-006/KK-006-4.jpeg", angle: 60, label: "Samping Kanan" },
        { src: "/products/kk-006/KK-006-5.jpeg", angle: 120, label: "Belakang Kanan" },
        { src: "/products/kk-006/KK-006-6.jpeg", angle: 180, label: "Belakang" },
        { src: "/products/kk-006/KK-006-7.jpeg", angle: 240, label: "Belakang Kiri" },
        { src: "/products/kk-006/KK-006-8.jpeg", angle: 300, label: "Samping Kiri" },
      ],
      // Overlays tuned for typical product photo framing (subject centered,
      // ~40% width). Adjust per product after seeing real photos.
      zoneOverlays: {
        left_chest: { xPct: 38, yPct: 32, maxWidthPct: 18 },
        right_chest: { xPct: 58, yPct: 32, maxWidthPct: 18 },
        upper_back: { xPct: 46, yPct: 22, maxWidthPct: 24 },
        middle_back: { xPct: 46, yPct: 45, maxWidthPct: 24 },
      },
    },
    fallbackColor: "#9ca3af",
  },
];

export function getModel3DForProduct(productId: string): Model3DEntry | undefined {
  return MODEL_3D_REGISTRY.find((m) => m.productId === productId);
}

/**
 * 3D anchor positions (in model-space units) for each embroidery zone.
 * Used by BOTH the fallback shape and any future GLB (via named empties /
 * hardcoded offsets). Coordinates are tuned for the procedural shirt.
 *
 * Convention: x = right(+)/left(-), y = up(+)/down(-), z = front(+)/back(-).
 */
export const ZONE_ANCHORS: Record<EmbroideryZone, { x: number; y: number; z: number }> = {
  left_chest: { x: -0.28, y: 0.45, z: 0.42 },
  right_chest: { x: 0.28, y: 0.45, z: 0.42 },
  left_sleeve: { x: -0.62, y: 0.25, z: 0.05 },
  right_sleeve: { x: 0.62, y: 0.25, z: 0.05 },
  upper_back: { x: 0, y: 0.65, z: -0.42 },
  middle_back: { x: 0, y: 0.15, z: -0.42 },
};

/**
 * Camera preset → {position, target} for the 3D viewer.
 * Tuned for a model that fits roughly in a 2x2x2 unit cube centered at origin.
 */
export const CAMERA_PRESET_VIEWS: Record<
  string,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  front: { position: [0, 0.3, 3.2], target: [0, 0.2, 0] },
  back: { position: [0, 0.3, -3.2], target: [0, 0.2, 0] },
  left: { position: [-3.2, 0.3, 0], target: [0, 0.2, 0] },
  right: { position: [3.2, 0.3, 0], target: [0, 0.2, 0] },
  right_chest: { position: [1.4, 0.55, 1.9], target: [0.28, 0.45, 0] },
  left_chest: { position: [-1.4, 0.55, 1.9], target: [-0.28, 0.45, 0] },
  right_sleeve: { position: [2.2, 0.35, 1.1], target: [0.62, 0.25, 0] },
  left_sleeve: { position: [-2.2, 0.35, 1.1], target: [-0.62, 0.25, 0] },
};

/**
 * For 360° photo mode: which angle ranges show which zone.
 * Front zones (chests) are visible from front-ish angles; back zones from
 * back-ish angles. Sleeves are visible from side angles.
 */
export function isZoneVisibleAtAngle(zone: EmbroideryZone, angle: number): boolean {
  // normalize angle to 0..360
  const a = ((angle % 360) + 360) % 360;
  switch (zone) {
    case "left_chest":
    case "right_chest":
      // visible front 0 ± 90
      return a <= 90 || a >= 270;
    case "left_sleeve":
      return a >= 180 && a <= 360; // left side visible from 180→360 (back→front via left)
    case "right_sleeve":
      return a >= 0 && a <= 180;
    case "upper_back":
    case "middle_back":
      // visible back 180 ± 90
      return a >= 90 && a <= 270;
  }
}

