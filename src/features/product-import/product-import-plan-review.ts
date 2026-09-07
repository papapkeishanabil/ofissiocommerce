import type { ProductImportImageAction, ProductImportPlan, ProductImportPlanItem, ProductImportPreview } from "./product-import.types";

export function enrichProductImportPlan(plan:ProductImportPlan,preview:ProductImportPreview):ProductImportPlan{
  const previewBySource=new Map(preview.products.map(item=>[item.product?.sourceId??item.key,item]));
  const products=plan.products.map(planned=>{
    const item=previewBySource.get(planned.sourceId);
    if(!item)return planned;
    const imageAction:ProductImportImageAction=planned.action==="SKIP_EXISTING"?"SKIP_EXISTING_PRODUCT":planned.action==="SKIP_NEEDS_PRODUCT_DATA"?"SKIP_NEEDS_PRODUCT_DATA":planned.action==="SKIP_UNSUPPORTED"?"SKIP_UNSUPPORTED":planned.action==="BLOCKED"?"NONE":planned.photoSource==="NEW_LOCAL_PHOTOS"?"UPLOAD_NEW_TO_WORDPRESS":planned.photoSource==="LEGACY_WOOCOMMERCE"?"COPY_LEGACY_TO_WORDPRESS":"NONE";
    return {...planned,productType:item.product?.productType??null,imageAction,variationWithoutSkuCount:item.variations.filter(variation=>!variation.sku).length,coverFilename:item.suggestedCover,variantImages:item.variantPhotos.map(variant=>({hint:variant.hint,matchedValue:variant.matchedValue,count:variant.count}))};
  });
  return {...plan,products,summary:{...plan.summary,...reviewSummary(products,preview)}};
}

function reviewSummary(products:ProductImportPlanItem[],preview:ProductImportPreview){
  const sum=(items:ProductImportPlanItem[],field:"variationCount"|"imageCount"|"variationWithoutSkuCount")=>items.reduce((total,item)=>total+Number(item[field]??0),0);
  const created=products.filter(item=>item.action==="CREATE_DRAFT"),blocked=products.filter(item=>item.action==="BLOCKED"),skipped=products.filter(item=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED");
  const localProducts=products.filter(item=>item.photoSource==="NEW_LOCAL_PHOTOS"&&item.action!=="SKIP_NEEDS_PRODUCT_DATA"),localReady=created.filter(item=>item.photoSource==="NEW_LOCAL_PHOTOS"),localBlocked=blocked.filter(item=>item.photoSource==="NEW_LOCAL_PHOTOS");
  const legacy=products.filter(item=>item.photoSource==="LEGACY_WOOCOMMERCE"),legacyCreated=created.filter(item=>item.photoSource==="LEGACY_WOOCOMMERCE"),legacyBlocked=blocked.filter(item=>item.photoSource==="LEGACY_WOOCOMMERCE");
  const withoutSku=sum(products,"variationWithoutSkuCount");
  return {sourceVariations:sum(products,"variationCount"),variationsSkipped:sum(skipped,"variationCount"),variationsBlocked:sum(blocked,"variationCount"),variationsWithoutSourceSku:withoutSku,variationsWithoutSkuPreserved:withoutSku,variationsWithoutSkuBlocked:0,localSourceImages:sum(localProducts,"imageCount"),localImagesSkipped:sum(localProducts.filter(item=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED"),"imageCount"),localImagesBlocked:sum(localBlocked,"imageCount"),localPhotoProducts:localReady.length,photoOnlyImagesSkipped:sum(products.filter(item=>item.action==="SKIP_NEEDS_PRODUCT_DATA"),"imageCount"),legacyPhotoProducts:legacy.length,legacyCreateProducts:legacyCreated.length,legacySkippedProducts:legacy.filter(item=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED").length,legacySourceImages:sum(legacy,"imageCount"),legacyImagesReused:0,legacyImagesCopyRequired:sum(legacyCreated,"imageCount"),legacyImagesSkipped:sum(legacy.filter(item=>item.action!=="CREATE_DRAFT"&&item.action!=="BLOCKED"),"imageCount"),legacyImagesBlocked:sum(legacyBlocked,"imageCount"),imagesBlocked:sum(blocked,"imageCount"),unassignedSkipped:preview.summary.unassignedImages};
}
