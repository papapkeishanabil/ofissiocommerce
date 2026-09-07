import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { findWordPressMediaBySearch } from "../src/features/products/woocommerce/wordpress-media-upload.service";
import { getRawVariationSkus } from "../src/features/products/woocommerce/woocommerce-raw-variation.service";
import { getWordPressProviderGateSnapshot } from "../src/features/products/woocommerce/wordpress-provider-gate";

async function main() {
  const warnings: Error[] = [];
  const warningHandler = (warning: Error) => warnings.push(warning);
  process.on("warning", warningHandler);
  const operations = [
    ["product-65", () => woocommerceClient.getProductById("65")],
    ["product-84", () => woocommerceClient.getProductById("84")],
    ["product-103", () => woocommerceClient.getProductById("103")],
    ["product-116", () => woocommerceClient.getProductById("116")],
    ["categories", () => woocommerceClient.getCategories()],
    ["attributes", () => woocommerceClient.getAttributes()],
    ["variations-144", () => woocommerceClient.getProductVariations(144, { per_page: 100 })],
    ["raw-sku-144", () => getRawVariationSkus(144)],
    ["media-tg033", () => findWordPressMediaBySearch("TG-033")],
    ["media-kk011", () => findWordPressMediaBySearch("KK-011")],
  ] as const;
  const results = await Promise.allSettled(operations.map(([, operation]) => operation()));
  process.off("warning", warningHandler);
  console.log(JSON.stringify({
    operations: operations.map(([name], index) => ({ name, status: results[index]?.status ?? "unknown", error: results[index]?.status === "rejected" ? safeError(results[index].reason) : null })),
    gate: getWordPressProviderGateSnapshot(),
    maxListenersWarnings: warnings.filter((warning) => warning.name === "MaxListenersExceededWarning").length,
    writes: { woo: 0, media: 0, repairApply: 0 },
  }, null, 2));
}

function safeError(error: unknown) { const value = error as { code?: unknown; name?: unknown }; return { code: String(value?.code ?? "UNKNOWN"), name: String(value?.name ?? "Error") }; }
void main().catch((error) => { console.error(error); process.exitCode = 1; });
