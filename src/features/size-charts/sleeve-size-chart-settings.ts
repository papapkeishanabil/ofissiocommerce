export const SLEEVE_SIZE_CHART_META_KEY = "size_chart_ids_by_sleeve";
export type SleeveSizeChartIds = { short: string; long: string };

export function readSleeveSizeChartIds(value: unknown): SleeveSizeChartIds | undefined {
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return undefined; } }
  if (!value || typeof value !== "object") return undefined;
  const pair = value as Record<string, unknown>;
  if (typeof pair.short !== "string" || typeof pair.long !== "string"
    || !/^[a-z0-9-]{1,60}$/.test(pair.short) || !/^[a-z0-9-]{1,60}$/.test(pair.long)) return undefined;
  return { short: pair.short, long: pair.long };
}

export function defaultSleeveSizeChartIds(baseId?: string): SleeveSizeChartIds {
  return baseId && !["kemeja-lengan-pendek", "kemeja-lengan-panjang"].includes(baseId)
    ? { short: baseId, long: baseId }
    : { short: "kemeja-lengan-pendek", long: "kemeja-lengan-panjang" };
}
