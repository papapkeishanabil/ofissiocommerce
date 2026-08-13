import { NextResponse } from "next/server";

import { createCatalogAttribute, listCatalogAttributes } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { attributeCreateSchema } from "@/features/catalog-taxonomy/catalog-taxonomy.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.attributes.list"),
      limit: 80,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:view");
    const attributes = await listCatalogAttributes();
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "catalog_attributes_viewed",
      entityType: "catalog_attribute",
      metadata: { count: attributes.length },
    });
    return NextResponse.json({ ok: true, attributes });
  } catch (error) {
    return safeErrorResponse(error, "Atribut WooCommerce belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.attributes.create"),
      limit: 10,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const payload = validateInput(attributeCreateSchema, await request.json());
    const attribute = await createCatalogAttribute({ ...payload, actorId: actor.id, request });
    return NextResponse.json({ ok: true, attribute }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Global attribute belum dapat dibuat.", 400);
  }
}
