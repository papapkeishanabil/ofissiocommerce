import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sanitizeFilename } from "@/lib/security/upload-security";
import { getProductImportStagingBucket, storageService } from "@/features/storage/storage.service";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { deleteProductImageFromWordPress, uploadProductImageToWordPress } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { downloadTrustedLegacyImage } from "./product-import-legacy-image.service";
import { mapImportProductToWooDraft, mapImportVariationToWoo } from "./product-import.mapper";
import { productImportRepository } from "./product-import.repository";
import { createProductImportPreview } from "./product-import.service";
import { forEachProductZipImageFile, verifyProductPhotoZipFile } from "./product-import-zip.service";
import { parsePhotoManifest } from "./photo-manifest.parser";
import { getProductImportStagingProvider } from "./staging/product-import-staging.provider";
import type { ProductImportPlan, WooCommerceImportProduct } from "./product-import.types";

export async function executeProductImport(input: { batchId: string; wooCsv: string; manifestCsv: string; zipFilePath: string; zipHash: string }) {
  const stagingBucket=getProductImportStagingBucket();
  const batch = await productImportRepository.getBatch(input.batchId); if (!batch || !["DRY_RUN_PASSED","COMPLETED_WITH_WARNINGS"].includes(String(batch.status))) throw new Error("Batch tidak siap diimport atau sudah selesai diproses.");
  if(batch.csv_sha256!==sha(input.wooCsv)||batch.manifest_sha256!==sha(input.manifestCsv)||batch.zip_sha256!==input.zipHash)throw new Error("File import berbeda dari file yang lolos dry run.");
  const plan = batch.plan_json as ProductImportPlan; if (!plan || plan.batchId !== input.batchId) throw new Error("Import plan tidak valid.");
  const retryOnly=String(batch.status)==="COMPLETED_WITH_WARNINGS";
  const trackedItems=await productImportRepository.listItems(input.batchId);const trackedBySource=new Map(trackedItems.map(item=>[String(item.source_id),item]));
  const preview = createProductImportPreview(input.wooCsv, input.manifestCsv); const zip = await verifyProductPhotoZipFile({ filePath: input.zipFilePath, manifest: parsePhotoManifest(input.manifestCsv) });
  if (zip.summary.missing || zip.summary.sizeMismatch) throw new Error("ZIP berubah sejak dry run.");
  await productImportRepository.updateBatch(input.batchId, "IMPORTING", { started_at: new Date().toISOString() });
  const categoryByName=new Map((await woocommerceClient.getCategories()).map((category)=>[category.name.trim().toLowerCase(),category.id]));
  let created = 0, failed = 0, variationsCreated = 0, imagesUploaded = 0; const errors: Array<{ sourceId: string; message: string }> = [];
  for (const planned of plan.products.filter((item) => item.action === "CREATE_DRAFT")) {
    const claimed = retryOnly?await productImportRepository.claimFailedItem(input.batchId,planned.sourceId):await productImportRepository.claimItem(input.batchId, planned.sourceId); if (!claimed) continue;
    const item = preview.products.find((candidate) => candidate.product?.sourceId === planned.sourceId); if (!item?.product) { failed += 1; await failItem(input.batchId, planned.sourceId, "Source product tidak ditemukan saat revalidation."); continue; }
    const stagedKeys: string[] = []; const uploadedMediaIds: number[] = []; let createdProductId: number | null = null,itemVariationsCreated=0,itemImagesUploaded=0;
    try {
      const trackedItem=trackedBySource.get(planned.sourceId);const trackedProductId=trackedItem?.target_product_id;if(trackedProductId)throw new Error("Partial product terlacak dan harus melalui Recover & Retry yang terkontrol.");
      const existing = planned.targetSku ? await woocommerceClient.getProducts({ sku: planned.targetSku, status: "any", per_page: 1 }) : []; if (existing.length) throw new Error("SKU dibuat oleh proses lain setelah dry run; produk dilewati.");
      const categoryIds=item.product.categories.map((name)=>categoryByName.get(name.trim().toLowerCase())).filter((id):id is number=>Boolean(id));const product = await woocommerceClient.createProduct(mapImportProductToWooDraft({ product: item.product, targetSku: planned.targetSku, batchId:input.batchId, categoryIds }));
      createdProductId = product.id;
      await productImportRepository.updateItem(input.batchId, planned.sourceId, { target_product_id: String(product.id),metadata:{...object(trackedItem?.metadata),ownershipState:"PARENT_CREATED",ownershipBatchId:input.batchId,ownershipSourceId:planned.sourceId,parentCreatedAt:new Date().toISOString()} });
      if (item.photoSource === "NEW_LOCAL_PHOTOS") {
        const wanted = new Set(item.images.map((image) => image.relativePath)); const mediaByPath = new Map<string, number>();
        await forEachProductZipImageFile({ filePath: input.zipFilePath, requestedPaths: wanted, visit: async (image) => { const key = `product-imports/${input.batchId}/${randomUUID()}-${sanitizeFilename(image.zipPath.split("/").at(-1) || "image")}`; stagedKeys.push(key); await storageService.uploadManagedStorageObject({ bucket: stagingBucket, key, mimeType: image.mimeType, data: image.bytes, metadata: { batchId: input.batchId, sourceId: planned.sourceId }, upsert: false }); const media = await uploadProductImageToWordPress({ file: new File([image.bytes as BlobPart], image.zipPath.split("/").at(-1) || "image", { type: image.mimeType }), filename: image.zipPath.split("/").at(-1) || "image", mimeType: image.mimeType, title: `${item.product!.name} product image`, alt: item.product!.name }); uploadedMediaIds.push(media.id); mediaByPath.set(image.manifestPath.toLowerCase(), media.id); await storageService.deleteManagedStorageObject({ bucket: stagingBucket, key }); stagedKeys.splice(stagedKeys.indexOf(key), 1); } });
        const ordered = item.images.map((image) => mediaByPath.get(image.relativePath.toLowerCase())).filter((id): id is number => Boolean(id)); if (ordered.length) await woocommerceClient.updateProduct(product.id, { images: ordered.map((id) => ({ id })) }); imagesUploaded += ordered.length;itemImagesUploaded+=ordered.length;
      } else if (item.photoSource === "LEGACY_WOOCOMMERCE") {
        const ids: number[] = []; for (const url of item.product.imageUrls) { try { const image = await downloadTrustedLegacyImage(url); const media = await uploadProductImageToWordPress({ file: new File([image.bytes as BlobPart], image.filename, { type: image.mimeType }), filename: image.filename, mimeType: image.mimeType, title: `${item.product.name} product image`, alt: item.product.name }); ids.push(media.id); uploadedMediaIds.push(media.id); } catch { /* product remains draft; item warning is retained */ } } if (ids.length) await woocommerceClient.updateProduct(product.id, { images: ids.map((id) => ({ id })) }); imagesUploaded += ids.length;itemImagesUploaded+=ids.length;
      }
      for (const variation of item.variations) { await woocommerceClient.createProductVariation(product.id, mapImportVariationToWoo({ variation })); variationsCreated += 1;itemVariationsCreated+=1; }
      const verified=await woocommerceClient.getProductById(product.id);const verifiedVariations=await woocommerceClient.getProductVariations(product.id,{per_page:100});
      if(verified.status!=="draft"||verified.sku!==(planned.targetSku??"")||verifiedVariations.length!==planned.variationCount||(verified.images?.length??0)!==planned.imageCount)throw new Error(`PARTIAL_IMPORT: expected ${planned.variationCount} variations/${planned.imageCount} images, actual ${verifiedVariations.length}/${verified.images?.length??0}.`);
      await productImportRepository.updateItem(input.batchId, planned.sourceId, { status: "IMPORTED", warning_count: planned.warnings.length,metadata:{...(trackedBySource.get(planned.sourceId)?.metadata as Record<string,unknown>??{}),importedVariationCount:itemVariationsCreated,importedImageCount:itemImagesUploaded,lastImportedAt:new Date().toISOString()} }); created += 1;
    } catch (error) {
      failed += 1; const message = error instanceof Error ? error.message : "Import item gagal."; errors.push({ sourceId: planned.sourceId, message }); await failItem(input.batchId, planned.sourceId, message);
      for (const key of stagedKeys) await storageService.deleteManagedStorageObject({ bucket: stagingBucket, key }).catch(() => undefined);
      let productRollbackFailed=false;if(createdProductId){await productImportRepository.updateItem(input.batchId,planned.sourceId,{target_product_id:String(createdProductId),metadata:{...object(trackedBySource.get(planned.sourceId)?.metadata),rollbackState:"ROLLBACK_PENDING",rollbackProductId:createdProductId}});const deleted=await woocommerceClient.deleteProductAndConfirm(createdProductId).catch(()=>false);productRollbackFailed=!deleted;}
      for (const id of uploadedMediaIds) await deleteProductImageFromWordPress(id).catch(() => false);
      await productImportRepository.updateItem(input.batchId, planned.sourceId, { target_product_id: productRollbackFailed&&createdProductId?String(createdProductId):null,metadata:{...object(trackedBySource.get(planned.sourceId)?.metadata),rollbackState:productRollbackFailed?"ROLLBACK_FAILED":"ROLLBACK_COMPLETE",rollbackProductId:createdProductId,rollbackCompletedAt:productRollbackFailed?null:new Date().toISOString()} });
    }
  }
  const finalItems=await productImportRepository.listItems(input.batchId);const allFailed=finalItems.filter(item=>item.status==="FAILED");const allImported=finalItems.filter(item=>item.status==="IMPORTED");const status = allFailed.length ? "COMPLETED_WITH_WARNINGS" : "COMPLETED";const previousResult=batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?batch.result_json as Record<string,unknown>:{};const previousAttempts=Array.isArray(previousResult.attempts)?previousResult.attempts:previousResult.attempt?[previousResult.attempt]:[];const attempt={number:previousAttempts.length+1,at:new Date().toISOString(),created,failed,variationsCreated,imagesUploaded,sourceIds:plan.products.filter(item=>trackedBySource.get(item.sourceId)?.status==="FAILED").map(item=>item.sourceId)}; const result = { ...previousResult,created:allImported.length, failed:allFailed.length, skipped:finalItems.filter(item=>item.status==="SKIPPED").length, variationsCreated:allImported.reduce((sum,item)=>sum+Number((item.metadata as Record<string,unknown>)?.importedVariationCount??(item.metadata as Record<string,unknown>)?.variationCount??0),0), imagesUploaded:allImported.reduce((sum,item)=>sum+Number((item.metadata as Record<string,unknown>)?.importedImageCount??(item.metadata as Record<string,unknown>)?.imageCount??0),0), attempt,attempts:[...previousAttempts,attempt], errors };
  await productImportRepository.updateBatch(input.batchId, status, { completed_at: new Date().toISOString(), result_json: result, error_count: failed });
  if (status === "COMPLETED") {
    await getProductImportStagingProvider().deleteBatch(input.batchId).catch(() => undefined);
    await productImportRepository.updateBatch(input.batchId, status, { staging_objects: [], cleanup_required: false });
  }
  return { batchId: input.batchId, status, ...result };
}
async function failItem(batchId: string, sourceId: string, message: string) { await productImportRepository.updateItem(batchId, sourceId, { status: "FAILED", error_message: message.slice(0, 500) }); }
function sha(value:string|Uint8Array){return createHash("sha256").update(value).digest("hex");}
function object(value:unknown):Record<string,unknown>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
