import { NextResponse } from "next/server";

import {
  createIndustryMaster,
  listIndustryMaster,
} from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { industryCreateSchema } from "@/features/catalog-taxonomy/catalog-taxonomy.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.industries.list"),
      limit: 80,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:view");
    const industries = await listIndustryMaster();
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "catalog_industries_viewed",
      entityType: "catalog_industry",
      metadata: { count: industries.length },
    });
    return NextResponse.json({ ok: true, industries });
  } catch (error) {
    return safeErrorResponse(error, "Master industri belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.catalog.industries.create"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const payload = validateInput(
      industryCreateSchema,
      await request.json().catch(() => ({})),
    );
    const industry = await createIndustryMaster({
      payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, industry }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Industri belum dapat dibuat.", 403);
  }
}
