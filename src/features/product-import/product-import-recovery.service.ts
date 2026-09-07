import "server-only";

import { parsePhotoManifest } from "./photo-manifest.parser";
import { productImportRepository } from "./product-import.repository";
import { createProductImportPreview } from "./product-import.service";
import { assertBatchSourceHashes, assertProductImportStagingKey } from "./product-import-staging.service";
import { getProductImportStagingProvider } from "./staging/product-import-staging.provider";
import { verifyProductPhotoZipFile } from "./product-import-zip.service";
import { enrichProductImportPlan } from "./product-import-plan-review";
import type { ProductImportBatchStatus, ProductImportDecisions, ProductImportPlan, ProductImportPreview, ZipVerificationResult } from "./product-import.types";

type Row = Record<string, unknown>;
type RecoverySnapshot = {
  uploadState?: string;
  preview?: ProductImportPreview;
  verification?: ZipVerificationResult;
  decisions?: ProductImportDecisions;
  dryRunError?: { code: string; message: string; at: string } | null;
};

export async function inspectProductImportRecovery(input: { batchId: string; actorId: string }) {
  const batch=await productImportRepository.assertOwnedBatch(input.batchId,input.actorId);
  const status=String(batch.status) as ProductImportBatchStatus;
  if(status==="CANCELLED")return recoveryResult(batch,"CANCELLED",null);
  if(["COMPLETED","COMPLETED_WITH_WARNINGS"].includes(status))return recoveryResult(batch,"COMPLETED",null);
  if(["UPLOADING","IMPORTING"].includes(status))return recoveryResult(batch,"NOT_RECOVERABLE",null);
  const result=resultFrom(batch);const staging=stagingFrom(batch,input.batchId);
  const trackedVerified=result.uploadState==="VERIFIED"&&staging.state==="VERIFIED";
  if(!trackedVerified)return recoveryResult(batch,"UPLOAD_REQUIRED",null);
  const file=await getProductImportStagingProvider().inspectFinalizedFile({batchId:input.batchId});
  const validation=validateRecoveredStaging(file,{sizeBytes:staging.sizeBytes,sha256:String(batch.zip_sha256??"")});
  if(validation!=="VALID"){await invalidate(batch,validation);return recoveryResult(batch,validation,file);}
  return recoveryResult(batch,"RECOVERABLE",file);
}

export async function findRecoverableProductImport(actorId:string){const batches=await productImportRepository.listOwnedBatches(actorId);const candidates=batches.filter(batch=>["PREVIEWED","FAILED"].includes(String(batch.status))).filter(batch=>{const result=resultFrom(batch);const staging=stagingObjects(batch)[0] as Row|undefined;return result.uploadState==="VERIFIED"&&staging?.state==="VERIFIED";});for(const batch of candidates){const recovery=await inspectProductImportRecovery({batchId:String(batch.id),actorId});if(recovery.recoveryState==="RECOVERABLE")return recovery;}return null;}

export async function rehydrateProductImport(input:{batchId:string;actorId:string;wooCsv?:string;manifestCsv?:string}){
  const recovery=await inspectProductImportRecovery({batchId:input.batchId,actorId:input.actorId});
  if(recovery.recoveryState!=="RECOVERABLE"||!recovery.file)throw new Error(recovery.recoveryState);
  const staged=await getProductImportStagingProvider().inspectFinalizedFile({batchId:input.batchId});if(!staged)throw new Error("STAGING_FILE_MISSING");
  const batch=await productImportRepository.assertOwnedBatch(input.batchId,input.actorId);const existing=resultFrom(batch);
  let preview=existing.preview;let verification=existing.verification;
  if(!preview||!verification){
    if(!input.wooCsv||!input.manifestCsv)throw new Error("SOURCE_FILES_REQUIRED");
    assertBatchSourceHashes(batch,input.wooCsv,input.manifestCsv);
    preview=createProductImportPreview(input.wooCsv,input.manifestCsv);
    verification=await verifyProductPhotoZipFile({filePath:staged.filePath,manifest:parsePhotoManifest(input.manifestCsv)});
    await productImportRepository.updateBatch(input.batchId,String(batch.status) as ProductImportBatchStatus,{result_json:{...existing,uploadState:"VERIFIED",preview,verification}});
  }
  const storedPlan=batch.plan_json&&typeof batch.plan_json==="object"&&!Array.isArray(batch.plan_json)?batch.plan_json as ProductImportPlan:null;
  const plan=storedPlan?enrichProductImportPlan(storedPlan,preview):null;
  return {...recovery,requiresSourceFiles:false,preview,verification,decisions:existing.decisions??{skuNormalizations:{},variantMappings:{}},dryRunError:existing.dryRunError??null,plan};
}

