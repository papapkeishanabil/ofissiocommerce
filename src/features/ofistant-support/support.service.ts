import "server-only";
import { z } from "zod";
import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { requireCompanyUser } from "@/features/auth/auth.service";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import type { SupportResult } from "./support.types";

export interface SupportActor { userId: string; companyId: string; name: string; staff: boolean }
const querySchema = z.object({
  conversationId: z.string().uuid().optional(),
  after: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  status: z.enum(["waiting", "active", "closed"]).default("waiting"),
});
const mutationSchema = z.object({
  action: z.enum(["start", "send", "claim", "close"]), conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional(), text: z.string().trim().min(1).max(2000).optional(),
  after: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
}).superRefine((v, ctx) => {
  if (v.action === "send" && (!v.messageId || !v.text)) ctx.addIssue({ code: "custom", message: "Pesan belum lengkap." });
});

export async function supportCommand(actor: SupportActor, action: string, payload: Record<string, unknown>): Promise<SupportResult> {
  if (process.env.OFISTANT_SUPPORT_ENABLED !== "true") throw createApiError("PROVIDER_UNAVAILABLE", "Chat tim Ofissio belum tersedia. Silakan coba lagi nanti.", 503);
  const config = getDatabaseRuntimeConfig();
  // Chat must persist across restarts; never pretend a volatile queue is a live inbox.
  if (config.provider !== "supabase" || !config.isConfigured) throw createApiError("PROVIDER_UNAVAILABLE");
  const response = await fetch(new URL("/rest/v1/rpc/ofistant_support_command", config.supabase.url), {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { apikey: config.supabase.serviceRoleKey, Authorization: `Bearer ${config.supabase.serviceRoleKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_user_id: actor.userId, p_company_id: actor.companyId, p_staff: actor.staff, p_name: actor.name, p_action: action, p_payload: payload }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.message === "SUPPORT_NOT_FOUND") throw createApiError("NOT_FOUND", "Percakapan tidak ditemukan.");
    if (body?.message === "SUPPORT_ASSIGNED") throw createApiError("FORBIDDEN", "Percakapan sedang ditangani staf lain. Ambil percakapan yang belum ditangani.", 409);
    if (body?.message === "SUPPORT_CLOSED") throw createApiError("BAD_REQUEST", "Percakapan sudah selesai. Buka kembali untuk mengirim pesan.", 409);
    throw createApiError("PROVIDER_UNAVAILABLE", "Chat belum dapat dimuat atau disimpan. Silakan coba lagi.", 503);
  }
  return body;
}

export async function supportRoute(request: Request, staff: boolean) {
  try {
    if (!staff && request.method === "GET" && process.env.OFISTANT_SUPPORT_ENABLED !== "true") return NextResponse.json({ ok: true, result: { enabled: false, conversation: null, messages: [], next: 0, more: false } }, { headers: { "Cache-Control": "private, no-store" } });
    let actor: SupportActor;
    if (staff) {
      const user = requireInternalAdmin(request, "admin:chat:manage");
      actor = { userId: user.id, companyId: "", name: user.name, staff: true };
    } else {
      const user = requireCompanyUser(request);
      actor = { userId: user.userId, companyId: user.companyId, name: user.name || "Customer", staff: false };
    }
    const write = request.method === "POST";
    if (write) {
      const origin = request.headers.get("origin");
      if (!origin || new URL(origin).host !== request.headers.get("host")) throw createApiError("FORBIDDEN");
    }
    rateLimitOrThrow({ key: createRateLimitKey(request, `ofistant.support.${actor.userId}.${write ? "write" : "read"}`), limit: write ? 40 : 120, windowMs: 60000 });
    const parsed = write ? mutationSchema.safeParse(await request.json()) : querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw createApiError("BAD_REQUEST", "Permintaan chat tidak valid.");
    const payload = parsed.data;
    const action = "action" in payload ? payload.action : payload.conversationId ? "read" : "list";
    if ((!staff && (action === "claim" || action === "list")) || (staff && action === "start")) throw createApiError("FORBIDDEN");
    const result = await supportCommand(actor, action, payload);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    const response = safeErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
