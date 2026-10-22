/** An explicitly removed gallery photo falls back to the product's main photo. */
export function detachVariantImage<T extends { imageSrc: string }>(rows: T[], removedSrc: string): T[] {
  return rows.map(row => row.imageSrc === removedSrc ? { ...row, imageSrc: "" } : row);
}

/** Upload and gallery persistence can each replace a temporary URL. */
export function resolveVariantImage(src: string, replacements: Record<string, string>): string {
  const seen = new Set<string>();
  let current = src;
  while (replacements[current] && replacements[current] !== current && !seen.has(current)) {
    seen.add(current);
    current = replacements[current]!;
  }
  return current;
}
