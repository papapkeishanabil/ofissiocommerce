import type { IndustryInspirationData } from "./content.schema";

export interface InspirationPlacement {
  id: string;
  anchorX: number;
  anchorY: number;
  labelX: number;
  labelY: number;
}

/** Always pass the current parent state, never an array captured before await. */
export function upsertInspirationDraft(pages: IndustryInspirationData[], next: IndustryInspirationData) {
  return [...pages.filter((page) => page.industry !== next.industry), next];
}

function percent(value: number) {
  return Math.min(98, Math.max(2, Math.round(value * 10) / 10));
}

export function mergeInspirationSuggestions(
  current: IndustryInspirationData,
  snapshot: IndustryInspirationData,
  result: { focalX?: number; focalY?: number; placements: InspirationPlacement[] },
): IndustryInspirationData | null {
  if (current.industry !== snapshot.industry || current.image !== snapshot.image) return null;
  const placements = new Map(result.placements.map((item) => [item.id, item]));
  return {
    ...current,
    focalX: current.focalX === snapshot.focalX && Number.isFinite(result.focalX) ? percent(result.focalX!) : current.focalX,
    focalY: current.focalY === snapshot.focalY && Number.isFinite(result.focalY) ? percent(result.focalY!) : current.focalY,
    annotations: current.annotations.map((annotation) => {
      const before = snapshot.annotations.find((item) => item.id === annotation.id);
      const placement = placements.get(annotation.id);
      // Respect manual moves, rewritten benefits, removed pins and newly added pins.
      if (!before || !placement || annotation.title !== before.title ||
        annotation.anchorX !== before.anchorX || annotation.anchorY !== before.anchorY ||
        annotation.labelX !== before.labelX || annotation.labelY !== before.labelY ||
        ![placement.anchorX, placement.anchorY, placement.labelX, placement.labelY].every(Number.isFinite)) return annotation;
      return { ...annotation, anchorX: percent(placement.anchorX), anchorY: percent(placement.anchorY), labelX: percent(placement.labelX), labelY: percent(placement.labelY) };
    }),
  };
}
