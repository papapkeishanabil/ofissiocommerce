import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getSupportTicket, updateSupportTicket } from "@/features/admin-notifications/support-ticket.service";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

const paramsSchema = z.object({ id: z.string().trim().min(1).max(180) });
const patchSchema = z.object({
  action: z.enum(["contact_started", "save_followup", "waiting_customer", "resolve"]),
  note: z.string().trim().max(4000).nullable().optional(),
  nextFollowupAt: z.string().datetime().nullable().optional(),
});
interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = requireInternalAdmin(request, "admin:notification:view");
    const { id } = validateInput(paramsSchema, await context.params);
    const ticket = await getSupportTicket(id, { role: actor.role, userId: actor.id });
    if (!ticket) throw createApiError("NOT_FOUND", "Tiket tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, ticket });
  } catch (error) { return safeErrorResponse(error, "Tiket belum dapat dibuka.", 403); }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = requireInternalAdmin(request, "admin:notification:update");
    const { id } = validateInput(paramsSchema, await context.params);
    const payload = validateInput(patchSchema, await request.json());
    const notification = await updateSupportTicket({ id, scope: { role: actor.role, userId: actor.id }, actorName: actor.name, ...payload });
    if (!notification) throw createApiError("NOT_FOUND", "Tiket tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, notification });
  } catch (error) { return safeErrorResponse(error, "Follow-up tiket belum dapat disimpan.", 403); }
}
