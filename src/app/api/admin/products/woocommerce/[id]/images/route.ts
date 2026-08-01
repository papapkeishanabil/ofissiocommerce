import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import {
  listAdminProductImages,
  updateAdminProductImages,
  uploadAdminProductImages,
} from "@/features/products/woocommerce/woocommerce-product-image.service";
import { adminProductImagesPatchSchema } from "@/features/products/woocommerce/woocommerce-product-image.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
  createApiError,
  safeErrorResponse,
} from "@/lib/security/safe-error-response";
import {
  createRateLimitKey,
  rateLimitOrThrow,
} from "@/lib/security/rate-limit";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.product.images.list"),
      limit: 60,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:view");
    const { id } = validateInput(
      adminWooProductIdParamSchema,
      await context.params,
    );
    const images = await listAdminProductImages(id);
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "admin_product_images_viewed",
      entityType: "product",
      entityId: String(id),
      metadata: { imageCount: images.length },
    });
    return NextResponse.json(
      { ok: true, images },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Foto produk belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request, context: RouteContext) {
  let actorId: string | null = null;
  let productId: number | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.product.images.upload"),
      limit: 12,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const { id } = validateInput(
      adminWooProductIdParamSchema,
      await context.params,
    );
    productId = id;
    const form = await request.formData();
    const files = form
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length === 0) {
      throw createApiError("VALIDATION_ERROR", "Pilih foto produk.", 400);
    }
    const result = await uploadAdminProductImages({
      productId: id,
      files,
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
        action: "product_image_upload_failed",
        entityType: "product",
        entityId: productId == null ? null : String(productId),
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Foto produk belum dapat diunggah.", 400);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  let actorId: string | null = null;
  let productId: number | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.product.images.update"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const { id } = validateInput(
      adminWooProductIdParamSchema,
      await context.params,
    );
    productId = id;
    const payload = validateInput(
      adminProductImagesPatchSchema,
      await request.json().catch(() => null),
    );
    const result = await updateAdminProductImages({
      productId: id,
      payload,
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
        action: "product_images_update_failed",
        entityType: "product",
        entityId: productId == null ? null : String(productId),
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Foto produk belum dapat diperbarui.", 400);
  }
}
