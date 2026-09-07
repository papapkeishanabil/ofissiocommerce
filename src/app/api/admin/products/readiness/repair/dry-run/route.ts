import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { buildIntegrityRepairPlan } from "@/features/product-integrity-repair/product-integrity-repair.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.integrity-repair.dry-run"), limit: 5, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:catalog:update");
    const form = await request.formData();
    const batchId = String(form.get("batchId") ?? "").trim();
    if (!batchId) return NextResponse.json({ ok: false, message: "Batch ID wajib diisi." }, { status: 400 });
    const file = form.get("wooCsv");
    const originalCsv = file instanceof File && file.size > 0 ? await file.text() : undefined;
    const plan = await buildIntegrityRepairPlan({ batchId, originalCsv, csvFilename: file instanceof File ? file.name : undefined });
    return NextResponse.json({ ok: true, plan }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Dry run integrity repair belum dapat dijalankan.", 400);
  }
}
