import { NextResponse } from "next/server";

import {
  createCatalogCategory,
  listCatalogCategories,
} from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { categoryCreateSchema } from "@/features/catalog-taxonomy/catalog-taxonomy.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.categories.list"),
      limit: 80,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:view");
    const categories = await listCatalogCategories();
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "catalog_categories_viewed",
      entityType: "catalog_category",
      metadata: { count: categories.length },
    });
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    return safeErrorResponse(error, "Kategori katalog belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.categories.create"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const payload = validateInput(
      categoryCreateSchema,
      await request.json().catch(() => ({})),
    );
    const category = await createCatalogCategory({
      payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Kategori belum dapat dibuat.", 403);
  }
}
