import { createHash } from "node:crypto";
import type { WooCommerceImportProduct } from "@/features/product-import/product-import.types";
import type { WooCommerceProductVariation } from "@/features/products/woocommerce/woocommerce.types";
import type { VariationBlockerTriage, VariationTargetHealth, VariationTriageDisposition, VariationTriageRootCause } from "./product-integrity-repair.types";

type Comparison = { unmatchedSourceRows: number; unmatchedTargetRows: number; ambiguousMappings: number };

export function buildVariationBlockerTriage(input: { source: WooCommerceImportProduct[]; target: WooCommerceProductVariation[]; comparison: Comparison }): VariationBlockerTriage {
  const { source, target, comparison } = input;
  const sourceCombinations = source.map(sourceCombination);
  const targetCombinations = target.map(targetCombination);
  const sourceWithSku = source.filter((row) => Boolean(row.sku?.trim())).length;
  const targetWithRawSku = target.filter((row) => Boolean(rawSku(row))).length;
  const emptyWildcardSource = source.filter(sourceIsWildcard).length;
  const emptyWildcardTarget = target.filter(targetIsWildcard).length;
  const duplicateSourceAttributeKeys = source.reduce((sum, row) => sum + duplicateAttributeKeys(row), 0);
  const duplicateSourceCombinations = duplicateCount(sourceCombinations.filter(Boolean));
  const duplicateTargetCombinations = duplicateCount(targetCombinations.filter(Boolean));
  const variationCountMismatch = source.length !== target.length;
  const rootCauses: VariationTriageRootCause[] = [];
  const add = (value: VariationTriageRootCause) => { if (!rootCauses.includes(value)) rootCauses.push(value); };

  if (!source.length) { add("SOURCE_DATA_INSUFFICIENT"); add("SOURCE_ATTRIBUTES_MISSING"); }
  else if (sourceCombinations.some((value) => !value)) add("SOURCE_ATTRIBUTES_MISSING");
  if (emptyWildcardSource) add("SOURCE_ATTRIBUTES_WILDCARD");
  if (duplicateSourceAttributeKeys) add("SOURCE_DUPLICATE_ATTRIBUTE_KEY");
  if (duplicateSourceCombinations) add("SOURCE_DUPLICATE_COMBINATION");
  if (targetCombinations.some((value) => !value)) add("TARGET_ATTRIBUTES_MISSING");
  if (emptyWildcardTarget || duplicateTargetCombinations) add("TARGET_AMBIGUOUS");
  if (variationCountMismatch) add("VARIATION_COUNT_MISMATCH");
  if (sourceWithSku > 0 && sourceWithSku < source.length) add("SOURCE_SKU_INCOMPLETE");
  if (comparison.ambiguousMappings || comparison.unmatchedSourceRows || comparison.unmatchedTargetRows) add("SOURCE_TARGET_MAPPING_AMBIGUOUS");

  const targetHealth = assessTargetHealth(target, targetCombinations, emptyWildcardTarget, duplicateTargetCombinations);
  const recommendation = recommend(rootCauses, targetHealth);
  const targetEvidence = targetEvidenceLines(target, targetCombinations, targetHealth);
  if (targetHealth === "HEALTHY" && rootCauses.some(isSourceEvidenceIssue)) targetEvidence.unshift("TARGET_HEALTHY_SOURCE_INCOMPLETE");
  const {targetSnapshot,targetFingerprint}=fingerprintVariationTarget(target);

  return { rootCauses, targetHealth, recommendation, sourceVariationCount:source.length, targetVariationCount:target.length, sourceWithSku, sourceWithoutSku:source.length-sourceWithSku, targetWithRawSku, targetWithoutRawSku:target.length-targetWithRawSku, sourceCombinations, targetCombinations, emptyWildcardSource, emptyWildcardTarget, duplicateSourceAttributeKeys, duplicateSourceCombinations, duplicateTargetCombinations, unmatchedSourceVariations:comparison.unmatchedSourceRows, unmatchedTargetVariations:comparison.unmatchedTargetRows, variationCountMismatch, targetEvidence, targetFingerprint, targetSnapshot };
}

