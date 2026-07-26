// src/data/uniform-3d.ts
// 3D model registry + embroidery zone anchor positions.
//
// Today: no GLB files exist yet, so every model entry has `glbUrl: null`.
// The viewer detects this and renders an elegant procedural fallback shape
// (a parametric shirt silhouette built from primitives). The fallback keeps
// the configurator fully usable without blocking on art assets.
//
// To add a real GLB later: drop the file in /public/3d/, then set `glbUrl`
// here. Nothing else changes — the viewer + zone anchors stay identical.

import type { EmbroideryZone } from "@/types/uniform-3d";

export interface Model3DEntry {
  /** matches Product.id */
  productId: string;
  /** stable model id, persisted in Uniform3DConfig */
  model3dId: string;
  /** path under /public — null = use procedural fallback shape */
  glbUrl: string | null;
  /** base tint used by fallback shape (hex). Real GLB ignores this. */
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
    glbUrl: null, // TODO Phase 8+: "/3d/kemeja-lapangan-ripstop.glb"
    fallbackColor: "#1f3a8a",
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
