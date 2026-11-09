import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { changeManagedInternalUserPassword } from "@/features/admin-users/admin-user.service";
import { internalUserIdSchema, internalUserPasswordSchema } from "@/features/admin-users/admin-user.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.users.password"), limit: 5, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:user:update");
    const { id } = validateInput(internalUserIdSchema, await context.params);
    const payload = validateInput(internalUserPasswordSchema, await request.json());
    await changeManagedInternalUserPassword({ id, actorId: actor.id, password: payload.password });
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "internal_user_password_changed", entityType: "internal_user", entityId: id, metadata: { passwordChanged: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "Password user belum dapat diperbarui.", 403);
  }
}
