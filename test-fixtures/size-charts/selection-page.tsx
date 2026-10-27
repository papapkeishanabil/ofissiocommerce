import { AdminProductForm } from "@/features/products/components/AdminProductForm";
import { DEFAULT_SIZE_CHART_STANDARDS } from "@/features/size-charts/size-chart.types";
import { SASIENALA_BASIC_STANDARD as sn } from "@/features/size-charts/sasienala-standard";
/** Local browser fixture; copy to a temporary route only while testing. */
export default function Preview() {
  return <AdminProductForm mode="create" options={{ categories: [{ id: 1, name: "Kemeja kerja polos", slug: "kemeja-kerja-polos", description: "", productCount: 0, active: true, synonyms: [], source: "woocommerce" }], attributes: [], industries: [] }} sizeChartStandards={[...DEFAULT_SIZE_CHART_STANDARDS, { ...sn, id: "women-alternative", name: "Wanita alternatif", isDefault: false, productSlugs: [] }]} />;
}
