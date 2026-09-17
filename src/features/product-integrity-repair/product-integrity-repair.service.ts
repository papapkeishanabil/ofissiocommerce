import "server-only";

import { createHash } from "node:crypto";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import { parseWooCommerceCsv } from "@/features/product-import/woocommerce-csv.parser";
import type { ProductImportPlan, WooCommerceImportProduct, WooImportIndex } from "@/features/product-import/product-import.types";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import type { WooCommerceProductVariation } from "@/features/products/woocommerce/woocommerce.types";
import { findWordPressMediaBySearch } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { attachRawVariationSkus } from "@/features/products/woocommerce/woocommerce-raw-variation.service";
import { isSpecialServiceAddon, SPECIAL_PRODUCT_DISPOSITION, SPECIAL_PRODUCT_REASON } from "@/features/products/special-product";
import { createApiError } from "@/lib/security/safe-error-response";
import type { IntegrityRepairPlan, IntegrityRepairRow, LegacyMediaReconciliation } from "./product-integrity-repair.types";
import { getApprovedManualMediaEvidence, KK020_MANUAL_MEDIA } from "./manual-media-evidence.service";
import { buildVariationBlockerTriage } from "./variation-blocker-triage";

type Row = Record<string, unknown>;

export async function buildIntegrityRepairPlan(input: { batchId: string; originalCsv?: string; csvFilename?: string }): Promise<IntegrityRepairPlan> {
  const batch = await productImportRepository.getBatch(input.batchId);
  if (!batch) throw createApiError("NOT_FOUND", "Batch import tidak ditemukan.", 404);
  const batchResult=batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?batch.result_json as Row:{};
  const acceptedVariationTargets=asRow(batchResult.acceptedVariationTargets);
  const legacyMediaVerifications=asRow(batchResult.legacyMediaVerifications);
  const items = (await productImportRepository.listItems(input.batchId)).filter((item) => item.status === "IMPORTED");
  const plan = batch.plan_json as ProductImportPlan | undefined;
  const source = parseAndVerifySource(input.originalCsv, String(batch.csv_sha256 ?? ""));
  const rows: IntegrityRepairRow[] = [];

  // LocalWP commonly runs only two PHP-FPM workers. Keep provider-bound work
  // within that capacity so a review cannot take the whole upstream offline.
  const records = await concurrent(items, 2, async (item) => {
    if (!item.target_product_id) return null;
    const product = await woocommerceClient.getProductById(String(item.target_product_id));
    const displayVariations = product.type === "variable" ? await woocommerceClient.getProductVariations(product.id, { per_page: 100 }) : [];
    const variations = displayVariations.length ? await attachRawVariationSkus(product.id, displayVariations) : [];
    const planned = plan?.products.find((candidate) => candidate.sourceId === String(item.source_id));
    const sourceParent = resolveSourceParent(source, String(item.source_id), String(item.source_sku ?? ""), planned?.sourceSku ?? null);
    const sourceVariations = sourceParent ? resolveSourceVariations(source, sourceParent) : [];
    return { item, product, variations, planned, sourceParent, sourceVariations };
  });

  for (const record of records) {
    if (!record) continue;
    const { item, product, variations, planned, sourceParent, sourceVariations } = record;
    const base = { productId: product.id, sku: product.sku || "UNKNOWN", product: product.name, sourceId: String(item.source_id ?? "") || null };

    if (isSpecialServiceAddon(product)) {
      rows.push({ id:`special:${product.id}`,repair:"SPECIAL_PRODUCT",...base,current:"WooCommerce service/add-on preserved",target:"Excluded from normal catalog readiness and repair",confidence:"EXACT_SOURCE_MATCH",classification:SPECIAL_PRODUCT_DISPOSITION,reason:SPECIAL_PRODUCT_REASON,evidence:["Special product / service add-on","Woo product remains unchanged","Excluded from Legacy Media, enrichment, readiness blockers, and bulk publish"],payload:{disposition:SPECIAL_PRODUCT_DISPOSITION,reason:SPECIAL_PRODUCT_REASON} });
      continue;
    }

    if (planned?.photoSource === "LEGACY_WOOCOMMERCE") {
      const persistedUrls=planned.legacySourceImages?.map((image)=>image.sourceUrl)??[];
      const manualEvidence=getApprovedManualMediaEvidence(batch,product.id);
      const manualUrls=manualEvidence?.sourceImages.sort((a,b)=>a.order-b.order).map((image)=>image.url)??[];
      const urls = sourceParent?.imageUrls.length ? sourceParent.imageUrls : persistedUrls.length ? persistedUrls : manualUrls;
      const matches = urls.length ? await concurrent(urls, 2, async (url) => ({ url, media: await findWordPressMediaBySearch(basename(url)) })) : [];
      const sourceEvidenceAvailable=Boolean(sourceParent||persistedUrls.length||manualEvidence);
      const reconciliation = sourceEvidenceAvailable && urls.length ? reconcileLegacyMediaState({ sourceUrls:urls, productImages:product.images ?? [], mediaMatches:matches }) : null;
      const classification = !reconciliation ? "BLOCKED" : reconciliation.state === "ALREADY_HEALTHY" ? "ALREADY_HEALTHY" : reconciliation.deterministic ? "AUTO_REPAIRABLE" : "BLOCKED";
      const reason = !reconciliation ? "URL media legacy tidak dipersistenkan. CSV WooCommerce asli dengan SHA-256 yang sama atau bukti manual administrator diperlukan." : reconciliation.state === "ALREADY_HEALTHY" ? "Woo product read-back memiliki seluruh image ID yang diharapkan dalam urutan sumber." : reconciliation.deterministic ? `${reconciliation.state}: setiap sumber memiliki tindakan upload/reuse yang terbukti dari identitas filename exact.` : "Media source memiliki lebih dari satu kandidat exact; rekonsiliasi otomatis diblokir.";
      const eligibleManualMedia=!sourceEvidenceAvailable&&product.id===KK020_MANUAL_MEDIA.productId&&String(item.source_id)===KK020_MANUAL_MEDIA.sourceId&&product.sku.trim().toUpperCase()===KK020_MANUAL_MEDIA.sku;
      rows.push({ id: `media:${product.id}`, repair: "LEGACY_MEDIA", ...base, current: `${product.images?.length ?? 0} permanent images`, target: reconciliation ? `${reconciliation.expectedSourceImages} expected, ${reconciliation.reusableMedia} reusable, ${reconciliation.uploadsRequired} upload, ${reconciliation.alreadyAttached} attached` : `${eligibleManualMedia?KK020_MANUAL_MEDIA.sourceUrls.length:planned.imageCount} expected source images`, confidence: reconciliation?.deterministic ? "EXACT_SOURCE_MATCH" : "NONE", classification, reason, evidence: [`Import item owned by batch`, `Photo source: LEGACY_WOOCOMMERCE`, `Expected images: ${eligibleManualMedia?KK020_MANUAL_MEDIA.sourceUrls.length:planned.imageCount}`, manualEvidence ? "MANUAL_SOURCE_EVIDENCE" : sourceParent ? "Source row reconstructed" : persistedUrls.length ? "Source identities persisted in import plan" : "Source row unavailable", `Woo image IDs: ${(product.images ?? []).map((image) => image.id).filter(Boolean).join(",") || "none"}`], payload: sourceEvidenceAvailable ? { sourceUrls: urls, reusableMedia: matches.map((match) => ({ sourceUrl: match.url, candidates: match.media })), mediaReconciliation:reconciliation, manualSourceEvidence:manualEvidence?{resolutionType:manualEvidence.resolutionType,approvedAt:manualEvidence.approvedAt,approvedBy:manualEvidence.approvedBy}:undefined } : eligibleManualMedia ? { manualMediaResolution:{eligible:true,sourceId:KK020_MANUAL_MEDIA.sourceId,sourceUrls:[...KK020_MANUAL_MEDIA.sourceUrls],expectedImages:KK020_MANUAL_MEDIA.sourceUrls.length} } : undefined });
    }

    const latestMediaRow=rows.at(-1);
    if(latestMediaRow?.repair==="LEGACY_MEDIA"&&latestMediaRow.productId===product.id)classifyPersistedMediaEvidence(latestMediaRow,product.images??[],legacyMediaVerifications[String(product.id)]);
    const expectedNoSku = planned?.variationWithoutSkuCount ?? planned?.warnings.filter((warning) => warning === "EMPTY_VARIATION_SKU").length ?? 0;
    const inherited = variations.filter((variation) => variationRawSku(variation).toUpperCase() === product.sku.trim().toUpperCase()).length;
    const emptyAttributes = variations.filter((variation) => !variation.attributes?.length || variation.attributes.some((attribute) => !attribute.option?.trim())).length;
    const comparison = compareVariations(sourceVariations, variations, product.sku);
    const variationBlockerTriage=comparison.repairable?undefined:buildVariationBlockerTriage({source:sourceVariations,target:variations,comparison});
    if (inherited > 0 || emptyAttributes > 0 || comparison.needsRepairRows > 0 || comparison.needsReview || (!sourceVariations.length && expectedNoSku > 0)) {
      rows.push({ id: `variation:${product.id}`, repair: "VARIATION_IDENTITY", ...base, current: `${variations.length} variations; ${inherited} parent-SKU; ${emptyAttributes} empty/wildcard`, target: sourceVariations.length ? sourceVariations.map(sourceIdentity).join(", ") : `${planned?.variationCount ?? variations.length} source variations`, confidence: comparison.repairable ? "EXACT_SOURCE_MATCH" : "NONE", classification: comparison.repairable ? "AUTO_REPAIRABLE" : "BLOCKED", reason: comparison.reason, evidence: [`Source variation rows available: ${sourceVariations.length ? "YES" : "NO"}`, `Source variations: ${sourceVariations.length}`, `Target variations: ${variations.length}`, `Exact SKU matches: ${comparison.exactSkuMatches}`, `Exact attribute matches: ${comparison.exactAttributeMatches}`, `Identity metadata matches: ${comparison.identityMatches}`, `Unmatched source rows: ${comparison.unmatchedSourceRows}`, `Unmatched target rows: ${comparison.unmatchedTargetRows}`, `Ambiguous mappings: ${comparison.ambiguousMappings}`, `Repairable rows: ${comparison.repairableRows}`, `Blocked rows: ${comparison.blockedRows}`, `Source-null SKU: ${sourceVariations.filter((v) => !v.sku).length || expectedNoSku}`, `Duplicate target combinations: ${comparison.duplicateTarget}`], payload: { sourceRowsAvailable: sourceVariations.length > 0, sourceVariationCount: sourceVariations.length, targetVariationCount: variations.length, sourceSkuNull: sourceVariations.filter((v) => !v.sku).length || expectedNoSku, inheritedParentSku: inherited, emptyAttributes, exactSkuMatches: comparison.exactSkuMatches, exactAttributeMatches: comparison.exactAttributeMatches, identityMatches: comparison.identityMatches, unmatchedSourceRows: comparison.unmatchedSourceRows, unmatchedTargetRows: comparison.unmatchedTargetRows, ambiguousMappings: comparison.ambiguousMappings, repairableRows: comparison.repairableRows, blockedRows: comparison.blockedRows, repairs: comparison.repairs } });
      const variationRow=rows.at(-1);
      if(variationRow?.repair==="VARIATION_IDENTITY"&&variationRow.payload){variationRow.payload.variationBlockerTriage=variationBlockerTriage;const accepted=asRow(acceptedVariationTargets[String(product.id)]);if(variationBlockerTriage?.targetHealth==="HEALTHY"&&variationBlockerTriage.recommendation==="ACCEPT_CURRENT_TARGET_WITH_EVIDENCE"&&accepted.targetFingerprint===variationBlockerTriage.targetFingerprint){variationRow.classification="ACCEPT_CURRENT_TARGET_WITH_EVIDENCE";variationRow.reason="TARGET_HEALTHY_SOURCE_INCOMPLETE";variationRow.payload.acceptance=accepted;}}
    }

    if (!product.sku.trim() || product.sku.trim().toUpperCase() === "UNKNOWN") {
      const exact = sourceParent?.sku && sourceParent.sku.toUpperCase() !== "UNKNOWN" ? sourceParent.sku : null;
      const suggestion = /\b([A-Z]{2,5}-\d{2,4})\b/i.exec(product.name)?.[1]?.toUpperCase() ?? null;
      const proposed = exact ?? suggestion;
      const conflict = proposed ? (await woocommerceClient.getProducts({ sku: proposed, status: "any", per_page: 10 })).some((p) => p.id !== product.id) : false;
      const childPrefixEvidence=Boolean(suggestion)&&variations.length>0&&variations.every((variation)=>variationRawSku(variation).toUpperCase().startsWith(`${suggestion}-`));
      const manualResolutionEligible=Boolean(suggestion&&!exact&&!conflict&&childPrefixEvidence);
      rows.push({ id: `sku:${product.id}`, repair: "SKU", ...base, current: product.sku || "empty", target: proposed ?? "undetermined", confidence: exact ? "EXACT_SOURCE_MATCH" : suggestion ? "STRONG_NORMALIZATION_SUGGESTION" : "NONE", classification: conflict ? "BLOCKED" : exact ? "AUTO_REPAIRABLE" : suggestion ? "MANUAL_REVIEW_REQUIRED" : "BLOCKED", reason: conflict ? `Target SKU ${proposed} already exists.` : exact ? "Exact source SKU reconstructed from hash-verified CSV." : manualResolutionEligible ? "Nama produk dan pola SKU variasi mendukung normalisasi, tetapi exact parent SKU tidak tersedia; persetujuan administrator tetap wajib." : suggestion ? "Suggestion is based on product name only and requires explicit review." : "No reliable source SKU evidence.", evidence: [`Source ID: ${item.source_id}`, `Import target SKU: ${String(item.target_sku ?? "") || "empty"}`, `Product name: ${product.name}`, `Child variation SKU prefix: ${childPrefixEvidence ? `${suggestion}-*` : "not proven"}`, `CSV evidence level: ${exact ? "EXACT_PARENT_SKU" : "NO_EXACT_PARENT_SKU"}`, `Conflict: ${conflict ? "yes" : "no"}`], payload: proposed ? { targetSku: proposed, manualResolution: { eligible:manualResolutionEligible,sourceParentId:String(item.source_id??""),evidence:manualResolutionEligible?["PRODUCT_NAME","CHILD_VARIATION_SKU_PREFIX"]:[],csvEvidenceLevel:exact?"EXACT_PARENT_SKU":"NO_EXACT_PARENT_SKU" } } : undefined });
    }

    if (product.status !== "draft") {
      rows.push({ id: `status:${product.id}`, repair: "STATUS", ...base, current: product.status, target: "draft", confidence: "EXACT_SOURCE_MATCH", classification: "AUTO_REPAIRABLE", reason: "Product target ID belongs to an IMPORTED item in this batch.", evidence: [`Batch: ${input.batchId}`, `Import item status: ${item.status}`, `Target product ID: ${item.target_product_id}`], payload: { status: "draft" } });
    }
  }

  const mediaRows = rows.filter((row) => row.repair === "LEGACY_MEDIA");
  const variationRows = rows.filter((row) => row.repair === "VARIATION_IDENTITY");
  const skuRows = rows.filter((row) => row.repair === "SKU");
  const countPayload = (key: string) => variationRows.reduce((sum, row) => sum + Number((row.payload as Record<string, unknown> | undefined)?.[key] ?? 0), 0);
  return { generatedAt: new Date().toISOString(), batchId: input.batchId, sourceCsv: { supplied: Boolean(input.originalCsv), hashVerified: Boolean(source), filename: input.csvFilename ?? null }, rows, summary: { legacyMediaProducts: mediaRows.length, legacySourceImages: mediaRows.reduce((sum, row) => sum + Number(((row.payload?.sourceUrls as unknown[]) ?? []).length || /^(\d+)/.exec(row.target)?.[1] || 0), 0), mediaReusable: mediaRows.reduce((sum, row) => sum + Number((row.payload?.mediaReconciliation as LegacyMediaReconciliation|undefined)?.reusableMedia ?? 0), 0), mediaUploadsRequired: mediaRows.reduce((sum, row) => sum + Number((row.payload?.mediaReconciliation as LegacyMediaReconciliation|undefined)?.uploadsRequired ?? 0), 0), mediaUnreachable: 0, variationProducts: variationRows.length, variationsAffected: variationRows.reduce((sum, row) => sum + Number(((row.payload?.repairs as unknown[]) ?? []).length), 0), sourceSkuNull: countPayload("sourceSkuNull"), parentSkuDuplicates: records.reduce((sum, record) => sum + (record&&!isSpecialServiceAddon(record.product)?record.variations.filter((v) => variationRawSku(v).toUpperCase() === record.product.sku.trim().toUpperCase()).length:0), 0), emptyAttributes: records.reduce((sum, record) => sum + (record&&!isSpecialServiceAddon(record.product)?record.variations.filter((v) => !v.attributes?.length || v.attributes.some((a) => !a.option?.trim())).length:0), 0), unknownSkuProducts: skuRows.length, skuAutoRepair: skuRows.filter((row) => row.classification === "AUTO_REPAIRABLE").length, skuManualReview: skuRows.filter((row) => row.classification === "MANUAL_REVIEW_REQUIRED").length, importedNonDraftProducts: rows.filter((row) => row.repair === "STATUS").length, autoRepairable: rows.filter((row) => row.classification === "AUTO_REPAIRABLE").length, manualReview: rows.filter((row) => row.classification === "MANUAL_REVIEW_REQUIRED").length, blocked: rows.filter((row) => row.classification === "BLOCKED" || row.classification === "TARGET_MEDIA_INCOMPLETE").length, specialProducts:rows.filter((row)=>row.classification===SPECIAL_PRODUCT_DISPOSITION).length, acceptedCurrentTarget:variationRows.filter((row)=>row.classification==="ACCEPT_CURRENT_TARGET_WITH_EVIDENCE").length, mediaVerifiedComplete:mediaRows.filter((row)=>row.classification==="VERIFIED_MEDIA_COMPLETE"||row.classification==="ALREADY_HEALTHY").length, mediaEvidenceReviewRequired:mediaRows.filter((row)=>row.classification==="MEDIA_EVIDENCE_REVIEW_REQUIRED").length, targetMediaIncomplete:mediaRows.filter((row)=>row.classification==="TARGET_MEDIA_INCOMPLETE").length }, safety: { wooWrites: 0, variationWrites: 0, mediaWrites: 0, publishWrites: 0 } };
}

