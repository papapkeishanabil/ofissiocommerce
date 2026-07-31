import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { uploadAdminProductGlb } from "@/features/products/woocommerce/woocommerce-product-glb.service";
import { adminProductGlbVersionSchema } from "@/features/products/woocommerce/woocommerce-product-management.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  let actorId: string | null = null;
  let productId: number | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.product.glb.upload"),
      limit: 12,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    productId = id;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw createApiError("VALIDATION_ERROR", "Pilih file GLB.", 400);
    }
    const { version } = validateInput(adminProductGlbVersionSchema, {
      version: String(form.get("version") ?? "v1"),
    });
    const result = await uploadAdminProductGlb({
      productId: id,
      file,
      version,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (actorId) {
      logAuditEvent({
        request,
        actorId,
        actorType: "internal",
        action: "product_glb_upload_failed",
        entityType: "product",
        entityId: productId == null ? null : String(productId),
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "File GLB belum dapat diunggah.", 400);
  }
}
