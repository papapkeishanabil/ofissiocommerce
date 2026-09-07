import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { parsePhotoManifest } from "@/features/product-import/photo-manifest.parser";
import { getProductImportLimits } from "@/features/product-import/product-import.config";
import { assertBatchSourceHashes, markStagedZipVerified, withStagedProductZip } from "@/features/product-import/product-import-staging.service";
import { verifyProductPhotoZipFile } from "@/features/product-import/product-import-zip.service";
import { createProductImportPreview } from "@/features/product-import/product-import.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.import.verify-zip"), limit: 10, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update"); const form = await request.formData(); const limits = getProductImportLimits();
    const woo = csv(form, "wooCsv", limits.maxCsvBytes); const manifest = csv(form, "manifestCsv", limits.maxCsvBytes); const batchId = String(form.get("batchId") ?? "");
    const [wooCsv, manifestCsv] = await Promise.all([woo.text(), manifest.text()]);
    const result = await withStagedProductZip({ batchId, actorId: actor.id, callback: async ({ filePath, sha256, batch }) => {
      assertBatchSourceHashes(batch, wooCsv, manifestCsv);
      const verification = await verifyProductPhotoZipFile({ filePath, manifest: parsePhotoManifest(manifestCsv) });
      await markStagedZipVerified({ batchId, actorId: actor.id, sha256, preview:createProductImportPreview(wooCsv,manifestCsv), verification });
      return verification;
    } });
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeErrorResponse(error, "Photo Product ZIP belum dapat diverifikasi.", 400); }
}
function csv(form: FormData, key: string, max: number) { const value=form.get(key); if(!(value instanceof File)||value.size<=0||value.size>max||!value.name.toLowerCase().endsWith(".csv"))throw createApiError("VALIDATION_ERROR",`File ${key} tidak valid.`,400); return value; }
