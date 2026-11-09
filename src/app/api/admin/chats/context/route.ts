import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";
import { chatMaterials, chatProducts, contextDb, contextOwner, customerContext, prepareChatAttachment, updateChatContact, uploadChatMaterial } from "@/features/ofistant-support/support-context.service";
import { supportCommand } from "@/features/ofistant-support/support.service";
const uuid = z.string().uuid();
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    requireInternalAdmin(request, "admin:chat:manage");
    rateLimitOrThrow({ key: createRateLimitKey(request, "chat.context.read"), limit: 120, windowMs: 60000 });
    const q = new URL(request.url).searchParams; const id = uuid.parse(q.get("conversationId"));
    await contextOwner(id);
    const result = q.get("tab") === "products" ? await chatProducts((q.get("q") ?? "").slice(0, 100)) : q.get("tab") === "materials" ? await chatMaterials() : await customerContext(id, z.coerce.number().int().min(0).max(100000).parse(q.get("offset") ?? 0));
    return NextResponse.json({ result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return safeErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const actor = requireInternalAdmin(request, "admin:chat:manage");
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host")) throw createApiError("FORBIDDEN");
    rateLimitOrThrow({ key: createRateLimitKey(request, `chat.context.write.${actor.id}`), limit: 30, windowMs: 60000 });
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      requireInternalAdmin(request, "admin:content:update");
      if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) throw createApiError("BAD_REQUEST", "Batas file 10 MB.");
      const form = await request.formData(); const file = form.get("file");
      if (!(file instanceof File)) throw createApiError("BAD_REQUEST", "Pilih file materi.");
      const id = await uploadChatMaterial(file, z.string().trim().min(1).max(120).parse(form.get("title")), z.enum(["Ukuran", "Panduan", "Dokumen"]).parse(form.get("category")), actor.id);
      logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "chat_material_created", entityType: "chat_material", entityId: id });
      return NextResponse.json({ ok: true, id });
    }
    const body = await request.json(); const conversationId = uuid.parse(body.conversationId); await contextOwner(conversationId);
    if (body.action === "profile") {
      const profile = z.object({ name: z.string().trim().min(1).max(160), whatsapp: z.string().trim().max(40), notes: z.string().trim().max(2000) }).parse(body.profile);
      await updateChatContact(conversationId, profile, actor.id);
      logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "chat_contact_updated", entityType: "conversation", entityId: conversationId });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "archive") {
      requireInternalAdmin(request, "admin:content:update");
      const id = uuid.parse(body.resourceId); await contextDb().update("ofistant_materials", { active: false }, { id });
      logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "chat_material_archived", entityType: "chat_material", entityId: id });
      return NextResponse.json({ ok: true });
    }
    if (body.action !== "send") throw createApiError("BAD_REQUEST");
    const messageId = uuid.parse(body.messageId); const kind = z.enum(["product", "material"]).parse(body.kind); const id = z.string().min(1).max(160).parse(body.resourceId);
    const supportActor = { userId: actor.id, companyId: "", name: actor.name, staff: true };
    const current = await supportCommand(supportActor, "read", { conversationId });
    if (current.conversation?.status !== "active" || current.conversation.staffId !== actor.id) throw createApiError("FORBIDDEN", "Ambil percakapan terlebih dahulu.", 409);
    const existing = (await contextDb().select("ofistant_support_messages", { filters: { conversation_id: conversationId, id: messageId }, limit: 1 }))[0];
    if (existing) return NextResponse.json({ ok: true });
    const attachment = await prepareChatAttachment(kind, id, actor.id);
    await supportCommand(supportActor, "send", { conversationId, messageId, text: attachment.title, attachment });
    return NextResponse.json({ ok: true });
  } catch (error) { return safeErrorResponse(error); }
}
