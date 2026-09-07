import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getProductImportLimits } from "@/features/product-import/product-import.config";
import { prepareProductImportUpload } from "@/features/product-import/product-import-staging.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.import.prepare-upload"), limit: 10, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const form = await request.formData(); const limits = getProductImportLimits();
    const woo = csv(form, "wooCsv", limits.maxCsvBytes); const manifest = csv(form, "manifestCsv", limits.maxCsvBytes);
    const zipFilename = String(form.get("zipFilename") ?? ""); const zipSizeBytes = Number(form.get("zipSizeBytes"));
    const result = await prepareProductImportUpload({ actorId: actor.id, csvFilename: woo.name, manifestFilename: manifest.name, zipFilename, zipSizeBytes, wooCsv: await woo.text(), manifestCsv: await manifest.text() });
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeErrorResponse(error, "Upload ZIP belum dapat disiapkan.", 400); }
}
function csv(form: FormData, key: string, max: number) { const value = form.get(key); if (!(value instanceof File) || value.size <= 0 || value.size > max || !value.name.toLowerCase().endsWith(".csv")) throw createApiError("VALIDATION_ERROR", `File ${key} tidak valid.`, 400); return value; }
