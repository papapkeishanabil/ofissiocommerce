import { ProductSizeChart } from "@/components/product/ProductSizeChart";
import { SASIENALA_BASIC_STANDARD } from "@/features/size-charts/sasienala-standard";
import { SizeChartStandardsManager } from "@/features/size-charts/components/SizeChartStandardsManager";
/** Local browser fixture only. Its save request must be intercepted by the test. */
export default function QaSizeChart() {
  return <div className="min-w-0 space-y-6 p-4">
    <div className="max-w-xl"><ProductSizeChart rows={SASIENALA_BASIC_STANDARD.rows} name={SASIENALA_BASIC_STANDARD.name} /></div>
    <SizeChartStandardsManager initialState={{ standards: [SASIENALA_BASIC_STANDARD], source: "fallback", schemaReady: true }} canUpdate={true} />
  </div>;
}
