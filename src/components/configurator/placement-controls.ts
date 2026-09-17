import { ZONE_ANCHORS } from "@/data/uniform-3d";
import type { EmbroideryZone, LogoPlacement } from "@/types/uniform-3d";
import { LEGACY_MODEL_UNITS_PER_CM } from "./garment-scale";

// Fallback for unmeasured products. GLB controls receive the viewer's actual
// conversion; offsets are relative to each zone, not to the garment collar.
export const MODEL_UNITS_PER_CM = LEGACY_MODEL_UNITS_PER_CM;

export function placementModelAxis(zone: EmbroideryZone, axis: "x" | "y") {
  return axis === "x" && (zone === "left_sleeve" || zone === "right_sleeve") ? "z" : axis;
}

function offsetDirection(zone: EmbroideryZone, axis: "x" | "y") {
  return axis === "y" || (axis === "x" && ["left_sleeve", "upper_back", "middle_back"].includes(zone)) ? -1 : 1;
}

export function placementOffsetCm(placement: LogoPlacement, axis: "x" | "y", unitsPerCm = MODEL_UNITS_PER_CM) {
  const modelAxis = placementModelAxis(placement.zone, axis);
  const index = modelAxis === "x" ? 0 : modelAxis === "y" ? 1 : 2;
  const delta = (placement.surfacePoint?.[index] ?? ZONE_ANCHORS[placement.zone][modelAxis]) - ZONE_ANCHORS[placement.zone][modelAxis];
  return Number((delta / unitsPerCm * offsetDirection(placement.zone, axis)).toFixed(1));
}

export function offsetToModelPosition(zone: EmbroideryZone, axis: "x" | "y", cm: number, unitsPerCm = MODEL_UNITS_PER_CM) {
  const modelAxis = placementModelAxis(zone, axis);
  return Number((ZONE_ANCHORS[zone][modelAxis] + cm * unitsPerCm * offsetDirection(zone, axis)).toFixed(4));
}

export function logoWidthRange(aspectRatio: number, maxWidth = 30, maxHeight = 30) {
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  return {
    min: Math.max(3, Math.ceil(ratio * 10) / 10),
    max: Math.floor(Math.min(30, maxWidth > 0 ? maxWidth : 30, (maxHeight > 0 ? maxHeight : 30) * ratio) * 10) / 10,
  };
}
