import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { commitPage, readPage } from "@/features/page-builder/page.repository";
import { commandSchema } from "@/features/page-builder/page.schema";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string }> };
const noStore = { "Cache-Control": "no-store" };

async function pageSlug(context: Context) {
  const { slug } = await context.params;
  if (slug !== "about-us") throw createApiError("NOT_FOUND", "Halaman tidak ditemukan.", 404);
  return slug;
}

export async function GET(request: Request, context: Context) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.pages.read"), limit: 80, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:content:view");
    return NextResponse.json({ ok: true, state: await readPage(await pageSlug(context)) }, { headers: noStore });
  } catch (error) {
    return safeErrorResponse(error, "Halaman belum dapat dimuat.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.pages.write"), limit: 30, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:content:update");
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) {
      throw createApiError("FORBIDDEN", "Asal permintaan tidak diizinkan.", 403);
    }
    const slug = await pageSlug(context);
    const command = validateInput(commandSchema, await request.json().catch(() => null));
    const state = await commitPage(slug, command, actor.id);
    if (command.action === "publish") revalidatePath("/tentang-kami", "page");
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: `cms_page_${command.action}`, entityType: "cms_page", entityId: slug, metadata: { revision: state.revision } });
    return NextResponse.json({ ok: true, state }, { headers: noStore });
  } catch (error) {
    return safeErrorResponse(error, "Perubahan halaman belum dapat disimpan.");
  }
}
