import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { updateKnowledgeArticle } from "@/features/ofistant-knowledge/ofistant-knowledge.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

const schema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  question: z.string().trim().min(5).max(500).optional(),
  answer: z.string().trim().min(10).max(5_000).optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = requireInternalAdmin(request, "admin:knowledge:update");
    const { id } = await context.params;
    const input = validateInput(schema, await request.json());
    const canPublish = input.status
      ? Boolean(requireInternalAdmin(request, "admin:knowledge:publish"))
      : actor.role === "super_admin";
    const article = await updateKnowledgeArticle({
      id, ...input, actorId: actor.id, canPublish,
    });
    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return safeErrorResponse(error, "Artikel belum dapat diperbarui.", 400);
  }
}
