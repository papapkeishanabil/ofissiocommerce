import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { acceptCurrentVariationTarget } from "@/features/product-integrity-repair/variation-target-acceptance.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime="nodejs";
export async function POST(request:Request){try{rateLimitOrThrow({key:createRateLimitKey(request,"admin.products.integrity-repair.accept-variation"),limit:6,windowMs:60_000});const actor=requireInternalAdmin(request,"admin:catalog:update");const body=await request.json() as Record<string,unknown>;const result=await acceptCurrentVariationTarget({batchId:String(body.batchId??"").trim(),productId:Number(body.productId),expectedFingerprint:String(body.expectedFingerprint??""),acknowledged:body.acknowledged===true,actorId:actor.id});return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});}catch(error){return safeErrorResponse(error,"Target variasi belum dapat diterima.",400);}}
