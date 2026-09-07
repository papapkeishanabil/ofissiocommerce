import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { PRODUCT_IMPORT_LIMITS } from "@/features/product-import/product-import.config";
import { runProductImportDryRun } from "@/features/product-import/product-import-dry-run.service";
import { assertBatchSourceHashes, withStagedProductZip } from "@/features/product-import/product-import-staging.service";
import { persistProductImportDryRunAttempt } from "@/features/product-import/product-import-recovery.service";
import type { ProductImportDecisions } from "@/features/product-import/product-import.types";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let attempt:{batchId:string;actorId:string;decisions:ProductImportDecisions}|null=null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.import.dry-run"), limit: 5, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update"); const form = await request.formData();
    const woo = requireFile(form, "wooCsv", ".csv", PRODUCT_IMPORT_LIMITS.maxCsvBytes); const manifest = requireFile(form, "manifestCsv", ".csv", PRODUCT_IMPORT_LIMITS.maxCsvBytes); const batchId=String(form.get("batchId")??"");
    const decisions = parseDecisions(form.get("decisions"));
    attempt={batchId,actorId:actor.id,decisions};
    await persistProductImportDryRunAttempt(attempt);
    const [wooCsv,manifestCsv]=await Promise.all([woo.text(),manifest.text()]);
    const result = await withStagedProductZip({batchId,actorId:actor.id,callback:async({filePath,sha256,batch})=>{assertBatchSourceHashes(batch,wooCsv,manifestCsv);if(batch.zip_sha256!==sha256)throw new Error("Staged ZIP berubah setelah verifikasi.");return runProductImportDryRun({batchId,wooCsv,manifestCsv,zipFilePath:filePath,zipHash:sha256,decisions,actorId:actor.id});}});
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { if(attempt)await persistProductImportDryRunAttempt({...attempt,error}).catch(()=>undefined);return safeErrorResponse(error, "Dry run belum dapat dijalankan.", 400); }
}
function requireFile(form: FormData, key: string, extension: string, max: number) { const value = form.get(key); if (!(value instanceof File) || value.size <= 0 || value.size > max || !value.name.toLowerCase().endsWith(extension)) throw createApiError("VALIDATION_ERROR", `File ${key} tidak valid.`, 400); return value; }
function parseDecisions(value: FormDataEntryValue | null): ProductImportDecisions { try { const parsed = JSON.parse(typeof value === "string" ? value : "{}") as Partial<ProductImportDecisions>; return { skuNormalizations: parsed.skuNormalizations ?? {}, variantMappings: parsed.variantMappings ?? {}, coverOverrides: parsed.coverOverrides ?? {} }; } catch { throw createApiError("VALIDATION_ERROR", "Keputusan import tidak valid.", 400); } }
