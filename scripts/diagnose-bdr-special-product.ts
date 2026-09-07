import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const batchId = process.argv[2];
  if (!batchId) throw new Error("Batch ID required");
  const [{ buildIntegrityRepairPlan }, { generateBulkProductQa }, { woocommerceClient }] = await Promise.all([
    import("../src/features/product-integrity-repair/product-integrity-repair.service"),
    import("../src/features/product-readiness/product-readiness-audit.service"),
    import("../src/features/products/woocommerce/woocommerce.client"),
  ]);
  const before = await woocommerceClient.getProducts({ sku: "BDR", status: "any", per_page: 10 });
  const product = before[0];
  const variations = product?.type === "variable" ? await woocommerceClient.getProductVariations(product.id, { per_page: 100 }) : [];
  const wooSnapshot = product ? {
    id: product.id,
    sku: product.sku,
    name: product.name,
    status: product.status,
    type: product.type,
    price: product.price,
    regularPrice: product.regular_price,
    variationIds: product.variations ?? [],
    variations: variations.map((variation) => ({ id: variation.id, sku: variation.sku, status: variation.status, price: variation.price, regularPrice: variation.regular_price })),
  } : null;
  const integrity = await buildIntegrityRepairPlan({ batchId });
  const readiness = await generateBulkProductQa({ scope: "sku", sku: "BDR" });
  console.log(JSON.stringify({
    wooSnapshot,
    integrity: { summary: integrity.summary, rows: integrity.rows.filter((row) => row.sku.trim().toUpperCase() === "BDR"), safety: integrity.safety },
    readiness: { summary: readiness.summary, products: readiness.products },
    writes: { woo: 0, variations: 0, media: 0, publish: 0 },
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
