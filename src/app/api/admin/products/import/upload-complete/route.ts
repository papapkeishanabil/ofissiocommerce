import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { markProductImportUploadComplete } from "@/features/product-import/product-import-staging.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime = "nodejs";
export async function POST(request: Request) { try { const actor=requireInternalAdmin(request,"admin:catalog:update"); const body=await request.json() as {batchId?:string;uploadId?:string}; const result=await markProductImportUploadComplete({batchId:String(body.batchId??""),uploadId:String(body.uploadId??""),actorId:actor.id}); return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}}); } catch(error){return safeErrorResponse(error,"Upload ZIP belum dapat dikonfirmasi.",400);} }
