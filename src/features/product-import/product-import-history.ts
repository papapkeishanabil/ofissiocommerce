export type ProductImportHistoryState="FINAL"|"RETRYABLE_FAILED_ITEMS"|"FINAL_WITH_WARNINGS"|"CONTINUE_IMPORT"|"FAILED"|"CANCELLED"|"IN_PROGRESS";

export function classifyProductImportHistory(input:{status:string;failedItems:number;verifiedStaging:boolean}):ProductImportHistoryState{
  if(input.status==="COMPLETED"&&input.failedItems===0)return"FINAL";
  if(input.status==="COMPLETED_WITH_WARNINGS"&&input.failedItems>0)return"RETRYABLE_FAILED_ITEMS";
  if(input.status==="COMPLETED_WITH_WARNINGS")return"FINAL_WITH_WARNINGS";
  if(input.status==="PREVIEWED"&&input.verifiedStaging)return"CONTINUE_IMPORT";
  if(input.status==="CANCELLED")return"CANCELLED";
  if(input.status==="FAILED")return"FAILED";
  return"IN_PROGRESS";
}

export function countProductImportItemStatuses(rows:Array<Record<string,unknown>>){const byBatch=new Map<string,{imported:number;failed:number;skipped:number;pending:number;uploading:number}>();for(const row of rows){const id=String(row.batch_id);const counts=byBatch.get(id)??{imported:0,failed:0,skipped:0,pending:0,uploading:0};const key=String(row.status).toLowerCase() as keyof typeof counts;if(key in counts)counts[key]+=1;byBatch.set(id,counts);}return byBatch;}