export function fingerprintVariationTarget(target:WooCommerceProductVariation[]){const targetSnapshot=target.map((row)=>({variationId:row.id,rawSku:rawSku(row),attributes:targetCombination(row),price:String(row.regular_price??row.price??""),status:row.status??"publish"})).sort((a,b)=>a.variationId-b.variationId);return{targetSnapshot,targetFingerprint:createHash("sha256").update(JSON.stringify(targetSnapshot)).digest("hex")};}

function assessTargetHealth(target:WooCommerceProductVariation[], combinations:string[], wildcards:number, duplicateCombinations:number):VariationTargetHealth {
  if (!target.length) return "UNKNOWN";
  const duplicateIds=target.length-new Set(target.map((row)=>row.id)).size;
  const nonEmptySkus=target.map(rawSku).filter(Boolean);
  const duplicateRawSkus=duplicateCount(nonEmptySkus.map((value)=>value.toUpperCase()));
  if (duplicateIds || wildcards || duplicateCombinations || duplicateRawSkus) return "BROKEN";
  const missingPrice=target.some((row)=>!String(row.regular_price??row.price??"").trim());
  const inactive=target.some((row)=>row.status && row.status!=="publish");
  return missingPrice||inactive||combinations.some((value)=>!value)?"PARTIALLY_HEALTHY":"HEALTHY";
}

function recommend(causes:VariationTriageRootCause[],health:VariationTargetHealth):VariationTriageDisposition {
  const sourceIncomplete=causes.some(isSourceEvidenceIssue);
  if (health==="HEALTHY"&&sourceIncomplete) return "ACCEPT_CURRENT_TARGET_WITH_EVIDENCE";
  if (health==="BROKEN"&&!sourceIncomplete) return "TARGET_REBUILD_CANDIDATE";
  if (causes.includes("SOURCE_DUPLICATE_ATTRIBUTE_KEY")||causes.includes("SOURCE_DUPLICATE_COMBINATION")||causes.includes("SOURCE_ATTRIBUTES_WILDCARD")) return "MANUAL_ATTRIBUTE_RESOLUTION";
  if (causes.includes("SOURCE_DATA_INSUFFICIENT")||causes.includes("SOURCE_ATTRIBUTES_MISSING")) return "SOURCE_DATA_REVIEW_REQUIRED";
  return "KEEP_BLOCKED";
}

function isSourceEvidenceIssue(value:VariationTriageRootCause){return value.startsWith("SOURCE_")||value==="VARIATION_COUNT_MISMATCH";}
function sourceCombination(row:WooCommerceImportProduct){return row.attributes.flatMap((attribute)=>attribute.values.map((value)=>`${attribute.name.trim().toUpperCase()}=${value.trim().toUpperCase()}`)).sort().join("|");}
function targetCombination(row:WooCommerceProductVariation){return (row.attributes??[]).map((attribute)=>`${(attribute.name??String(attribute.id??"ATTRIBUTE")).trim().toUpperCase()}=${attribute.option.trim().toUpperCase()}`).sort().join("|");}
function sourceIsWildcard(row:WooCommerceImportProduct){return !row.attributes.length||row.attributes.some((attribute)=>attribute.values.length!==1||attribute.values.some((value)=>!value.trim()));}
function targetIsWildcard(row:WooCommerceProductVariation){return !row.attributes?.length||row.attributes.some((attribute)=>!attribute.option.trim());}
function duplicateAttributeKeys(row:WooCommerceImportProduct){const keys=row.attributes.map((attribute)=>attribute.name.trim().toUpperCase());return keys.length-new Set(keys).size;}
function rawSku(row:WooCommerceProductVariation){return String(row.rawSku??row.sku??"").trim();}
function duplicateCount(values:string[]){return values.length-new Set(values).size;}
function targetEvidenceLines(target:WooCommerceProductVariation[],combinations:string[],health:VariationTargetHealth){const raw=target.map(rawSku);return [`Target health: ${health}`,`Unique variation IDs: ${new Set(target.map((row)=>row.id)).size}/${target.length}`,`Unique attribute combinations: ${new Set(combinations.filter(Boolean)).size}/${target.length}`,`Raw SKU populated: ${raw.filter(Boolean).length}/${target.length}`,`Prices populated: ${target.filter((row)=>Boolean(String(row.regular_price??row.price??"").trim())).length}/${target.length}`,`Published variations: ${target.filter((row)=>!row.status||row.status==="publish").length}/${target.length}`,"Parent association: verified by Woo parent variation endpoint"]}
