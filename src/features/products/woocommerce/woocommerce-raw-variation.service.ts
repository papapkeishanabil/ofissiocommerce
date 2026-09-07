import "server-only";
import { Buffer } from "node:buffer";
import { createApiError } from "@/lib/security/safe-error-response";
import { requestWooCommerceJson, allowSelfSignedTlsForWooUrl } from "./woocommerce-http";
import { getWordPressMediaRuntimeConfig } from "./wordpress-media-upload.service";
import type { WooCommerceProductVariation } from "./woocommerce.types";

export interface RawVariationSku { variationId:number;displaySku:string;rawSku:string;inheritedFromParent:boolean }

export async function getRawVariationSkus(productId:number,variationId?:number){
  const config=getWordPressMediaRuntimeConfig();
  if(!config.isConfigured)throw createApiError("PROVIDER_UNAVAILABLE","WordPress raw variation diagnostic belum dikonfigurasi.",503);
  const url=new URL(`${config.baseUrl}/wp-json/ofissio/v1/variation-raw-skus/${encodeURIComponent(String(productId))}`);
  if(variationId)url.searchParams.set("variation_id",String(variationId));
  const authorization=config.token?`Bearer ${config.token}`:`Basic ${Buffer.from(`${config.username}:${config.appPassword}`).toString("base64")}`;
  for(let attempt=1;attempt<=3;attempt+=1){
    const startedAt=Date.now();
    try{
      const response=await requestWooCommerceJson<{productId:number;items:RawVariationSku[]}>(url,{headers:{Authorization:authorization,Accept:"application/json"},allowSelfSignedTls:allowSelfSignedTlsForWooUrl(url)});
      if(response.ok&&Array.isArray(response.data?.items))return response.data.items;
      if(response.status===401||response.status===403)throw createApiError("FORBIDDEN","Raw variation SKU tidak diizinkan.",response.status,{operation:"GET variation raw SKU",statusCode:response.status});
      const transient=[429,502,503,504].includes(response.status);
      console.warn("WORDPRESS_RAW_VARIATION_PROVIDER_ERROR",{operation:"GET variation raw SKU",method:"GET",path:url.pathname,statusCode:response.status,errorCode:`HTTP_${response.status}`,errorName:"HttpError",elapsedMs:Date.now()-startedAt,attemptNumber:attempt});
      if(!transient||attempt===3)throw createApiError("PROVIDER_UNAVAILABLE","Raw variation SKU belum dapat dibaca.",response.status||503,{operation:"GET variation raw SKU",statusCode:response.status,transient,attempts:attempt});
    }catch(error){
      if(isNonRetryableRawSkuError(error))throw error;
      const diagnostic=rawSkuErrorDiagnostic(error);
      const transient=RAW_SKU_TRANSIENT_CODES.has(diagnostic.errorCode);
      console.warn("WORDPRESS_RAW_VARIATION_PROVIDER_ERROR",{operation:"GET variation raw SKU",method:"GET",path:url.pathname,statusCode:0,errorCode:diagnostic.errorCode,errorName:diagnostic.errorName,elapsedMs:Date.now()-startedAt,attemptNumber:attempt});
      if(!transient||attempt===3)throw createApiError("PROVIDER_UNAVAILABLE","Raw variation SKU belum dapat dibaca.",503,{operation:"GET variation raw SKU",statusCode:0,errorCode:diagnostic.errorCode,transient,attempts:attempt});
    }
    await new Promise(resolve=>setTimeout(resolve,attempt===1?500:1500));
  }
  throw createApiError("PROVIDER_UNAVAILABLE","Raw variation SKU belum dapat dibaca.",503);
}

export async function attachRawVariationSkus(productId:number,variations:WooCommerceProductVariation[]){
  const rawById=new Map((await getRawVariationSkus(productId)).map(item=>[item.variationId,item]));
  return variations.map(variation=>{const raw=rawById.get(variation.id);if(!raw)throw createApiError("PROVIDER_UNAVAILABLE",`Raw SKU variation ${variation.id} tidak tersedia.`,503);return{...variation,sku:raw.rawSku,displaySku:raw.displaySku,rawSku:raw.rawSku,inheritedFromParent:raw.inheritedFromParent};});
}

const RAW_SKU_TRANSIENT_CODES=new Set(["ECONNRESET","ECONNREFUSED","ETIMEDOUT","EPIPE","ECONNABORTED","INVALID_RESPONSE","UND_ERR_CONNECT_TIMEOUT","UND_ERR_HEADERS_TIMEOUT"]);
function rawSkuErrorDiagnostic(error:unknown){const value=error as {code?:unknown;name?:unknown;cause?:{code?:unknown}};return{errorCode:String(value?.code??value?.cause?.code??"UNKNOWN_PROVIDER_ERROR"),errorName:String(value?.name??"Error")};}
function isNonRetryableRawSkuError(error:unknown){const value=error as {code?:unknown};return value?.code==="FORBIDDEN";}
