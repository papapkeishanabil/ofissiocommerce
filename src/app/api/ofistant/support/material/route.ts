import { requireCompanyUser } from "@/features/auth/auth.service";
import { contextDb, contextOwner, materialResponse } from "@/features/ofistant-support/support-context.service";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = requireCompanyUser(request); const q = new URL(request.url).searchParams;
    const conversationId = z.string().uuid().parse(q.get("conversationId")); const id = z.string().uuid().parse(q.get("id"));
    const owner = await contextOwner(conversationId);
    if (owner.userId !== user.userId || owner.companyId !== user.companyId) throw createApiError("NOT_FOUND");
    const sent = await contextDb().select("ofistant_support_messages", { select: "id", filters: { conversation_id: conversationId, role: "staff", "attachment->>resourceId": id }, limit: 1 });
    if (!sent.length) throw createApiError("NOT_FOUND");
    return await materialResponse(id);
  } catch (error) { return safeErrorResponse(error); }
}
