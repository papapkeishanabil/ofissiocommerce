import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createKnowledgeArticle, listKnowledgeArticles } from "@/features/ofistant-knowledge/ofistant-knowledge.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  question: z.string().trim().min(5).max(500),
  answer: z.string().trim().min(10).max(5_000),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

export async function GET(request: Request) {
  try {
    requireInternalAdmin(request, "admin:knowledge:view");
    return NextResponse.json({ ok: true, articles: await listKnowledgeArticles() });
  } catch (error) {
    return safeErrorResponse(error, "Knowledge Base belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireInternalAdmin(request, "admin:knowledge:update");
    const input = validateInput(schema, await request.json());
    return NextResponse.json({ ok: true, article: await createKnowledgeArticle({ ...input, actorId: actor.id }) });
  } catch (error) {
    return safeErrorResponse(error, "Draft artikel belum dapat dibuat.", 400);
  }
}

