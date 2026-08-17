import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import {
  createManagedInternalUser,
  listManagedInternalUsers,
} from "@/features/admin-users/admin-user.service";
import { createInternalUserSchema } from "@/features/admin-users/admin-user.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.users.list"), limit: 60, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:user:view");
    return NextResponse.json({ ok: true, users: await listManagedInternalUsers() });
  } catch (error) {
    return safeErrorResponse(error, "Tim Ofissio belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.users.create"), limit: 10, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:user:update");
    const payload = validateInput(createInternalUserSchema, await request.json());
    const user = await createManagedInternalUser(payload);
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "internal_user_created",
      entityType: "internal_user",
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "User Ofissio belum dapat dibuat.", 403);
  }
}
