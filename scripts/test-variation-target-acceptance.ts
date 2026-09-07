import assert from "node:assert/strict";
import { acceptCurrentVariationTarget } from "../src/features/product-integrity-repair/variation-target-acceptance.service";
import { applyAcceptedVariationDisposition } from "../src/features/product-readiness/product-readiness-audit.service";
import { fingerprintVariationTarget } from "../src/features/product-integrity-repair/variation-blocker-triage";
import type { IntegrityRepairPlan, VariationBlockerTriage } from "../src/features/product-integrity-repair/product-integrity-repair.types";
import type { BulkProductQa } from "../src/features/product-readiness/product-readiness.types";
import type { WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const triage:VariationBlockerTriage={rootCauses:["SOURCE_DATA_INSUFFICIENT"],targetHealth:"HEALTHY",recommendation:"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE",sourceVariationCount:0,targetVariationCount:1,sourceWithSku:0,sourceWithoutSku:0,targetWithRawSku:0,targetWithoutRawSku:1,sourceCombinations:[],targetCombinations:["UKURAN=S"],emptyWildcardSource:0,emptyWildcardTarget:0,duplicateSourceAttributeKeys:0,duplicateSourceCombinations:0,duplicateTargetCombinations:0,unmatchedSourceVariations:0,unmatchedTargetVariations:1,variationCountMismatch:true,targetEvidence:["TARGET_HEALTHY_SOURCE_INCOMPLETE"],targetFingerprint:"abc",targetSnapshot:[{variationId:1,rawSku:"",attributes:"UKURAN=S",price:"150000",status:"publish"}]};
const row={id:"variation:1",repair:"VARIATION_IDENTITY" as const,productId:1,sku:"TG-054",product:"Jaket",sourceId:"10",current:"1 variation",target:"source unavailable",confidence:"NONE" as const,classification:"BLOCKED" as const,reason:"source unavailable",evidence:[],payload:{variationBlockerTriage:triage}};
const plan={generatedAt:"now",batchId:"batch",sourceCsv:{supplied:false,hashVerified:false,filename:null},rows:[row],summary:{} as IntegrityRepairPlan["summary"],safety:{wooWrites:0,variationWrites:0,mediaWrites:0,publishWrites:0}} satisfies IntegrityRepairPlan;
async function main(){let persisted:Record<string,unknown>|undefined;let audited=false;
const dependencies={getBatch:async()=>({id:"batch",result_json:{}}),mergeBatchResult:async(_id:string,patch:Record<string,unknown>)=>{persisted=patch;return patch;},buildPlan:async()=>plan,audit:()=>{audited=true;}};
const result=await acceptCurrentVariationTarget({batchId:"batch",productId:1,expectedFingerprint:"abc",acknowledged:true,actorId:"admin"},dependencies);
assert.equal(result.writes.woo,0);assert.equal(result.writes.variations,0);assert.ok(persisted?.acceptedVariationTargets);assert.equal(audited,true);
const variations=[{id:1,sku:"",rawSku:"",regular_price:"150000",status:"publish",attributes:[{name:"UKURAN",option:"S"}]}] as WooCommerceProductVariation[];
const qa={productId:1,sku:"TG-054",level:"BLOCKED",dispositionReason:null,issues:[{code:"variation_mismatch",label:"Variation source incomplete",group:"Variations",level:"BLOCKED"},{code:"missing_image",label:"Image missing",group:"Images",level:"BLOCKED"}]} as BulkProductQa;
const fingerprint=fingerprintVariationTarget(variations).targetFingerprint;
const accepted=applyAcceptedVariationDisposition(qa,variations,{disposition:"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE",reason:"TARGET_HEALTHY_SOURCE_INCOMPLETE",productId:1,targetFingerprint:fingerprint});
assert.equal(accepted.issues.some((issue)=>issue.group==="Variations"),false);assert.equal(accepted.issues.some((issue)=>issue.group==="Images"),true);assert.equal(accepted.level,"BLOCKED");assert.equal(accepted.dispositionReason,"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE");
const stale=applyAcceptedVariationDisposition(qa,variations,{disposition:"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE",reason:"TARGET_HEALTHY_SOURCE_INCOMPLETE",productId:1,targetFingerprint:"stale"});assert.equal(stale.issues.length,2);
await assert.rejects(()=>acceptCurrentVariationTarget({batchId:"batch",productId:1,expectedFingerprint:"wrong",acknowledged:true,actorId:"admin"},dependencies),/Target Woo berubah/);
const brokenPlan={...plan,rows:[{...row,payload:{variationBlockerTriage:{...triage,targetHealth:"BROKEN" as const,recommendation:"SOURCE_DATA_REVIEW_REQUIRED" as const}}}]};
await assert.rejects(()=>acceptCurrentVariationTarget({batchId:"batch",productId:1,expectedFingerprint:"abc",acknowledged:true,actorId:"admin"},{...dependencies,buildPlan:async()=>brokenPlan}),/tidak memenuhi syarat/);
console.log("PASS: explicit healthy-target acceptance persists auditable evidence with zero Woo writes and rejects broken/stale targets");
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
