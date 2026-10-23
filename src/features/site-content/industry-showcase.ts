import type { IndustriGroup } from "./content.schema";

/** The first visible industry owns the main photo; the first three own the cards. */
export function homepageBusinessTiles(group: IndustriGroup | undefined) {
  const seen = new Set<string>();
  return (group?.tiles ?? []).filter((tile) => {
    if (tile.hidden || seen.has(tile.industry)) return false;
    seen.add(tile.industry);
    return true;
  }).slice(0, 3);
}
