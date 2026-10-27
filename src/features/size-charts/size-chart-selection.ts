import type { SizeChartStandard } from "./size-chart.types";

export type SizeChartGender = "men" | "women" | "unisex";
export const SIZE_CHART_META_KEY = "size_chart_id";
export const NO_SIZE_CHART = "none";

/** Legacy Ofissio measurement standards are men's, as confirmed by the owner. */
export function sizeChartGender(standard: SizeChartStandard): SizeChartGender {
  return standard.gender ?? "men";
}

export function selectableSizeCharts(standards: readonly SizeChartStandard[], gender: SizeChartGender) {
  return standards.filter(standard => sizeChartGender(standard) === gender || sizeChartGender(standard) === "unisex");
}

export function defaultSizeChart(standards: readonly SizeChartStandard[], input: {
  gender: SizeChartGender; categorySlugs: readonly string[]; slug?: string;
}) {
  const candidates = selectableSizeCharts(standards, input.gender);
  const slug = input.slug?.trim().toLowerCase();
  const exact = slug ? candidates.find(standard => standard.productSlugs?.includes(slug)) : undefined;
  if (exact) return exact;
  const categories = new Set(input.categorySlugs.map(value => value.trim().toLowerCase()));
  const matching = candidates.filter(standard =>
    (!standard.productSlugs?.length || standard.isDefault) && standard.categorySlugs.some(category => categories.has(category)));
  return matching.find(standard => sizeChartGender(standard) === input.gender && standard.isDefault)
    ?? matching.find(standard => sizeChartGender(standard) === input.gender)
    ?? matching.find(standard => standard.isDefault)
    ?? matching[0]
    ?? candidates.find(standard => !standard.productSlugs?.length && standard.isFallback);
}
