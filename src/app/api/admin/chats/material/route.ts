import { requireInternalAdmin } from "@/features/admin/admin.service";
import { materialResponse } from "@/features/ofistant-support/support-context.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireInternalAdmin(request, "admin:chat:manage"); return await materialResponse(z.string().min(1).max(160).parse(new URL(request.url).searchParams.get("id"))); }
  catch (error) { return safeErrorResponse(error); }
}
