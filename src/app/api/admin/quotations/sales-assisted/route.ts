import { NextResponse } from "next/server";

import {
  listAdminCustomers,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { createCustomQuotationRequest } from "@/features/quotation/quotation.service";
import { adminSalesAssistedQuotationBodySchema } from "@/features/quotation/quotation.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.quotation.sales_assisted"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const payload = validateInput(
      adminSalesAssistedQuotationBodySchema,
      await request.json(),
    );

    const customer = (await listAdminCustomers()).find(
      (item) => item.companyId === payload.companyId,
    );
    if (!customer) {
      throw createApiError(
        "BAD_REQUEST",
        "Pilih customer yang sudah terdaftar sebelum membuat brief sales-assisted.",
        400,
      );
    }

    const result = await createCustomQuotationRequest(
      {
        companyId: customer.companyId,
        companyName: customer.companyName,
        userId: actor.id,
        userEmail: payload.picEmail,
        userName: actor.name,
        picName: payload.picName,
        picEmail: payload.picEmail,
        picWhatsapp: payload.picWhatsapp ?? null,
        productionBrief: payload.productionBrief,
        referenceFileIds: [],
        customerNotes: payload.customerNotes ?? null,
        actorType: "internal",
        sendCustomerConfirmation: false,
      },
      request,
    );

    return NextResponse.json(
      {
        ok: true,
        brief: {
          id: result.quotation.id,
          referenceNumber: result.quotation.quotationNumber,
          status: result.quotation.status,
          approvalUrl: `/briefs/${result.quotation.id}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return safeErrorResponse(
      error,
      "Brief Full Custom dari sales belum dapat disimpan.",
      400,
    );
  }
}
