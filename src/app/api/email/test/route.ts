import { NextResponse } from "next/server";

import { emailService } from "@/features/email/email.service";
import { renderTestEmail } from "@/features/email/email.templates";
import { testEmailSchema } from "@/features/email/email.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.APP_ENV === "production") {
      throw createApiError("FORBIDDEN", "Test email dinonaktifkan di production.", 403);
    }
    rateLimitOrThrow({
      key: createRateLimitKey(request, "email.test"),
      limit: 10,
      windowMs: 60_000,
    });
    const payload = validateInput(testEmailSchema, await request.json());
    const session = requireAuth(request);
    requireRole(session, "quotation:create");
    const template = renderTestEmail();
    const result = await emailService.sendEmail({
      type: "test_email",
      companyId: session.companyId,
      userId: session.userId,
      to: [payload.to ?? session.email ?? "customer-placeholder@ofissio.local"],
      subject: template.subject,
      html: template.html,
      text: template.text,
      request,
      safeMetadata: { route: "/api/email/test" },
    });
    return NextResponse.json({ ok: true, email: result });
  } catch (error) {
    return safeErrorResponse(error, "Test email belum dapat diproses.", 400);
  }
}
