import "server-only";

import { productImportRepository } from "@/features/product-import/product-import.repository";
import { logAdminEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { buildIntegrityRepairPlan } from "./product-integrity-repair.service";
import type { VariationBlockerTriage } from "./product-integrity-repair.types";

type Row=Record<string,unknown>;
interface AcceptanceDependencies{getBatch:typeof productImportRepository.getBatch;mergeBatchResult:typeof productImportRepository.mergeBatchResult;buildPlan:typeof buildIntegrityRepairPlan;audit:(input:Parameters<typeof logAdminEvent>[0])=>unknown;}
const defaults:AcceptanceDependencies={getBatch:productImportRepository.getBatch.bind(productImportRepository),mergeBatchResult:productImportRepository.mergeBatchResult.bind(productImportRepository),buildPlan:buildIntegrityRepairPlan,audit:logAdminEvent};

export async function acceptCurrentVariationTarget(input:{batchId:string;productId:number;expectedFingerprint:string;acknowledged:boolean;actorId:string},dependencies:AcceptanceDependencies=defaults){
  if(!input.batchId||!Number.isFinite(input.productId)||!input.expectedFingerprint||!input.acknowledged)throw createApiError("VALIDATION_ERROR","Bukti target dan persetujuan administrator wajib lengkap.",400);
  const batch=await dependencies.getBatch(input.batchId);if(!batch)throw createApiError("NOT_FOUND","Batch import tidak ditemukan.",404);
  const plan=await dependencies.buildPlan({batchId:input.batchId});
  const row=plan.rows.find((candidate)=>candidate.repair==="VARIATION_IDENTITY"&&candidate.productId===input.productId);
  const triage=row?.payload?.variationBlockerTriage as VariationBlockerTriage|undefined;
  if(!row||row.classification!=="BLOCKED"||triage?.targetHealth!=="HEALTHY"||triage.recommendation!=="ACCEPT_CURRENT_TARGET_WITH_EVIDENCE")throw createApiError("VALIDATION_ERROR","Target tidak memenuhi syarat acceptance berbasis evidence.",409);
  if(triage.targetFingerprint!==input.expectedFingerprint)throw createApiError("VALIDATION_ERROR","Target Woo berubah. Jalankan triage baru.",409);
  const result=asRow(batch.result_json);const current=asRow(result.acceptedVariationTargets);const acceptedAt=new Date().toISOString();
  const evidence={disposition:"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE",reason:"TARGET_HEALTHY_SOURCE_INCOMPLETE",productId:row.productId,sku:row.sku,sourceId:row.sourceId,targetHealth:triage.targetHealth,targetFingerprint:triage.targetFingerprint,targetSnapshot:triage.targetSnapshot,variationCount:triage.targetVariationCount,sourceLimitationReason:triage.rootCauses,acceptedAt,acceptedBy:input.actorId};
  await dependencies.mergeBatchResult(input.batchId,{acceptedVariationTargets:{...current,[String(row.productId)]:evidence},integrityRepairPlanInvalidatedAt:acceptedAt});
  dependencies.audit({actorId:input.actorId,action:"variation_target_accepted_with_evidence",entityType:"woocommerce_product",entityId:String(row.productId),metadata:{batchId:input.batchId,...evidence}});
  return{message:`Target variasi ${row.sku} diterima dengan evidence tanpa Woo write.`,evidence,writes:{woo:0,variations:0,sku:0,attributes:0,price:0,status:0,media:0}};
}
function asRow(value:unknown):Row{return value&&typeof value==="object"&&!Array.isArray(value)?value as Row:{};}
