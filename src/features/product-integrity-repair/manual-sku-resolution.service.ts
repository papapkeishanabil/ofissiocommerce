import "server-only";

import { productImportRepository } from "@/features/product-import/product-import.repository";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { getRawVariationSkus } from "@/features/products/woocommerce/woocommerce-raw-variation.service";
import type { WooCommerceProduct, WooCommerceProductVariation } from "@/features/products/woocommerce/woocommerce.types";
import { logAdminEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

export type ManualSkuResolutionResult = {
  status: "RESOLVED" | "ALREADY_RESOLVED";
  fromSku: string;
  targetSku: string;
  productId: number;
  sourceParentId: string;
  message: string;
};

type SkuOwner = { entityId: number; entityType: "product" | "variation"; parentProductId?: number };
type Dependencies = {
  getBatch: typeof productImportRepository.getBatch;
  listItems: typeof productImportRepository.listItems;
  getProduct: typeof woocommerceClient.getProductById;
  getProducts: typeof woocommerceClient.getProducts;
  getVariations: typeof woocommerceClient.getProductVariations;
  getRawSkus: typeof getRawVariationSkus;
  updateProduct: typeof woocommerceClient.updateProduct;
  findSkuOwner?: (targetSku:string,currentProductId:number)=>Promise<SkuOwner|null>;
  audit: typeof logAdminEvent;
};

const defaults:Dependencies={
  getBatch:productImportRepository.getBatch.bind(productImportRepository),
  listItems:productImportRepository.listItems.bind(productImportRepository),
  getProduct:woocommerceClient.getProductById.bind(woocommerceClient),
  getProducts:woocommerceClient.getProducts.bind(woocommerceClient),
  getVariations:woocommerceClient.getProductVariations.bind(woocommerceClient),
  getRawSkus:getRawVariationSkus,
  updateProduct:woocommerceClient.updateProduct.bind(woocommerceClient),
  audit:logAdminEvent,
};

export async function resolveManualSku(input:{
  batchId:string;
  productId:number;
  sourceParentId:string;
  proposedSku:string;
  expectedCurrentSku:string;
  acknowledged:boolean;
  typedConfirmation:string;
  actorId:string;
},overrides:Partial<Dependencies>={}):Promise<ManualSkuResolutionResult>{
  if(!input.acknowledged||normalize(input.typedConfirmation)!==normalize(input.proposedSku)){
    throw createApiError("VALIDATION_ERROR","Konfirmasi manual dan pengetikan SKU target wajib diselesaikan.",400,{errorCode:"MANUAL_CONFIRMATION_REQUIRED"});
  }
  const targetSku=normalize(input.proposedSku);
  if(!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(targetSku))throw createApiError("VALIDATION_ERROR","Format SKU target tidak valid.",400);
  const dependencies={...defaults,...overrides};
  const [batch,items]=await Promise.all([dependencies.getBatch(input.batchId),dependencies.listItems(input.batchId)]);
  if(!batch)throw createApiError("NOT_FOUND","Batch import tidak ditemukan.",404);
  const item=items.find((candidate)=>String(candidate.target_product_id)===String(input.productId)&&String(candidate.source_id)===input.sourceParentId&&candidate.status==="IMPORTED");
  if(!item)throw stale("Target tidak lagi dimiliki oleh item import yang dimaksud.",input);

  const before=await dependencies.getProduct(input.productId);
  assertOwnedProduct(before,input.batchId,input.sourceParentId,input);
  const currentSku=normalize(before.sku);
  if(currentSku===targetSku){
    return {status:"ALREADY_RESOLVED",fromSku:targetSku,targetSku,productId:before.id,sourceParentId:input.sourceParentId,message:`SKU sudah ${targetSku}.`};
  }
  if(currentSku!==normalize(input.expectedCurrentSku)||currentSku!=="UNKNOWN")throw stale("SKU produk berubah sejak Dry Run.",input);

  const proposedFromName=extractSku(before.name);
  if(proposedFromName!==targetSku)throw stale("Nama produk tidak lagi mendukung SKU yang diajukan.",input);
  const sourceSku=normalize(String(item.source_sku??""));
  if(sourceSku===targetSku)throw createApiError("VALIDATION_ERROR","Kasus ini memiliki exact parent SKU dan tidak boleh memakai resolusi manual.",409);

  const beforeVariations=before.type==="variable"?await dependencies.getVariations(before.id,{per_page:100}):[];
  if(!hasConsistentChildPrefix(beforeVariations,targetSku))throw stale("Pola SKU variasi tidak lagi konsisten dengan SKU yang diajukan.",input);

  const findOwner=dependencies.findSkuOwner??((sku,productId)=>findExactSkuOwner(sku,productId,dependencies));
  const conflict=await findOwner(targetSku,before.id);
  if(conflict)throw createApiError("VALIDATION_ERROR",`SKU ${targetSku} sudah digunakan oleh entitas WooCommerce lain.`,409,{errorCode:"SKU_CONFLICT",targetSku,conflictingEntityId:conflict.entityId,entityType:conflict.entityType,currentProductSku:before.sku});

  const protectedBefore=snapshot(before,beforeVariations);
  await dependencies.updateProduct(before.id,{sku:targetSku});
  const after=await dependencies.getProduct(before.id);
  const afterVariations=after.type==="variable"?await dependencies.getVariations(after.id,{per_page:100}):[];
  if(normalize(after.sku)!==targetSku)throw createApiError("PROVIDER_UNAVAILABLE","SKU update belum terverifikasi dari WooCommerce.",502,{errorCode:"MANUAL_SKU_VERIFICATION_FAILED",productId:before.id,expectedSku:targetSku,actualSku:after.sku});
  if(JSON.stringify(snapshot(after,afterVariations))!==JSON.stringify(protectedBefore))throw createApiError("PROVIDER_UNAVAILABLE","Field produk selain SKU berubah saat verifikasi.",502,{errorCode:"MANUAL_SKU_PROTECTED_FIELDS_CHANGED",productId:before.id});

  dependencies.audit({actorId:input.actorId,action:"product_integrity_manual_sku_resolved",entityType:"woocommerce_product",entityId:String(before.id),metadata:{batchId:input.batchId,repairType:"SKU",resolutionType:"MANUAL_ADMIN_APPROVAL",from:"UNKNOWN",to:targetSku,sourceParentId:input.sourceParentId,evidence:["PRODUCT_NAME","CHILD_VARIATION_SKU_PREFIX"],csvEvidenceLevel:"NO_EXACT_PARENT_SKU",resolvedAt:new Date().toISOString()}});
  return {status:"RESOLVED",fromSku:"UNKNOWN",targetSku,productId:before.id,sourceParentId:input.sourceParentId,message:`SKU resolution verified: UNKNOWN → ${targetSku}`};
}

async function findExactSkuOwner(targetSku:string,currentProductId:number,deps:Dependencies):Promise<SkuOwner|null>{
  const exactProducts=await deps.getProducts({sku:targetSku,status:"any",per_page:100});
  const productOwner=exactProducts.find((product)=>normalize(product.sku)===targetSku&&product.id!==currentProductId);
  if(productOwner)return{entityId:productOwner.id,entityType:"product"};
  for(let page=1;page<=20;page+=1){
    const products=await deps.getProducts({status:"any",per_page:100,page});
    for(const product of products){
      if(!product.variations?.length)continue;
      const raw=await deps.getRawSkus(product.id);
      const variation=raw.find((candidate)=>normalize(candidate.rawSku)===targetSku);
      if(variation)return{entityId:variation.variationId,entityType:"variation",parentProductId:product.id};
    }
    if(products.length<100)break;
  }
  return null;
}

function assertOwnedProduct(product:WooCommerceProduct,batchId:string,sourceId:string,input:{batchId:string;productId:number;sourceParentId:string}){
  if(product.id!==input.productId)throw stale("Identitas produk berubah.",input);
  const metadata=new Map((product.meta_data??[]).map((item)=>[item.key,String(item.value??"")]));
  const exactOwner=metadata.get("_ofissio_import_batch_id")===batchId&&metadata.get("_ofissio_import_source_id")===sourceId;
  const legacyOwner=metadata.get("_ofissio_import_source")==="woocommerce_csv"&&metadata.get("_ofissio_source_id")===sourceId;
  if(!exactOwner&&!legacyOwner)throw stale("Ownership produk tidak cocok dengan source import.",input);
}
function hasConsistentChildPrefix(variations:WooCommerceProductVariation[],targetSku:string){return variations.length>0&&variations.every((variation)=>normalize(variation.rawSku??variation.sku).startsWith(`${targetSku}-`));}
function snapshot(product:WooCommerceProduct,variations:WooCommerceProductVariation[]){return{id:product.id,status:product.status,variationIds:[...(product.variations??[])],price:product.price,regularPrice:product.regular_price,salePrice:product.sale_price,imageIds:(product.images??[]).map((image)=>image.id),variationState:variations.map((variation)=>({id:variation.id,sku:variation.rawSku??variation.sku,price:variation.price,regularPrice:variation.regular_price,salePrice:variation.sale_price,imageId:variation.image?.id??null}))};}
function normalize(value:string){return value.trim().toUpperCase();}
function extractSku(name:string){return /\b([A-Z]{2,5}-\d{2,4})\b/i.exec(name)?.[1]?.toUpperCase()??null;}
function stale(message:string,input:{batchId:string;productId:number;sourceParentId:string}){return createApiError("VALIDATION_ERROR",message,409,{errorCode:"STALE_MANUAL_RESOLUTION",batchId:input.batchId,productId:input.productId,sourceParentId:input.sourceParentId});}