export function reconcileLegacyMediaState(input:{sourceUrls:string[];productImages:Array<{id?:number;src?:string;name?:string}>;mediaMatches:Array<{url:string;media:Array<{id:number;sourceUrl:string;alt:string;title:string}>}>}):LegacyMediaReconciliation {
  const attachedIds=input.productImages.map((image)=>image.id).filter((id):id is number=>Number.isInteger(id));
  const attachedByIdentity=new Map<string,Array<{id:number;sourceUrl:string}>>();
  for(const image of input.productImages){if(!image.id)continue;for(const identity of [mediaIdentity(image.src??""),mediaIdentity(image.name??"")].filter(Boolean)){const values=attachedByIdentity.get(identity)??[];if(!values.some((candidate)=>candidate.id===image.id))values.push({id:image.id,sourceUrl:image.src??""});attachedByIdentity.set(identity,values);}}
  const items=input.sourceUrls.map((sourceUrl,index)=>{
    const sourceIdentity=mediaIdentity(sourceUrl);
    const searched=input.mediaMatches.find((match)=>match.url===sourceUrl)?.media??[];
    const exactSearched=searched.filter((candidate)=>mediaIdentity(candidate.sourceUrl)===sourceIdentity);
    const exactAttached=attachedByIdentity.get(sourceIdentity)??[];
    const candidates=[...exactSearched.map((candidate)=>({id:candidate.id,sourceUrl:candidate.sourceUrl})),...exactAttached].filter((candidate,position,all)=>all.findIndex((other)=>other.id===candidate.id)===position);
    const matched=candidates.length===1?candidates[0]:null;
    const attachedPosition=matched?attachedIds.indexOf(matched.id):-1;
    const alreadyAttached=attachedPosition>=0;
    return{sourceUrl,sourceIdentity,matchedMediaId:matched?.id??null,matchedMediaUrl:matched?.sourceUrl??null,alreadyAttached,attachedPosition:alreadyAttached?attachedPosition:null,action:candidates.length>1?"BLOCKED_AMBIGUOUS" as const:matched?(alreadyAttached?"ALREADY_ATTACHED" as const:"REUSE" as const):"UPLOAD" as const,candidateCount:candidates.length};
  });
  const deterministic=items.every((item)=>item.candidateCount<=1);
  const expectedIds=items.map((item)=>item.matchedMediaId);
  const orderedTargetVerified=deterministic&&items.length>0&&expectedIds.every((id):id is number=>id!==null)&&attachedIds.length===items.length&&expectedIds.every((id,index)=>attachedIds[index]===id);
  const reusableMedia=items.filter((item)=>item.matchedMediaId!==null).length;
  const uploadsRequired=items.filter((item)=>item.action==="UPLOAD").length;
  const alreadyAttached=items.filter((item)=>item.alreadyAttached).length;
  // "Missing" means the permanent WordPress media does not exist yet.
  // Reusable-but-not-attached media is reported separately via alreadyAttached.
  const missing=uploadsRequired;
  const state=!deterministic?"AMBIGUOUS_MEDIA_STATE":orderedTargetVerified?"ALREADY_HEALTHY":reusableMedia||alreadyAttached?"PARTIAL_MEDIA_STATE":"MISSING_MEDIA";
  return{state,expectedSourceImages:items.length,reusableMedia,uploadsRequired,alreadyAttached,missing,orderedTargetVerified,deterministic,items};
}

