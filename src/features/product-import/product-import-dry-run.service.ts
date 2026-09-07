import "server-only";

import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { checkWordPressMediaAccess } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { parsePhotoManifest } from "./photo-manifest.parser";
import { createProductImportPreview } from "./product-import.service";
import { productImportRepository } from "./product-import.repository";
import { verifyProductPhotoZipFile } from "./product-import-zip.service";
import type { ProductImportDecisions, ProductImportDryRunResult, ProductImportImageAction, ProductImportPlan, ProductImportPlanItem } from "./product-import.types";

export async function runProductImportDryRun(input: { batchId: string; wooCsv: string; manifestCsv: string; zipFilePath: string; zipHash: string; decisions: ProductImportDecisions; actorId: string }): Promise<ProductImportDryRunResult> {
  const batchId = input.batchId;
  const preview = createProductImportPreview(input.wooCsv, input.manifestCsv);
  const zip = await verifyProductPhotoZipFile({ filePath: input.zipFilePath, manifest: parsePhotoManifest(input.manifestCsv) });
  const zipBlocking = zip.summary.missing + zip.summary.sizeMismatch;
  const existingSkus = await findExistingSkus(preview.products.map((item) => item.suggestedSku ?? item.normalizedSku).filter(Boolean));
  await verifyImportInfrastructure();
  const products: ProductImportPlanItem[] = preview.products.map((item) => {
    const targetSku = item.suggestedSku ?? (item.normalizedSku || null);
    const warnings = item.issues.filter((issue) => issue.severity === "WARNING").map((issue) => issue.code);
    let action: ProductImportPlanItem["action"] = "CREATE_DRAFT"; let reason = "Produk baru akan dibuat sebagai draft.";
    if (!item.product) { action = "SKIP_NEEDS_PRODUCT_DATA"; reason = "Folder foto tidak memiliki data produk WooCommerce."; }
    else if (item.product.productType === "external" || !["simple", "variable"].includes(item.product.productType)) { action = "SKIP_UNSUPPORTED"; reason = `Tipe ${item.product.productType} belum didukung.`; }
    else if (item.issues.some((issue) => issue.severity === "ERROR") || zipBlocking > 0) { action = "BLOCKED"; reason = zipBlocking ? "ZIP tidak sama dengan manifest." : "Ada validation error."; }
    else if (targetSku && existingSkus.has(targetSku.toUpperCase())) { action = "SKIP_EXISTING"; reason = "SKU sudah ada di WooCommerce target; create-only tidak menimpa produk."; }
    else if (item.suggestedSku && !input.decisions.skuNormalizations[item.key]) { action = "BLOCKED"; reason = "Normalisasi SKU memerlukan konfirmasi eksplisit."; }
    else if (item.variantPhotos.some((variant) => !variant.exact && !input.decisions.variantMappings[`${item.key}:${variant.hint}`])) { action = "BLOCKED"; reason = "Pemetaan foto variant fuzzy memerlukan konfirmasi eksplisit."; }
    const imageAction:ProductImportImageAction=action==="SKIP_EXISTING"?"SKIP_EXISTING_PRODUCT":action==="SKIP_NEEDS_PRODUCT_DATA"?"SKIP_NEEDS_PRODUCT_DATA":action==="SKIP_UNSUPPORTED"?"SKIP_UNSUPPORTED":action==="BLOCKED"?"NONE":item.photoSource==="NEW_LOCAL_PHOTOS"?"UPLOAD_NEW_TO_WORDPRESS":item.photoSource==="LEGACY_WOOCOMMERCE"?"COPY_LEGACY_TO_WORDPRESS":"NONE";
    const sourceId=item.product?.sourceId??item.key;
    return { sourceId, sourceSku: item.sourceSku, targetSku, name: item.product?.name ?? item.normalizedSku, action, reason, photoSource: item.photoSource, imageCount: item.images.length || item.product?.imageUrls.length || 0, variationCount: item.variations.length, warnings, productType:item.product?.productType??null,imageAction,variationWithoutSkuCount:item.variations.filter((variation)=>!variation.sku).length,coverFilename:item.suggestedCover,variantImages:item.variantPhotos.map((variant)=>({hint:variant.hint,matchedValue:variant.matchedValue,count:variant.count})),legacySourceImages:item.photoSource==="LEGACY_WOOCOMMERCE"?(item.product?.imageUrls??[]).map((sourceUrl)=>({sourceUrl,normalizedFilename:sourceMediaIdentity(sourceUrl),sourceId})):undefined };
  });
  const count = (action: ProductImportPlanItem["action"]) => products.filter((item) => item.action === action).length;
  const sum=(items:ProductImportPlanItem[],field:"variationCount"|"imageCount"|"variationWithoutSkuCount")=>items.reduce((total,item)=>total+Number(item[field]??0),0);
  const created=products.filter((item)=>item.action==="CREATE_DRAFT"),blocked=products.filter((item)=>item.action==="BLOCKED"),skipped=products.filter((item)=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED");
  const localProductItems=products.filter((item)=>item.photoSource==="NEW_LOCAL_PHOTOS"&&item.action!=="SKIP_NEEDS_PRODUCT_DATA"),localReady=created.filter((item)=>item.photoSource==="NEW_LOCAL_PHOTOS"),localBlocked=blocked.filter((item)=>item.photoSource==="NEW_LOCAL_PHOTOS");
  const legacy=products.filter((item)=>item.photoSource==="LEGACY_WOOCOMMERCE"),legacyCreated=created.filter((item)=>item.photoSource==="LEGACY_WOOCOMMERCE"),legacyBlocked=blocked.filter((item)=>item.photoSource==="LEGACY_WOOCOMMERCE");
  const photoOnlyImages=products.filter((item)=>item.action==="SKIP_NEEDS_PRODUCT_DATA").reduce((total,item)=>total+item.imageCount,0);
  const sourceVariations=sum(products,"variationCount"),variationsReady=sum(created,"variationCount"),variationsBlocked=sum(blocked,"variationCount"),withoutSku=sum(products,"variationWithoutSkuCount");
  const plan: ProductImportPlan = { batchId, products, summary: { productsAnalyzed: products.length, createDraft: count("CREATE_DRAFT"), skipExisting: count("SKIP_EXISTING"), skipNeedsProductData: count("SKIP_NEEDS_PRODUCT_DATA"), skipUnsupported: count("SKIP_UNSUPPORTED"), blocked: count("BLOCKED"), variationsReady, localImages: sum(localReady,"imageCount"), legacyImages: sum(legacyCreated,"imageCount"), unassignedSkipped: preview.summary.unassignedImages, warnings: preview.summary.warningEvents + zip.summary.unexpected, errors: preview.summary.errorEvents + zipBlocking,sourceVariations,variationsSkipped:sum(skipped,"variationCount"),variationsBlocked,variationsWithoutSourceSku:withoutSku,variationsWithoutSkuPreserved:withoutSku,variationsWithoutSkuBlocked:0,localSourceImages:sum(localProductItems,"imageCount"),localImagesSkipped:sum(localProductItems.filter((item)=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED"),"imageCount"),localImagesBlocked:sum(localBlocked,"imageCount"),localPhotoProducts:localReady.length,photoOnlyImagesSkipped:photoOnlyImages,legacyPhotoProducts:legacy.length,legacyCreateProducts:legacyCreated.length,legacySkippedProducts:legacy.filter((item)=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED").length,legacySourceImages:sum(legacy,"imageCount"),legacyImagesReused:0,legacyImagesCopyRequired:sum(legacyCreated,"imageCount"),legacyImagesSkipped:sum(legacy.filter((item)=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED"),"imageCount"),legacyImagesBlocked:sum(legacyBlocked,"imageCount"),imagesBlocked:sum(blocked,"imageCount") } };
  await productImportRepository.finalizeDryRun({ id: batchId, actorId: input.actorId, zipHash: input.zipHash, plan });
  return { batchId, status: plan.summary.blocked ? "FAILED" : "DRY_RUN_PASSED", zip, plan };
}

async function findExistingSkus(skus: string[]) { const queue=[...new Set(skus.map((value)=>value.trim()).filter(Boolean))];const found=new Set<string>();let cursor=0;await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(cursor<queue.length){const sku=queue[cursor++];if(!sku)continue;const products=await woocommerceClient.getProducts({sku,status:"any",per_page:1});if(products.length)found.add(sku.toUpperCase());}}));return found; }
async function verifyImportInfrastructure(){const media=await checkWordPressMediaAccess();if(!media.configured||!media.reachable)throw new Error("WordPress Media belum siap untuk permanent product-image storage.");}
function sourceMediaIdentity(value:string){try{return decodeURIComponent(new URL(value).pathname.split("/").at(-1)??"").replace(/\.[^.]+$/," ").trim().toLowerCase();}catch{return value;}}
