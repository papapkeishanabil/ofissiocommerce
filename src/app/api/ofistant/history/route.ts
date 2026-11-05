import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyUser } from "@/features/auth/auth.service";
import { historyCommand, listConversations } from "@/features/ofistant-history/history.repository";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
const querySchema = z.object({
  conversationId: z.string().uuid().optional(),
  before: z.coerce.number().int().positive().max(2147483647).optional(),
  offset: z.coerce.number().int().nonnegative().max(100000).default(0),
});
export async function GET(request: Request) {
  try {
    const session = requireCompanyUser(request);
    rateLimitOrThrow({ key: createRateLimitKey(request, "ofistant.history"), limit: 90, windowMs: 60000 });
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw createApiError("BAD_REQUEST", "Permintaan riwayat tidak valid.", 400);
    const query = parsed.data;
    const result = query.conversationId
      ? await historyCommand(session, "read", query)
      : await listConversations(session, query.offset);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    const response = safeErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
