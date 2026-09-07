import { loadEnvConfig } from "@next/env";
import "./register-server-only.cjs";

loadEnvConfig(process.cwd());

async function main() {
  const [{ getWordPressMediaById }, { inspectTrustedLegacyImage }] = await Promise.all([
    import("../src/features/products/woocommerce/wordpress-media-upload.service"),
    import("../src/features/product-import/product-import-legacy-image.service"),
  ]);
  const expected = await inspectTrustedLegacyImage("https://www.ofissio.com/wp-content/uploads/2022/02/kemeja-KK-020-4-1.jpg");
  const actual = await getWordPressMediaById(1017);
  const stem = (value: string) => { try { return decodeURIComponent(new URL(value, "http://ofissio.local").pathname.split("/").at(-1) ?? "").replace(/\.[^.]+$/, "").toLowerCase(); } catch { return ""; } };
  console.log(JSON.stringify({ mode: "READ_ONLY", mediaId: { expected: 1017, actual: actual.id, match: actual.id === 1017 }, normalizedFilename: { expected: expected.filename, actual: actual.filename ?? null, match: stem(actual.filename ?? actual.targetMediaUrl ?? actual.sourceUrl) === stem(expected.filename) }, targetMediaUrl: actual.targetMediaUrl, presentationUrl: actual.sourceUrl, mimeType: { expected: expected.mimeType, actual: actual.mimeType ?? null, match: actual.mimeType === expected.mimeType }, extension: { expected: expected.detectedExtension, actual: actual.extension ?? null, match: actual.extension === expected.detectedExtension }, title: actual.title, sourceEvidenceUrl: expected.finalUrl, sourceSha256: expected.sha256, writes: 0 }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
