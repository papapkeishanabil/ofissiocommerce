import "./register-server-only.cjs";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [{ inspectTrustedLegacyImage }, { woocommerceClient }, { findWordPressMediaBySearch }, { KK020_MANUAL_MEDIA }, { reconcileLegacyMediaState }] = await Promise.all([
    import("../src/features/product-import/product-import-legacy-image.service"),
    import("../src/features/products/woocommerce/woocommerce.client"),
    import("../src/features/products/woocommerce/wordpress-media-upload.service"),
    import("../src/features/product-integrity-repair/manual-media-evidence.service"),
    import("../src/features/product-integrity-repair/product-integrity-repair.service"),
  ]);
  const product = await woocommerceClient.getProductById(KK020_MANUAL_MEDIA.productId);
  const variations = await woocommerceClient.getProductVariations(product.id, { per_page: 100 });
  const images = [];
  const mediaMatches = [];
  for (const [index, url] of KK020_MANUAL_MEDIA.sourceUrls.entries()) {
    const inspected = await inspectTrustedLegacyImage(url);
    const media = await findWordPressMediaBySearch(inspected.filename.replace(/\.[^.]+$/, ""));
    mediaMatches.push({ url, media });
    images.push({ index: index + 1, url, httpStatus: inspected.httpStatus, finalStatus: inspected.finalStatus, redirectHost: new URL(inspected.finalUrl).hostname, contentType: inspected.contentType, byteCount: inspected.byteCount, detectedExtension: inspected.detectedExtension, filename: inspected.filename, sha256: inspected.sha256, validation: "PASS", existingWordPressMedia: media.map((item) => ({ id: item.id, sourceUrl: item.sourceUrl })) });
  }
  const reconciliation = reconcileLegacyMediaState({ sourceUrls:[...KK020_MANUAL_MEDIA.sourceUrls], productImages:product.images ?? [], mediaMatches });
  console.log(JSON.stringify({ mode: "READ_ONLY", product: { id: product.id, sku: product.sku, name: product.name, status: product.status, variationCount: variations.length, imageIds: (product.images ?? []).map((image) => image.id).filter(Boolean) }, images, reconciliation, writes: { woo: 0, wordpressMedia: 0, batchHash: 0 } }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
