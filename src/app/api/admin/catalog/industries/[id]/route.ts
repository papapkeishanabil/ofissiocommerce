import { NextResponse } from "next/server";

import { updateIndustryMaster } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import {
  industryPatchSchema,
  taxonomyIdParamSchema,
} from "@/features/catalog-taxonomy/catalog-taxonomy.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.industries.update"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = validateInput(taxonomyIdParamSchema, await context.params);
    const payload = validateInput(
      industryPatchSchema,
      await request.json().catch(() => ({})),
    );
    const industry = await updateIndustryMaster({
      id,
      payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, industry });
  } catch (error) {
    return safeErrorResponse(error, "Industri belum dapat diperbarui.", 403);
  }
}
