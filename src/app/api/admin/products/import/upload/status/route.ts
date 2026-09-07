import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getProductImportUploadStatus } from "@/features/product-import/product-import-staging.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime="nodejs";
export async function GET(request:Request){try{const actor=requireInternalAdmin(request,"admin:catalog:update");const url=new URL(request.url);const result=await getProductImportUploadStatus({batchId:url.searchParams.get("batchId")??"",uploadId:url.searchParams.get("uploadId")??"",actorId:actor.id});return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});}catch(error){return safeErrorResponse(error,"Status upload ZIP belum tersedia.",400);}}
