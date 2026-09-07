import { loadEnvConfig } from "@next/env";
import { mkdirSync,writeFileSync } from "node:fs";
import type { VariationBlockerTriage } from "../src/features/product-integrity-repair/product-integrity-repair.types";

loadEnvConfig(process.cwd());

async function main(){
  const batchId=process.argv[2];if(!batchId)throw new Error("Batch ID required");
  const originalInfo=console.info;console.info=()=>{};
  const {buildIntegrityRepairPlan}=await import("../src/features/product-integrity-repair/product-integrity-repair.service");
  const plan=await buildIntegrityRepairPlan({batchId});
  console.info=originalInfo;
  const rows=plan.rows.filter((row)=>row.repair==="VARIATION_IDENTITY"&&row.classification==="BLOCKED").map((row)=>({row,triage:row.payload?.variationBlockerTriage as VariationBlockerTriage})).filter((entry)=>entry.triage);
  const count=(values:string[])=>values.reduce<Record<string,number>>((all,value)=>{all[value]=(all[value]??0)+1;return all;},{});
  const byDisposition=rows.reduce<Record<string,Array<{sku:string;product:string;productId:number;sourceId:string|null;targetHealth:string;rootCauses:string[]}>>>((all,{row,triage})=>{(all[triage.recommendation]??=[]).push({sku:row.sku,product:row.product,productId:row.productId,sourceId:row.sourceId,targetHealth:triage.targetHealth,rootCauses:triage.rootCauses});return all;},{});
  const media=plan.rows.filter((row)=>row.repair==="LEGACY_MEDIA");const mediaByStatus=count(media.map((row)=>row.classification));const mediaProducts=Object.fromEntries(Object.keys(mediaByStatus).map((status)=>[status,media.filter((row)=>row.classification===status).map((row)=>row.sku)]));
  const report=JSON.stringify({generatedAt:plan.generatedAt,batchId,topLevel:{blockedRepairRows:plan.summary.blocked,blockedVariationProducts:rows.length,specialProducts:plan.summary.specialProducts},byRootCause:count(rows.flatMap(({triage})=>triage.rootCauses)),byTargetHealth:count(rows.map(({triage})=>triage.targetHealth)),byRecommendedDisposition:count(rows.map(({triage})=>triage.recommendation)),productsByRecommendedDisposition:byDisposition,legacyMedia:{byStatus:mediaByStatus,productsByStatus:mediaProducts},safety:plan.safety},null,2);mkdirSync(".artifacts",{recursive:true});writeFileSync(".artifacts/phase3b1-closure-audit.json",report);process.stderr.write(`${report}\n`);
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
