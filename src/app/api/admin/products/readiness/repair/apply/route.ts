import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { executeSelectedIntegrityRepairs } from "@/features/product-integrity-repair/product-integrity-repair-execute.service";
import { createRateLimitKey,rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime="nodejs";
export async function POST(request:Request){try{rateLimitOrThrow({key:createRateLimitKey(request,"admin.products.integrity-repair.apply"),limit:2,windowMs:60_000});const actor=requireInternalAdmin(request,"admin:catalog:update");const form=await request.formData();const file=form.get("wooCsv");const result=await executeSelectedIntegrityRepairs({batchId:String(form.get("batchId")??""),originalCsv:file instanceof File&&file.size?await file.text():undefined,csvFilename:file instanceof File?file.name:undefined,selectedIds:JSON.parse(String(form.get("selectedIds")??"[]")) as string[],actorId:actor.id});return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});}catch(error){return safeErrorResponse(error,"Repair belum dapat diterapkan.",400)}}
