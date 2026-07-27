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

export interface Depth3DSet {
  /** color photo path under /public (background removed, transparent) */
  colorImage: string;
  /** pre-computed depth map PNG (grayscale, brighter = nearer) */
  depthImage: string;
  /** silhouette mask PNG (white = product, black = background). Vertices in
   *  the black region are discarded from the mesh so we don't render a "wall"
   *  around the product when rotating. */
  maskImage?: string;
  /** displacement strength in model units (~0.5 default) */
  depthStrength?: number;
}

/**
 * Dual-side depth 3D: front + back photo each with their own depth map.
 * The viewer builds two displaced meshes back-to-back so the customer can
 * rotate a full 360° and see the correct photo on each side.
 */
export interface Depth3DDualSet {
  front: Depth3DSet;
  back: Depth3DSet;
}

/**
 * Quad-side depth 3D: 4 photos (front/back/left/right) each with their own
 * depth map. The viewer builds 4 displaced meshes arranged in a cross "+"
 * shape — gives true volumetric feel when rotating, since every 90° face
 * shows the correct photo. Highest accuracy without a real GLB model.
 */
export interface Depth3DQuadSet {
  front: Depth3DSet;
  back: Depth3DSet;
  left: Depth3DSet;
  right: Depth3DSet;
}

export interface Model3DEntry {
  /** matches Product.id */
  productId: string;
  /** stable model id, persisted in Uniform3DConfig */
  model3dId: string;
  /** path under /public — null = skip GLB */
  glbUrl: string | null;
  /** 360° photo set — null = skip photo mode */
  photo360: Photo360Set | null;
  /** AI depth → 3D mesh (single side). Lower priority than depth3DDual. */
  depth3D: Depth3DSet | null;
  /** AI depth → 3D mesh (front + back). */
  depth3DDual: Depth3DDualSet | null;
  /** AI depth → 3D mesh (front+back+left+right). Highest priority without GLB. */
  depth3DQuad: Depth3DQuadSet | null;
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
    depth3D: null,
    depth3DDual: null,
    depth3DQuad: null,
    fallbackColor: "#1f3a8a",
  },
  {
    productId: "p-012",
    model3dId: "kk-006-v1",
    glbUrl: "/3d/kk-006.glb",
    photo360: null,
    depth3D: null,
    depth3DDual: null,
    depth3DQuad: null,
    fallbackColor: "#9ca3af",
  },
];

export function getModel3DForProduct(productId: string): Model3DEntry | undefined {
  return MODEL_3D_REGISTRY.find((m) => m.productId === productId);
}

/**
 * 3D anchor positions for each embroidery zone. Coordinates are in world
 * space, tuned for a fitted GLB model (~1.76 unit tall, ~0.75 wide).
 *
 * Convention (customer looking at front of shirt):
 *   x = right(+) / left(−)
 *   y = up(+) / down(−)
 *   z = front(+) / back(−)
 *
 * Diagram (front view):
 *
 *         ┌── kerah ──┐
 *    Lengan          Lengan
 *     Kiri            Kanan
 *   ┌────┤  Dada   ├────┐
 *   │    │  Kiri   │    │
 *   │    │  ◉      │    │
 *   │    │      ◉  │    │
 *   │    │  Dada   │    │
 *   │    │  Kanan  │    │
 *   └────┴─────────┴────┘
 */
export const ZONE_ANCHORS: Record<EmbroideryZone, { x: number; y: number; z: number }> = {
  // Dada — depan kemeja (z+)
  left_chest:   { x:  0.18, y:  0.28, z:  0.16 },
  right_chest:  { x: -0.18, y:  0.28, z:  0.16 },
  // Lengan — posisi final hasil fine-tune (X=-0.69, Y=0.35, Z=-0.03)
  left_sleeve:  { x:  0.69, y:  0.35, z: -0.03 },
  right_sleeve: { x: -0.69, y:  0.35, z: -0.03 },
  // Punggung — belakang kemeja (z-)
  upper_back:   { x:  0.00, y:  0.35, z: -0.16 },
  middle_back:  { x:  0.00, y:  0.05, z: -0.16 },
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
 * Mapping zona bordir → camera preset.
 * Saat customer pilih zona, camera otomatis berputar ke sudut ini.
 */
export const ZONE_CAMERA_MAP: Record<EmbroideryZone, string> = {
  left_chest: "front",
  right_chest: "front",
  left_sleeve: "left_sleeve",
  right_sleeve: "right_sleeve",
  upper_back: "back",
  middle_back: "back",
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

