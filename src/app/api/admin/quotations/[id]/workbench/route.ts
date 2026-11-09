import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { saveEmbroideryQuotationWorkbench } from "@/features/quotation/quotation.service";
import { quotationWorkbenchSchema } from "@/features/quotation/quotation-workbench.validation";
import { validateInput } from "@/lib/security/validate-input";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: {params: Promise<{id:string}>}) {
  try {
    rateLimitOrThrow({key:createRateLimitKey(request,"quotation.workbench"),limit:30,windowMs:60000});
    const actor=requireInternalAdmin(request,"admin:quotation:update");
    const {id}=validateInput(adminIdParamSchema,await context.params);
    const payload=validateInput(quotationWorkbenchSchema,await request.json());
    const result=await saveEmbroideryQuotationWorkbench({id,payload,actorId:actor.id,request});
    return NextResponse.json({ok:true,...result});
  } catch(error) { return safeErrorResponse(error,"Rincian pesanan belum dapat disimpan.",400); }
}
