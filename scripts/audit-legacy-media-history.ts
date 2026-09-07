import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main(){
  const {repositoryRegistry}=await import("../src/features/repositories/repository.factory");
  const events=await repositoryRegistry.auditLogs.listAll?.()??[];
  const rows=events.filter((event)=>event.action==="product_integrity_repaired"&&event.metadata.repairType==="LEGACY_MEDIA").map((event)=>({productId:event.entityId,result:event.metadata.result,createdAt:event.createdAt,hasSourceIdentity:Array.isArray(event.metadata.expectedImages),hasMediaIds:Array.isArray(event.metadata.verifiedWooImageIds)}));
  process.stdout.write(`${JSON.stringify({scannedEvents:events.length,successfulLegacyMediaEvents:rows.length,rows},null,2)}\n`);
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
