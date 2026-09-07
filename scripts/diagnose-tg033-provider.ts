import { loadEnvConfig } from "@next/env";
import type { ProductImportPlan } from "../src/features/product-import/product-import.types";

const BATCH_ID = "6d051669-edb4-4e33-a431-f53d09d78aff";

loadEnvConfig(process.cwd());

async function main() {
  const [{productImportRepository},{woocommerceClient},{findWordPressMediaBySearch},{getWordPressProviderGateSnapshot}]=await Promise.all([
    import("../src/features/product-import/product-import.repository"),
    import("../src/features/products/woocommerce/woocommerce.client"),
    import("../src/features/products/woocommerce/wordpress-media-upload.service"),
    import("../src/features/products/woocommerce/wordpress-provider-gate"),
  ]);
  const [batch, items] = await Promise.all([productImportRepository.getBatch(BATCH_ID), productImportRepository.listItems(BATCH_ID)]);
  if (!batch) throw new Error("Production batch not found.");
  const item = items.find((candidate) => Number(candidate.target_product_id) === 65);
  const plan = batch.plan_json as ProductImportPlan | undefined;
  const planned = plan?.products.find((candidate) => candidate.sourceId === String(item?.source_id) || candidate.targetSku === "TG-033");
  const product = await woocommerceClient.getProductById("65");
  const media = await findWordPressMediaBySearch("TG-033");
  console.log(JSON.stringify({
    batchId:BATCH_ID,
    csvFilename:batch.csv_filename??null,
    persistedResultKeys:batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?Object.keys(batch.result_json):[],
    persistedPlanHasSourceUrls:Boolean(planned&&"sourceUrls" in planned),
    sku: product.sku,
    wooProductId: product.id,
    reachable: true,
    currentTargetImages: product.images?.length ?? 0,
    sourceImages: planned?.imageCount ?? null,
    photoSource: planned?.photoSource ?? null,
    mediaSearch: "TG-033",
    mediaMatches: media.map((entry) => ({ id: entry.id, sourceUrl: entry.sourceUrl })),
    providerGate: getWordPressProviderGateSnapshot(),
    writes: { woo: 0, media: 0, repairApply: 0 },
  }, null, 2));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
