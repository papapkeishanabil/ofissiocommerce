import { NextResponse } from "next/server";

import { getEmailRuntimeConfig } from "@/features/email/email.config";
import { emailService } from "@/features/email/email.service";
import { renderTestEmail } from "@/features/email/email.templates";
import { testEmailSchema } from "@/features/email/email.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (
      process.env.APP_ENV === "production" &&
      process.env.EMAIL_TEST_ALLOW_PRODUCTION !== "true"
    ) {
      throw createApiError("FORBIDDEN", "Test email dinonaktifkan di production.", 403);
    }
    rateLimitOrThrow({
      key: createRateLimitKey(request, "email.test"),
      limit: 10,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:view");
    const payload = validateInput(testEmailSchema, await request.json());
    const config = getEmailRuntimeConfig();
    const to = payload.to ?? config.salesQuotationEmail ?? "sales-placeholder@ofissio.local";
    const template = renderTestEmail();
    const result = await emailService.sendEmail({
      type: "test_email",
      companyId: null,
      userId: actor.id,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
      request,
      safeMetadata: {
        route: "/api/email/test",
        actorRole: actor.role,
        emailEnabled: config.enabled,
        requestedProvider: config.requestedProvider,
      },
    });
    return NextResponse.json({ ok: true, email: result });
  } catch (error) {
    return safeErrorResponse(error, "Test email belum dapat diproses.", 400);
  }
}
