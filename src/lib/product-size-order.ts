/** Sort clothing and numeric sizes without changing their authored labels. */
export function sortProductSizes(values: readonly string[]): string[] {
  return [...values].sort((left, right) => sizeRank(left) - sizeRank(right));
}

function sizeRank(value: string): number {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  if (normalized === "S") return -1;
  if (normalized === "M") return 0;
  if (normalized === "L") return 1;
  const repeated = normalized.match(/^(X+)(S|L)$/);
  if (repeated?.[1]) return repeated[2] === "S" ? -1 - repeated[1].length : 1 + repeated[1].length;
  const numbered = normalized.match(/^(\d+)X(S|L)$/);
  if (numbered) return numbered[2] === "S" ? -1 - Number(numbered[1]) : 1 + Number(numbered[1]);
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return 100 + Number(normalized);
  return Number.MAX_SAFE_INTEGER;
}