export function parseAndVerifySource(csv: string | undefined, expectedHash: string) { if (!csv) return null; const actual = createHash("sha256").update(csv).digest("hex"); if (actual !== expectedHash) throw createApiError("VALIDATION_ERROR", "CSV berbeda dari sumber batch. SHA-256 tidak cocok.", 400); return parseWooCommerceCsv(csv); }
function canonicalId(value: string | null | undefined) { return String(value ?? "").trim().replace(/^id:\s*/i, "").replace(/\.0+$/, ""); }
function resolveSourceParent(source: WooImportIndex | null, sourceId: string, trackedSku: string, plannedSku: string | null) {
  if (!source) return null;
  const wantedId = canonicalId(sourceId);
  return source.byId.get(sourceId)
    ?? source.parents.find((parent) => canonicalId(parent.sourceId) === wantedId)
    ?? [trackedSku, plannedSku].filter(Boolean).map((sku) => source.bySku.get(String(sku).trim().toUpperCase())).find(Boolean)
    ?? null;
}
export function resolveSourceVariations(source: WooImportIndex | null, parent: WooCommerceImportProduct) {
  if (!source) return [];
  const direct = source.variationsByParentId.get(parent.sourceId);
  if (direct?.length) return direct;
  const parentId = canonicalId(parent.sourceId);
  const parentSku = parent.sku?.trim().toUpperCase() ?? "";
  return source.rows.filter((row) => row.productType === "variation" && (
    (row.parentId !== null && canonicalId(row.parentId) === parentId)
    || (Boolean(parentSku) && row.parentSku?.trim().toUpperCase() === parentSku)
  ));
}
function sourceIdentity(v: WooCommerceImportProduct) { return `${sourceCombination(v) || "NO_ATTRIBUTES"} [SKU:${v.sku ?? "null"}]`; }
function sourceCombination(v: WooCommerceImportProduct) { return v.attributes.flatMap((a) => a.values.map((value) => `${a.name.trim().toUpperCase()}=${value.trim().toUpperCase()}`)).sort().join("|"); }
function targetIdentity(v: WooCommerceProductVariation) { return (v.attributes ?? []).map((a) => `${(a.name ?? String(a.id ?? "ATTRIBUTE")).trim().toUpperCase()}=${a.option.trim().toUpperCase()}`).sort().join("|"); }
export function compareVariations(source: WooCommerceImportProduct[], target: WooCommerceProductVariation[], parentSku: string) {
  const empty = { exactSkuMatches: 0, exactAttributeMatches: 0, identityMatches: 0, unmatchedSourceRows: source.length, unmatchedTargetRows: target.length, ambiguousMappings: 0, repairableRows: 0, needsRepairRows: 0, needsReview: false, blockedRows: source.length, duplicateTarget: 0, repairs: [] as Array<Record<string, unknown>> };
  if (!source.length) return { ...empty, repairable: false, reason: "Source variation rows are unavailable; hash-verified original CSV is required." };
  if (source.length !== target.length) return { ...empty, needsReview: true, repairable: false, reason: "Source and target variation counts differ." };
  const multiValueSourceRows = source.filter((variation) => variation.attributes.some((attribute) => attribute.values.length !== 1));
  if (multiValueSourceRows.length) return { ...empty, needsReview: true, ambiguousMappings: multiValueSourceRows.length, repairable: false, reason: "Source variation contains multiple values for the same attribute; the intended single option cannot be proven safely." };
  const sourceKeys = source.map(sourceCombination); if (sourceKeys.some((key) => !key) || new Set(sourceKeys).size !== sourceKeys.length) return { ...empty, needsReview: true, ambiguousMappings: source.length, repairable: false, reason: "Source contains empty or duplicate attribute combinations; manual review required." };
  const targetKeys = target.map(targetIdentity); const duplicateTarget = targetKeys.length - new Set(targetKeys.filter(Boolean)).size;
  const used = new Set<number>();
  let exactSkuMatches = 0, exactAttributeMatches = 0, identityMatches = 0, ambiguousMappings = 0;
  const mappings = source.map((variation) => {
    const skuCandidates = variation.sku ? target.filter((candidate) => !used.has(candidate.id) && variationRawSku(candidate).toUpperCase() === variation.sku?.trim().toUpperCase()) : [];
    const attributeCandidates = target.filter((candidate) => !used.has(candidate.id) && targetIdentity(candidate) === sourceCombination(variation));
    const metadataCandidates = target.filter((candidate) => !used.has(candidate.id) && (candidate.meta_data ?? []).some((meta) => meta.key === "_ofissio_import_identity" && JSON.stringify(meta.value).includes(variation.sourceId)));
    const exactSku = skuCandidates.length === 1 ? skuCandidates[0] : undefined;
    const exactAttributes = attributeCandidates.length === 1 ? attributeCandidates[0] : undefined;
    const sourceMetadata = metadataCandidates.length === 1 ? metadataCandidates[0] : undefined;
    if (skuCandidates.length > 1 || (!exactSku && attributeCandidates.length > 1) || (!exactSku && !exactAttributes && metadataCandidates.length > 1)) ambiguousMappings += 1;
    const matched = exactSku ?? exactAttributes ?? sourceMetadata;
    if (exactSku) exactSkuMatches += 1; else if (exactAttributes) exactAttributeMatches += 1; else if (sourceMetadata) identityMatches += 1;
    if (matched) used.add(matched.id);
    const targetAttributes=variation.attributes.flatMap((a) => a.values.map((option) => ({ name: a.name, option })));
    const needsRepair=(Boolean(matched)&&variationRawSku(matched!).toUpperCase()!==(variation.sku?.trim().toUpperCase()??""))||(Boolean(matched)&&targetIdentity(matched!)!==sourceCombination(variation));
    return { variationId: matched?.id, sourceId: variation.sourceId, currentSku: matched?variationRawSku(matched):"", displaySku: matched?.displaySku ?? matched?.sku ?? "", rawSku: matched?variationRawSku(matched):"", targetSku: variation.sku ?? "", currentAttributes: matched?.attributes ?? [], targetAttributes, currentPrice: matched?.regular_price ?? matched?.price ?? "", sourcePrice: variation.regularPrice ?? "", inheritedParentSku: matched?variationRawSku(matched).toUpperCase() === parentSku.trim().toUpperCase():false, inheritedFromParent: matched?.inheritedFromParent??false, needsRepair };
  });
  const repairableRows = mappings.filter((repair) => repair.variationId && repair.targetAttributes.length).length;
  const unmatchedSourceRows = mappings.filter((repair) => !repair.variationId).length;
  const unmatchedTargetRows = Math.max(0, target.length - used.size);
  const repairable = repairableRows === source.length && ambiguousMappings === 0;
  const repairs=mappings.filter(mapping=>mapping.needsRepair);
  return { repairable, needsReview: !repairable, reason: repairable ? repairs.length?"Exact mapping found for every target variation requiring reconciliation.":"Raw SKU, attributes, and source identity are already healthy." : "At least one source variation cannot be matched without guessing.", duplicateTarget, exactSkuMatches, exactAttributeMatches, identityMatches, unmatchedSourceRows, unmatchedTargetRows, ambiguousMappings, repairableRows, needsRepairRows:repairs.length, blockedRows: source.length - repairableRows, repairs };
}
function variationRawSku(variation:WooCommerceProductVariation){return (variation.rawSku??variation.sku??"").trim();}
function asRow(value:unknown):Row{return value&&typeof value==="object"&&!Array.isArray(value)?value as Row:{};}
export function classifyPersistedMediaEvidence(row:IntegrityRepairRow,images:Array<{id?:number}>,rawVerification:unknown){const verification=asRow(rawVerification);const expected=Array.isArray(verification.verifiedWooImageIds)?verification.verifiedWooImageIds.map(Number):[];const current=images.map((image)=>Number(image.id)).filter(Boolean);if(verification.status==="VERIFIED"&&verification.orderedVerified===true&&expected.length>0&&expected.join(",")===current.join(",")){row.classification="VERIFIED_MEDIA_COMPLETE";row.reason="Persisted final verification matches current ordered Woo image IDs.";row.payload={...(row.payload??{}),legacyMediaVerification:verification};return;}if(row.classification!=="BLOCKED")return;if(current.length===0){row.classification="TARGET_MEDIA_INCOMPLETE";row.reason="Target Woo product has no images and no persisted verified completion evidence.";}else{row.classification="MEDIA_EVIDENCE_REVIEW_REQUIRED";row.reason="Target has media, but exact historical source-to-media completion evidence is unavailable; image count alone is insufficient.";}row.payload={...(row.payload??{}),currentWooImageIds:current,mediaEvidenceAudit:{persistedVerification:Boolean(expected.length),exactOrderedMatch:false}};}
function basename(value: string) { try { return decodeURIComponent(new URL(value).pathname.split("/").pop() ?? "").replace(/\.[^.]+$/, ""); } catch { return value; } }
function mediaIdentity(value:string){try{return decodeURIComponent(new URL(value).pathname.split("/").at(-1)??"").replace(/\.[^.]+$/," ").trim().toLowerCase();}catch{return decodeURIComponent(value.split("/").at(-1)??value).replace(/\.[^.]+$/," ").trim().toLowerCase();}}
async function concurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) { const output = new Array<R>(items.length); let cursor = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (cursor < items.length) { const index = cursor++; output[index] = await fn(items[index]!); } })); return output; }
