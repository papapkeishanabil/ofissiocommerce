import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { writeProductImportChunk } from "@/features/product-import/product-import-staging.service";
import { ProductImportChunkWriteError } from "@/features/product-import/staging/product-import-staging.types";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime="nodejs";
export async function PUT(request:Request){
  const url=new URL(request.url);
  const batchId=url.searchParams.get("batchId")??"";
  const chunkIndex=Number(url.searchParams.get("chunkIndex"));
  let writeStarted=false;
  try{
    const actor=requireInternalAdmin(request,"admin:catalog:update");
    if(!request.body)throw new Error("Body chunk tidak tersedia.");
    const length=request.headers.get("content-length");
    writeStarted=true;
    const result=await writeProductImportChunk({batchId,uploadId:url.searchParams.get("uploadId")??"",chunkIndex,actorId:actor.id,body:request.body,contentLength:length===null?null:Number(length)});
    return NextResponse.json({ok:true,result});
  }catch(error){
    if(writeStarted){
      const diagnostic=error instanceof ProductImportChunkWriteError
        ? { expectedBytes:error.expectedBytes,receivedBytes:error.receivedBytes,errorCode:error.code,errorMessage:error.message }
        : { expectedBytes:null,receivedBytes:null,errorCode:"CHUNK_WRITE_ERROR",errorMessage:error instanceof Error?error.message:"Unknown chunk write error" };
      console.warn("PRODUCT_IMPORT_CHUNK_WRITE_FAILED",{batchId,chunkIndex,...diagnostic});
    }
    return safeErrorResponse(error,"Chunk ZIP belum dapat disimpan.",400);
  }
}
