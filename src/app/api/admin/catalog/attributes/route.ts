import { NextResponse } from "next/server";

import { listCatalogAttributes } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

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
