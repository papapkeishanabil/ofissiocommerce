import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const SOURCES = [
  "https://www.ofissio.com/wp-content/uploads/2020/03/jaket-TG-033-2-3.jpg",
  "https://www.ofissio.com/wp-content/uploads/2020/03/TG-033-navy-1-1.jpg",
  "https://www.ofissio.com/wp-content/uploads/2020/03/TG-033-hitam-1-1.jpg",
];

async function main() {
  const [{ inspectTrustedLegacyImage }, { findWordPressMediaBySearch }] = await Promise.all([
    import("../src/features/product-import/product-import-legacy-image.service"),
    import("../src/features/products/woocommerce/wordpress-media-upload.service"),
  ]);
  console.log("TG-033 LEGACY MEDIA READ-ONLY PREFLIGHT");
  for (const [index, source] of SOURCES.entries()) {
    try {
      const inspected = await inspectTrustedLegacyImage(source);
      const matches = await findWordPressMediaBySearch(inspected.filename.replace(/\.[^.]+$/, ""));
      console.log({ index, httpStatus:inspected.httpStatus, redirectStatuses:inspected.redirectStatuses, finalStatus:inspected.finalStatus, contentType:inspected.contentType, byteCount:inspected.byteCount, detectedExtension:inspected.detectedExtension, filename:inspected.filename, sha256:inspected.sha256, validationResult:"PASS", existingWpMediaMatchCount:matches.length });
    } catch (error) {
      const value = error as { failureStage?:string; errorCode?:string; safeMessage?:string; name?:string };
      console.log({ index, validationResult:"FAILED", failureStage:value.failureStage, errorCode:value.errorCode, errorName:value.name, safeMessage:value.safeMessage });
    }
  }
  console.log("WRITE COUNTS", { mediaUploads:0, productAttachments:0, wooWrites:0 });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
