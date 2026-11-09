import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { deleteManagedInternalUser, updateManagedInternalUser } from "@/features/admin-users/admin-user.service";
import {
  internalUserIdSchema,
  updateInternalUserSchema,
  deleteInternalUserSchema,
} from "@/features/admin-users/admin-user.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";
interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.users.update"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:user:update");
    const { id } = validateInput(internalUserIdSchema, await context.params);
    const payload = validateInput(updateInternalUserSchema, await request.json());
    const user = await updateManagedInternalUser({ id, actorId: actor.id, ...payload });
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "internal_user_updated",
      entityType: "internal_user",
      entityId: user.id,
      metadata: { role: user.role, status: user.status, nameChanged: payload.name !== undefined },
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return safeErrorResponse(error, "User Ofissio belum dapat diperbarui.", 403);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.users.delete"), limit: 10, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:user:update");
    const { id } = validateInput(internalUserIdSchema, await context.params);
    const payload = validateInput(deleteInternalUserSchema, await request.json());
    const user = await deleteManagedInternalUser({ id, actorId: actor.id, ...payload });
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "internal_user_deleted", entityType: "internal_user", entityId: user.id, metadata: { role: user.role } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "User Ofissio belum dapat dihapus.", 403);
  }
}
