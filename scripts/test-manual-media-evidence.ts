import assert from "node:assert/strict";
import fs from "node:fs";
import "./register-server-only.cjs";

async function main() {
  const { getApprovedManualMediaEvidence, KK020_MANUAL_MEDIA } = await import("../src/features/product-integrity-repair/manual-media-evidence.service");
  assert.equal(KK020_MANUAL_MEDIA.productId, 728);
  assert.equal(KK020_MANUAL_MEDIA.sourceId, "10404");
  assert.equal(KK020_MANUAL_MEDIA.sourceUrls.length, 2);
  assert.equal(getApprovedManualMediaEvidence({ result_json: {} }, 728), null, "missing approval remains blocked");
  assert.equal(getApprovedManualMediaEvidence({ result_json: { manualMediaEvidence: { "728": { resolutionType: "ORIGINAL_CSV_VERIFIED", productId: 728 } } } }, 728), null, "alternate evidence cannot impersonate original CSV verification");
  const approved = { resolutionType: "MANUAL_ADMIN_MEDIA_EVIDENCE", productId: 728, sku: "KK-020", sourceId: "10404", sourceImages: [], evidence: [], originalBatchCsvHashStillUnavailable: true, approvedBy: "admin", approvedAt: new Date().toISOString() } as const;
  assert.equal(getApprovedManualMediaEvidence({ result_json: { manualMediaEvidence: { "728": approved } } }, 728)?.resolutionType, "MANUAL_ADMIN_MEDIA_EVIDENCE");
  const service = fs.readFileSync("src/features/product-integrity-repair/manual-media-evidence.service.ts", "utf8");
  assert.match(service, /inspectTrustedLegacyImage/);
  assert.match(service, /status !== "draft"/);
  assert.match(service, /variations\.length !== 6/);
  assert.match(service, /mergeBatchResult/);
  assert.doesNotMatch(service, /updateProduct\(|uploadProductImageToWordPress|updateProductVariation/);
  const planner = fs.readFileSync("src/features/product-integrity-repair/product-integrity-repair.service.ts", "utf8");
  assert.match(planner, /MANUAL_SOURCE_EVIDENCE/);
  assert.match(planner, /manualMediaResolution/);
  const ui = fs.readFileSync("src/features/product-integrity-repair/components/ProductIntegrityRepairClient.tsx", "utf8");
  assert.match(ui, /Resolve Media Evidence Manually/);
  assert.match(ui, /CSV asli batch tidak tersedia/);
  assert.match(ui, /setPlan\(null\)/);
  console.log("PASS: manual media evidence requires explicit approval, preserves hash safety, invalidates stale plan, and contains no production media write path.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
