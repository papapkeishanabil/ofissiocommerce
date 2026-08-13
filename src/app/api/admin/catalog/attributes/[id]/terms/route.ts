import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createCatalogAttributeTerm } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { attributeTermCreateSchema, taxonomyIdParamSchema } from "@/features/catalog-taxonomy/catalog-taxonomy.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.attribute_term.create"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = validateInput(taxonomyIdParamSchema, await context.params);
    const payload = validateInput(attributeTermCreateSchema, await request.json());
    const result = await createCatalogAttributeTerm({
      attributeId: Number(id),
      ...payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return safeErrorResponse(error, "Nilai atribut baru belum dapat ditambahkan.", 400);
  }
}
