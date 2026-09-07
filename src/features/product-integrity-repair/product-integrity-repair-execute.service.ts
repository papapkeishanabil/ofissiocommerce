import "server-only";

import { inspectTrustedLegacyImage, LegacyImageSourceError } from "@/features/product-import/product-import-legacy-image.service";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import { isTransientWooCommerceError, woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { getRawVariationSkus } from "@/features/products/woocommerce/woocommerce-raw-variation.service";
import type { WooCommerceProductVariation, WooCommerceProductVariationWritePayload } from "@/features/products/woocommerce/woocommerce.types";
import { findWordPressMediaBySearch, getWordPressMediaById, uploadProductImageToWordPress } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { logAdminEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { buildIntegrityRepairPlan } from "./product-integrity-repair.service";
import type { IntegrityRepairExecutionResult, IntegrityRepairRow, LegacyMediaRepairStage, LegacyMediaVerification } from "./product-integrity-repair.types";
import { withLegacyMediaWriteSlot } from "./legacy-media-write-gate";

type RepairStatus = IntegrityRepairExecutionResult["status"];
type LegacyMediaCounts = { expectedImages:number; reusedImages:number; uploadedImages:number; attachedImages:number; verifiedImages:number };

export async function executeSelectedIntegrityRepairs(input:{batchId:string;originalCsv?:string;csvFilename?:string;selectedIds:string[];actorId:string}) {
  if (!input.selectedIds.length) throw createApiError("VALIDATION_ERROR", "Pilih minimal satu repair.", 400);
  const plan = await buildIntegrityRepairPlan(input);
  const selected = plan.rows.filter((row) => input.selectedIds.includes(row.id));
  if (selected.length !== input.selectedIds.length) throw createApiError("VALIDATION_ERROR", "Repair plan berubah. Jalankan Dry Run kembali.", 409);
  if (selected.some((row) => row.classification !== "AUTO_REPAIRABLE")) throw createApiError("VALIDATION_ERROR", "Hanya repair AUTO_REPAIRABLE yang dapat diterapkan.", 400);
  const results: IntegrityRepairExecutionResult[] = [];
  for (const row of selected) {
    try {
      if (row.repair === "STATUS") {
        const current = await woocommerceClient.getProductById(row.productId);
        if (current.status === "draft") results.push(baseResult(row, "ALREADY_HEALTHY", "Status sudah draft."));
        else { await updateProductWithReconciliation(row.productId, { status:"draft" }, (product) => product.status === "draft"); results.push(baseResult(row, "REPAIRED", `${current.status} → draft`)); }
      } else if (row.repair === "SKU") {
        const target = String(row.payload?.targetSku ?? "");
        const current = await woocommerceClient.getProductById(row.productId);
        if (current.sku === target) results.push(baseResult(row, "ALREADY_HEALTHY", "SKU sudah sesuai."));
        else { await updateProductWithReconciliation(row.productId, { sku:target }, (product) => product.sku === target); results.push(baseResult(row, "REPAIRED", `${current.sku} → ${target}`)); }
      } else if (row.repair === "VARIATION_IDENTITY") {
        const repairs = (row.payload?.repairs ?? []) as Array<Record<string,unknown>>;
        const outcome = await repairAndVerifyVariations(row.productId, repairs);
        results.push(baseResult(row, "REPAIRED", `${outcome.verified}/${outcome.total} variation identities verified.`));
      } else if (row.repair === "LEGACY_MEDIA") {const result=await repairLegacyMedia(row);results.push(result);if(result.legacyMediaVerification)await persistLegacyMediaVerification(input.batchId,row.productId,result.legacyMediaVerification);}
      logResult(input, row.productId, row.repair, results.at(-1)?.status ?? "FAILED");
    } catch (error) {
      const partial = error instanceof PartialVariationRepairError && error.verified > 0;
      const status:RepairStatus = partial ? "PARTIALLY_REPAIRED" : "FAILED";
      if (error instanceof LegacyMediaRepairError) {
        results.push({ ...baseResult(row, status, error.safeMessage), failureStage:error.failureStage, errorCode:error.errorCode, safeMessage:error.safeMessage, sourceImageIndex:error.sourceImageIndex, ...error.counts });
        logLegacyFailure(row, error);
      } else {
        const message = error instanceof PartialVariationRepairError ? `${error.verified}/${error.total} variations verified; product repair is not complete. ${safeCause(error.cause)}` : safeCause(error);
        results.push(baseResult(row, status, message));
      }
      logResult(input, row.productId, row.repair, status);
    }
  }
  return { batchId:input.batchId, results };
}

interface LegacyMediaRepairDependencies {
  inspect?: typeof inspectTrustedLegacyImage;
  search?: typeof findWordPressMediaBySearch;
  readMedia?: typeof getWordPressMediaById;
  upload?: typeof uploadProductImageToWordPress;
  attach?: (productId:number,images:Array<{id:number;src:string;name:string;alt:string}>)=>Promise<unknown>;
  readProduct?: typeof woocommerceClient.getProductById;
}

export async function repairLegacyMedia(row:IntegrityRepairRow, dependencies:LegacyMediaRepairDependencies={}):Promise<IntegrityRepairExecutionResult> {
  return withLegacyMediaWriteSlot(`legacy-media:${row.productId}`, () => repairLegacyMediaSequential(row, dependencies));
}

async function repairLegacyMediaSequential(row:IntegrityRepairRow, dependencies:LegacyMediaRepairDependencies={}):Promise<IntegrityRepairExecutionResult> {
  const inspect=dependencies.inspect??inspectTrustedLegacyImage;
  const search=dependencies.search??findWordPressMediaBySearch;
  const readMedia=dependencies.readMedia??getWordPressMediaById;
  const upload=dependencies.upload??uploadProductImageToWordPress;
  const attach=dependencies.attach??((productId,images)=>updateProductWithReconciliation(productId,{images},(product)=>sameImageIds(product.images, images)));
  const readProduct=dependencies.readProduct??woocommerceClient.getProductById.bind(woocommerceClient);
  const sourceUrls = Array.isArray(row.payload?.sourceUrls) ? row.payload.sourceUrls.filter((value):value is string => typeof value === "string" && Boolean(value.trim())) : [];
  const counts:LegacyMediaCounts = { expectedImages:sourceUrls.length, reusedImages:0, uploadedImages:0, attachedImages:0, verifiedImages:0 };
  emitStage(row, "PLAN_VALIDATION", undefined, counts);
  if (!sourceUrls.length) throw new LegacyMediaRepairError("PLAN_VALIDATION", "SOURCE_URLS_MISSING", "Rencana repair tidak memiliki URL sumber legacy image.", undefined, counts);
  const images:Array<{id:number;src:string;name:string;alt:string}> = [];
  const verifiedIdentities:LegacyMediaVerification["expectedImages"]=[];
  for (let sourceImageIndex=0; sourceImageIndex<sourceUrls.length; sourceImageIndex+=1) {
    try {
      const inspected = await inspect(sourceUrls[sourceImageIndex]!, { onStage:(stage) => emitStage(row, stage, sourceImageIndex, counts) });
      emitStage(row, "MEDIA_SEARCH", sourceImageIndex, counts);
      let matches;
      try { matches = await search(inspected.filename.replace(/\.[^.]+$/, "")); }
      catch (cause) { throw new LegacyMediaRepairError("MEDIA_SEARCH", "MEDIA_SEARCH_FAILED", "Pencarian WordPress Media gagal.", sourceImageIndex, counts, cause); }
      const existing = matches.find((candidate) => filenameStem(candidate.sourceUrl) === filenameStem(inspected.filename));
      let media = existing;
      if (!media) {
        emitStage(row, "MEDIA_UPLOAD", sourceImageIndex, counts);
        try { media = await upload({ file:new File([Buffer.from(inspected.bytes)], inspected.filename, { type:inspected.mimeType }), filename:inspected.filename, mimeType:inspected.mimeType, title:`${row.sku} ${row.product}`, alt:`${row.product} ${row.sku}` }); }
        catch (cause) { throw new LegacyMediaRepairError("MEDIA_UPLOAD", "MEDIA_UPLOAD_FAILED", "Upload WordPress Media gagal.", sourceImageIndex, counts, cause); }
        counts.uploadedImages += 1;
      } else counts.reusedImages += 1;
      if (!media) throw new LegacyMediaRepairError("MEDIA_READBACK", "MEDIA_ID_MISSING", "WordPress Media ID tidak tersedia setelah upload/reuse.", sourceImageIndex, counts);
      emitStage(row, "MEDIA_READBACK", sourceImageIndex, counts);
      let confirmedMedia;
      try { confirmedMedia = await readMedia(media.id); }
      catch (cause) { throw new LegacyMediaRepairError("MEDIA_READBACK", "MEDIA_READBACK_FAILED", "WordPress Media belum dapat dibaca kembali.", sourceImageIndex, counts, cause); }
      if (!verifyWordPressMediaReadback({ expectedMediaId:media.id, expectedFilename:inspected.filename, expectedMimeType:inspected.mimeType, media:confirmedMedia })) {
        throw new LegacyMediaRepairError("MEDIA_READBACK", "MEDIA_READBACK_INVALID", "Identitas WordPress Media tidak sesuai dengan source image.", sourceImageIndex, counts);
      }
      images.push({ id:confirmedMedia.id, src:confirmedMedia.targetMediaUrl??confirmedMedia.sourceUrl, name:confirmedMedia.title, alt:confirmedMedia.alt });
      verifiedIdentities.push({sourceIdentity:filenameStem(sourceUrls[sourceImageIndex]!),normalizedFilename:inspected.filename.toLowerCase(),targetMediaId:confirmedMedia.id,order:sourceImageIndex});
    } catch (error) {
      if (error instanceof LegacyMediaRepairError) throw error;
      if (error instanceof LegacyImageSourceError) throw new LegacyMediaRepairError(error.failureStage, error.errorCode, error.safeMessage, sourceImageIndex, counts, error);
      throw new LegacyMediaRepairError("SOURCE_DOWNLOAD", "LEGACY_MEDIA_UNEXPECTED", "Legacy image tidak dapat diproses.", sourceImageIndex, counts, error);
    }
  }
  emitStage(row, "PRODUCT_ATTACH", undefined, counts);
  try { await attach(row.productId, images); }
  catch (cause) { throw new LegacyMediaRepairError("PRODUCT_ATTACH", "PRODUCT_ATTACH_FAILED", "Media belum dapat dipasang ke produk WooCommerce.", undefined, counts, cause); }
  counts.attachedImages = images.length;
  emitStage(row, "PRODUCT_READBACK", undefined, counts);
  let verified;
  try { verified = await readProduct(row.productId); }
  catch (cause) { throw new LegacyMediaRepairError("PRODUCT_READBACK", "PRODUCT_READBACK_FAILED", "Produk WooCommerce belum dapat dibaca kembali.", undefined, counts, cause); }
  emitStage(row, "FINAL_VERIFY", undefined, counts);
  counts.verifiedImages = verified.images?.length ?? 0;
  if (!sameImageIds(verified.images, images)) throw new LegacyMediaRepairError("FINAL_VERIFY", "MEDIA_ASSOCIATION_ORDER_MISMATCH", "ID atau urutan media produk tidak sesuai dengan rencana repair.", undefined, counts);
  const legacyMediaVerification:LegacyMediaVerification={status:"VERIFIED",sourceId:row.sourceId,sku:row.sku,expectedImages:verifiedIdentities,verifiedWooImageIds:images.map((image)=>image.id),orderedVerified:true,verifiedAt:new Date().toISOString()};
  return { ...baseResult(row, "REPAIRED", `${images.length} media attached in source order.`), ...counts, legacyMediaVerification };
}

export async function updateAndVerifyVariation(productId:number,variationId:number,payload:WooCommerceProductVariationWritePayload,rawReader=getVariationWithRawSku) {
  const before=await rawReader(productId,variationId); const intended={...payload,sku:typeof payload.sku==="string"?payload.sku:""};
  if(variationMatches(before,intended,before))return before;
  try{await woocommerceClient.updateProductVariation(productId,variationId,intended);}catch(error){if(!isTransientWooCommerceError(error))throw error;const reconciled=await rawReader(productId,variationId);if(variationMatches(reconciled,intended,before))return reconciled;await woocommerceClient.updateProductVariation(productId,variationId,intended);}
  const actual=await rawReader(productId,variationId);if(!variationMatches(actual,intended,before))throw new Error(`VARIATION_REPAIR_VERIFICATION_FAILED:${variationId}`);return actual;
}
export async function repairAndVerifyVariations(productId:number,repairs:Array<Record<string,unknown>>,rawReader=getVariationWithRawSku){let verified=0;try{for(const repair of repairs){const variationId=Number(repair.variationId);const targetSku=typeof repair.targetSku==="string"?repair.targetSku:"";const targetAttributes=repair.targetAttributes as Array<{name?:string;option:string}>;await updateAndVerifyVariation(productId,variationId,{sku:targetSku,attributes:targetAttributes},rawReader);verified+=1;}return{verified,total:repairs.length};}catch(error){throw new PartialVariationRepairError(verified,repairs.length,error);}}
async function updateProductWithReconciliation(productId:number,payload:Parameters<typeof woocommerceClient.updateProduct>[1],isApplied:(product:Awaited<ReturnType<typeof woocommerceClient.getProductById>>)=>boolean){try{await woocommerceClient.updateProduct(productId,payload);}catch(error){if(!isTransientWooCommerceError(error))throw error;const current=await woocommerceClient.getProductById(productId);if(isApplied(current))return current;await woocommerceClient.updateProduct(productId,payload);}const verified=await woocommerceClient.getProductById(productId);if(!isApplied(verified))throw new Error(`PRODUCT_REPAIR_VERIFICATION_FAILED:${productId}`);return verified;}
export function variationMatches(actual:WooCommerceProductVariation,intended:WooCommerceProductVariationWritePayload,before:WooCommerceProductVariation){return normalizeSku(actual.rawSku??actual.sku)===normalizeSku(intended.sku)&&sameAttributes(actual.attributes??[],intended.attributes??[])&&String(actual.regular_price??actual.price??"")===String(before.regular_price??before.price??"")&&String(actual.sale_price??"")===String(before.sale_price??"");}
async function getVariationWithRawSku(productId:number,variationId:number){const [display,rawItems]=await Promise.all([woocommerceClient.getProductVariation(productId,variationId),getRawVariationSkus(productId,variationId)]);const raw=rawItems.find(item=>item.variationId===variationId);if(!raw)throw new Error(`RAW_VARIATION_SKU_UNAVAILABLE:${variationId}`);return{...display,sku:raw.rawSku,displaySku:raw.displaySku,rawSku:raw.rawSku,inheritedFromParent:raw.inheritedFromParent};}
function normalizeSku(value:unknown){return typeof value==="string"?value.trim():"";}
function sameAttributes(current:Array<{id?:number;name?:string;option:string}>,target:Array<{id?:number;name?:string;option:string}>){const key=(items:Array<{id?:number;name?:string;option:string}>)=>items.map(item=>`${item.name?.trim().toUpperCase()??String(item.id??"")}=${item.option.trim().toUpperCase()}`).sort().join("|");return key(current)===key(target);}
class PartialVariationRepairError extends Error{constructor(public readonly verified:number,public readonly total:number,public override readonly cause:unknown){super("Variation repair was not fully verified.");this.name="PartialVariationRepairError";}}
class LegacyMediaRepairError extends Error{constructor(public readonly failureStage:LegacyMediaRepairStage,public readonly errorCode:string,public readonly safeMessage:string,public readonly sourceImageIndex:number|undefined,public readonly counts:LegacyMediaCounts,public override readonly cause?:unknown){super(safeMessage,{cause});this.name="LegacyMediaRepairError";}}
function baseResult(row:IntegrityRepairRow,status:RepairStatus,message:string):IntegrityRepairExecutionResult{return{id:row.id,sku:row.sku,wooProductId:row.productId,status,message};}
function filenameStem(value:string){return mediaBasename(value).replace(/\.[^.]+$/,"").toLowerCase();}
export function verifyWordPressMediaReadback(input:{expectedMediaId:number;expectedFilename:string;expectedMimeType:string;media:{id:number;sourceUrl:string;targetMediaUrl?:string;filename?:string;mimeType?:string;extension?:string}}){
  const expectedFilename=mediaBasename(input.expectedFilename);
  const actualFilename=mediaBasename(input.media.filename??input.media.targetMediaUrl??input.media.sourceUrl);
  const expectedExtension=extensionOf(expectedFilename);
  const actualExtension=(input.media.extension??extensionOf(actualFilename)).toLowerCase();
  return input.media.id===input.expectedMediaId
    && Boolean(expectedFilename)
    && actualFilename.toLowerCase()===expectedFilename.toLowerCase()
    && input.media.mimeType?.toLowerCase()===input.expectedMimeType.toLowerCase()
    && actualExtension===expectedExtension;
}
function mediaBasename(value:string){if(!value)return"";try{return decodeURIComponent(new URL(value,"http://wordpress.local").pathname.split("/").at(-1)??"");}catch{return value.replace(/\\/g,"/").split("/").at(-1)??"";}}
function extensionOf(value:string){return value.includes(".")?value.split(".").at(-1)!.toLowerCase():"";}
function sameImageIds(current:Array<{id?:number}>|undefined,expected:Array<{id:number}>){return (current??[]).map((image)=>Number(image.id)).join(",")===expected.map((image)=>image.id).join(",");}
function emitStage(row:IntegrityRepairRow,stage:LegacyMediaRepairStage,sourceImageIndex:number|undefined,counts:LegacyMediaCounts){console.info("LEGACY_MEDIA_REPAIR_STAGE",{sku:row.sku,wooProductId:row.productId,stage,sourceImageIndex,...counts});}
function logLegacyFailure(row:IntegrityRepairRow,error:LegacyMediaRepairError){console.error("LEGACY_MEDIA_REPAIR_FAILED",{sku:row.sku,wooProductId:row.productId,failureStage:error.failureStage,errorCode:error.errorCode,errorName:error.cause instanceof Error?error.cause.name:error.name,safeMessage:error.safeMessage,sourceImageIndex:error.sourceImageIndex});}
function safeCause(error:unknown){return error instanceof Error?error.message:"Repair failed.";}
async function persistLegacyMediaVerification(batchId:string,productId:number,verification:LegacyMediaVerification){const batch=await productImportRepository.getBatch(batchId);if(!batch)throw new Error("Batch import tidak ditemukan saat menyimpan verifikasi media.");const result=asRecord(batch.result_json);const current=asRecord(result.legacyMediaVerifications);await productImportRepository.mergeBatchResult(batchId,{legacyMediaVerifications:{...current,[String(productId)]:verification}});}
function asRecord(value:unknown):Record<string,unknown>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function logResult(input:{batchId:string;actorId:string},productId:number,repairType:string,result:RepairStatus){logAdminEvent({actorId:input.actorId,action:result==="REPAIRED"||result==="ALREADY_HEALTHY"?"product_integrity_repaired":"product_integrity_repair_failed",entityType:"woocommerce_product",entityId:String(productId),metadata:{batchId:input.batchId,repairType,result}});}
