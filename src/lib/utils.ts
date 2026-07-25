// src/lib/utils.ts
// Tiny className combiner (no external dep needed for Phase 1).

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Convert any value to a safe non-negative integer (default 0). */
export function toNonNegInt(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
