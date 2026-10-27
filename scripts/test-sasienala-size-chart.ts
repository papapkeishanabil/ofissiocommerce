import assert from "node:assert/strict";
import { SASIENALA_BASIC_STANDARD as sn } from "../src/features/size-charts/sasienala-standard";
import { normalizeSizeChartStandards, DEFAULT_SIZE_CHART_STANDARDS } from "../src/features/size-charts/size-chart.types";
import { sizeChartStandardSchema } from "../src/features/size-charts/size-chart.validation";
import { resolveSizeChart } from "../src/features/size-charts/resolve-size-chart";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ProductSizeChart } from "../src/components/product/ProductSizeChart";

// Independent transcription of the supplied chart: size, chest, shoulder,
// sleeve, body, upper arm, elbow, lower arm, suggested minimum/maximum kg.
const expected = [
  ["XS",92,36,51,68,35,28,22,35,45],
  ["S",96,38,54,70,36,29,23,45,52],
  ["M",100,39,54,72,39,30,24,52,58],
  ["L",108,41,54,74,40,31,26,58,65],
  ["XL",110,42,55,75,42,33,27,65,70],
  ["2XL",116,45,55,75,44,35,28,70,77],
  ["3XL",120,47,56,77,46,37,29,77,85],
];
assert.deepEqual(sn.rows.map(r => [r.size,r.chest,r.shoulder,r.sleeveLength,r.length,r.upperArm,r.elbow,r.lowerArm,r.weightMin,r.weightMax]),expected);
const [roundTrip] = normalizeSizeChartStandards([sizeChartStandardSchema.parse(sn)]);
assert.ok(roundTrip);
assert.deepEqual(roundTrip.rows,sn.rows);
assert.deepEqual(roundTrip.productSlugs,sn.productSlugs);
const standards=[...DEFAULT_SIZE_CHART_STANDARDS,roundTrip];
for (const slug of sn.productSlugs!) {
  const chart=resolveSizeChart(standards,{slug,categorySlugs:["kemeja-kantor"],availableSizes:["XS","S","M","L","XL","2XL","3XL"]});
  assert.equal(chart?.standard.id,sn.id);
  assert.equal(chart?.rows.length,7);
}
assert.notEqual(resolveSizeChart(standards,{slug:"frm",categorySlugs:["kemeja-kantor"]})?.standard.id,sn.id);
assert.notEqual(resolveSizeChart([{...roundTrip,isFallback:true,categorySlugs:["kemeja-kantor"]}],{slug:"frm",categorySlugs:["kemeja-kantor"]})?.standard.id,sn.id);
assert.deepEqual(resolveSizeChart(standards,{slug:sn.productSlugs![0],categorySlugs:[],availableSizes:["XS","3XL"]})?.rows.map(r=>r.size),["XS","3XL"]);
const html=renderToStaticMarkup(createElement(ProductSizeChart,{rows:sn.rows,name:sn.name}));
assert.ok(html.includes("35–45 kg") && html.includes("77–85 kg"));
assert.ok(html.includes("Panjang lengan (cm)") && html.includes("Lingkar lengan bawah (cm)"));
assert.ok(!html.includes("Toleransi"),"Do not add tolerance unsupported by the supplied chart");
assert.ok(!html.includes("Rekomendasi tinggi (cm)"),"No height values were supplied");
console.log("PASS: all Sasienala screenshot values, schema/normalization round-trip, five exact SN products, FRM isolation, size filtering, garment and weight rendering.");
