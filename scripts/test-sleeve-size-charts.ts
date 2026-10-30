import assert from "node:assert/strict";
import { DEFAULT_SIZE_CHART_STANDARDS as standards } from "../src/features/size-charts/size-chart.types";
import { resolveSleeveSizeCharts, selectedSleeveSizeChart, sleeveSizeKey } from "../src/features/size-charts/sleeve-size-charts";

for (const slug of ["kemeja-kerja-kk-013", "kemeja-kerja-kk-006"]) {
  const product = { slug, gender: "men" as const, sizeChartId: "kemeja-lengan-pendek", categorySlugs: ["kemeja-lapangan"], availableSizes: ["S", "M"] };
  const charts = resolveSleeveSizeCharts(standards, product, ["Pendek", "Panjang"])!;
  assert.equal(selectedSleeveSizeChart(charts, "Pendek")?.standard.id, "kemeja-lengan-pendek");
  assert.equal(selectedSleeveSizeChart(charts, "Lengan Panjang")?.standard.id, "kemeja-lengan-panjang");
  assert.notEqual(charts.short!.rows[0]!.length, charts.long!.rows[0]!.length, "Use each standard's measurements, not only a renamed heading");
  assert.deepEqual(charts.long!.rows.map(row => row.size), ["S", "M"]);
  assert.equal(resolveSleeveSizeCharts(standards, { ...product, sizeChartId: "none" }, ["Pendek", "Panjang"]), undefined);
  assert.equal(resolveSleeveSizeCharts(standards, product, ["Pendek"]), undefined);
  const partial = resolveSleeveSizeCharts(standards.filter(s => s.id !== "kemeja-lengan-panjang"), product, ["Pendek", "Panjang"])!;
  assert.equal(selectedSleeveSizeChart(partial, "Panjang"), null, "Do not substitute the short-sleeve chart if the long standard is unavailable");
  const custom = { ...standards[0]!, id: "kemeja-frm", productSlugs: [slug] };
  assert.equal(resolveSleeveSizeCharts([...standards, custom], { ...product, sizeChartId: custom.id }, ["Pendek", "Panjang"]), undefined, "Preserve model-specific standards");
}
assert.equal(sleeveSizeKey("long"), "long");assert.equal(sleeveSizeKey("LENGAN PENDEK"), "short");assert.equal(sleeveSizeKey("unknown"), undefined);
console.log("PASS: KK-013/KK-006 sleeve switching, distinct measurements, size filtering, missing-chart safety, hidden and model-specific standards");