export function validateRecoveredStaging(file:{sizeBytes:number;sha256:string}|null,expected:{sizeBytes:number;sha256:string}){if(!file)return"STAGING_FILE_MISSING" as const;if(file.sizeBytes!==expected.sizeBytes)return"STAGING_SIZE_MISMATCH" as const;if(!expected.sha256||file.sha256.toLowerCase()!==expected.sha256.toLowerCase())return"STAGING_HASH_MISMATCH" as const;return"VALID" as const;}

export async function persistProductImportDryRunAttempt(input:{batchId:string;actorId:string;decisions:ProductImportDecisions;error?:unknown}){
  const batch=await productImportRepository.assertOwnedBatch(input.batchId,input.actorId);const current=resultFrom(batch);
  const error=input.error?{code:providerCode(input.error),message:input.error instanceof Error?input.error.message:"Dry run gagal.",at:new Date().toISOString()}:null;
  await productImportRepository.updateBatch(input.batchId,String(batch.status) as ProductImportBatchStatus,{result_json:{...current,uploadState:"VERIFIED",decisions:input.decisions,dryRunError:error}});
}

function recoveryResult(batch:Row,recoveryState:string,file:{filePath:string;sizeBytes:number;sha256:string}|null){const result=resultFrom(batch);return{batchId:String(batch.id),recoveryState,status:String(batch.status),csvFilename:String(batch.csv_filename),manifestFilename:String(batch.manifest_filename),zipFilename:String(batch.zip_filename),zipSizeBytes:Number((stagingObjects(batch)[0] as Row|undefined)?.sizeBytes??0),csvSha256:String(batch.csv_sha256),manifestSha256:String(batch.manifest_sha256),zipSha256:String(batch.zip_sha256),file:file?{sizeBytes:file.sizeBytes,sha256:file.sha256}:null,requiresSourceFiles:true,hasPersistedDecisions:Boolean(result.decisions),dryRunError:result.dryRunError??null};}
function resultFrom(batch:Row){return batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?batch.result_json as RecoverySnapshot:{};}
function stagingObjects(batch:Row){return Array.isArray(batch.staging_objects)?batch.staging_objects:[];}
function stagingFrom(batch:Row,batchId:string){const row=stagingObjects(batch)[0] as Row|undefined;if(!row||typeof row.key!=="string"||typeof row.sizeBytes!=="number")throw new Error("STAGING_TRACKING_MISSING");assertProductImportStagingKey(batchId,row.key);return{...row,key:row.key,sizeBytes:row.sizeBytes,state:String(row.state??"")};}
async function invalidate(batch:Row,reason:string){const result=resultFrom(batch);const objects=stagingObjects(batch).map((item,index)=>index===0&&item&&typeof item==="object"?{...(item as Row),state:reason}:item);await productImportRepository.updateBatch(String(batch.id),String(batch.status) as ProductImportBatchStatus,{result_json:{...result,uploadState:reason},staging_objects:objects});}
function providerCode(error:unknown){if(error&&typeof error==="object"&&"code" in error)return String(error.code);return /WooCommerce/i.test(error instanceof Error?error.message:"")?"PROVIDER_UNAVAILABLE":"DRY_RUN_FAILED";}
