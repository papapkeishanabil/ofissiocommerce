import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { resolveManualSku } from "@/features/product-integrity-repair/manual-sku-resolution.service";
import { createRateLimitKey,rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { SecurityApiError } from "@/lib/security/security.types";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    rateLimitOrThrow({key:createRateLimitKey(request,"admin.products.integrity-repair.manual-sku"),limit:2,windowMs:60_000});
    const actor=requireInternalAdmin(request,"admin:catalog:update");
    const body=await request.json() as Record<string,unknown>;
    const result=await resolveManualSku({batchId:String(body.batchId??""),productId:Number(body.productId),sourceParentId:String(body.sourceParentId??""),proposedSku:String(body.proposedSku??""),expectedCurrentSku:String(body.expectedCurrentSku??""),acknowledged:body.acknowledged===true,typedConfirmation:String(body.typedConfirmation??""),actorId:actor.id});
    return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof SecurityApiError&&(error.metadata.errorCode==="SKU_CONFLICT"||error.metadata.errorCode==="STALE_MANUAL_RESOLUTION"||error.metadata.errorCode==="MANUAL_SKU_VERIFICATION_FAILED")){
      return NextResponse.json({ok:false,message:error.publicMessage,code:error.metadata.errorCode,details:{targetSku:error.metadata.targetSku,conflictingEntityId:error.metadata.conflictingEntityId,entityType:error.metadata.entityType,currentProductSku:error.metadata.currentProductSku}},{status:error.status,headers:{"Cache-Control":"no-store"}});
    }
    return safeErrorResponse(error,"Resolusi SKU manual belum dapat diterapkan.",400);
  }
}
