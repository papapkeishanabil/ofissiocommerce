import { NextResponse } from "next/server";

import { updateCatalogCategory } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import {
  categoryPatchSchema,
  taxonomyIdParamSchema,
} from "@/features/catalog-taxonomy/catalog-taxonomy.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.categories.update"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = validateInput(taxonomyIdParamSchema, await context.params);
    const categoryId = Number(id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw createApiError("BAD_REQUEST", "ID kategori tidak valid.", 400);
    }
    const payload = validateInput(
      categoryPatchSchema,
      await request.json().catch(() => ({})),
    );
    const category = await updateCatalogCategory({
      id: categoryId,
      payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    return safeErrorResponse(error, "Kategori belum dapat diperbarui.", 403);
  }
}
