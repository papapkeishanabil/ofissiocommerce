import type { BusinessKind, RoleContent } from "./cafe-inspiration.data";
import type { IndustryInspirationAnnotation, IndustryInspirationData } from "./content.schema";

export function cafeAnnotations(business: BusinessKind, role: RoleContent, mode: "team" | "uniform", saved?: IndustryInspirationData["cafePlacements"]): IndustryInspirationAnnotation[] {
  const existing = saved?.find((item) => item.key === `${business}:${role.id}:${mode}`);
  if (existing) return existing.annotations;
  const kitchen = role.focus === "kitchen";
  const titles = kitchen ? ["Penutup kepala", "Chef coat", "Apron dapur"] : [...role.contents];
  // Coordinates refer to the complete source image, shared by editor and storefront.
  const x = mode === "uniform" ? 50 : { barista: 21, frontCounter: 47, kitchen: 67, supervisor: 88 }[role.focus];
  const ys = kitchen ? (mode === "uniform" ? [7, 30, 60] : [24, 48, 69]) : [43, 69, 47];
  const labelYs = kitchen ? [18, 43, 68] : [28, 68, 46];
  const labelX = x > 78 ? x - 22 : x + 18;
  return titles.map((title, i) => ({
    id: `pin-${i + 1}`, number: String(i + 1), title, description: "", hidden: false,
    anchorX: x, anchorY: ys[i]!, labelX, labelY: labelYs[i]!,
  }));
}
