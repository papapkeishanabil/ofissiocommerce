import { resolveSizeChart, type SizeChartProductInput } from "./resolve-size-chart";
import type { SizeChartStandard } from "./size-chart.types";

type ResolvedChart = NonNullable<ReturnType<typeof resolveSizeChart>>;
export type SleeveSizeCharts = Record<"short" | "long", ResolvedChart | null>;

export function sleeveSizeKey(value: string | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/[\s_-]+/g, " ").replace(/^lengan /, "");
  return normalized === "pendek" || normalized === "short" ? "short"
    : normalized === "panjang" || normalized === "long" ? "long" : undefined;
}

/** Shared shirt standards follow sleeve variants; model-specific standards stay intact. */
export function resolveSleeveSizeCharts(standards: readonly SizeChartStandard[], product: SizeChartProductInput, sleeveChoices: readonly string[]): SleeveSizeCharts | undefined {
  const choices = new Set(sleeveChoices.map(sleeveSizeKey));
  if (!choices.has("short") || !choices.has("long")) return undefined;
  if (product.sleeveSizeChartIds) return {
    short: resolveSizeChart(standards, { ...product, sizeChartId: product.sleeveSizeChartIds.short }),
    long: resolveSizeChart(standards, { ...product, sizeChartId: product.sleeveSizeChartIds.long }),
  };
  const base = resolveSizeChart(standards, product);
  if (!base || !["kemeja-lengan-pendek", "kemeja-lengan-panjang"].includes(base.standard.id)) return undefined;
  return {
    short: resolveSizeChart(standards, { ...product, sizeChartId: "kemeja-lengan-pendek" }),
    long: resolveSizeChart(standards, { ...product, sizeChartId: "kemeja-lengan-panjang" }),
  };
}

export function selectedSleeveSizeChart(charts: SleeveSizeCharts, sleeve: string | undefined) {
  const key = sleeveSizeKey(sleeve);
  return key ? charts[key] : null;
}
