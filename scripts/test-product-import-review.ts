import assert from "node:assert/strict";
import { enrichProductImportPlan } from "../src/features/product-import/product-import-plan-review";
import type { ProductImportPlan, ProductImportPreview } from "../src/features/product-import/product-import.types";

const plan={batchId:"test",products:[
  {sourceId:"new",sourceSku:"NEW",targetSku:"NEW",name:"New product",action:"CREATE_DRAFT",reason:"draft",photoSource:"NEW_LOCAL_PHOTOS",imageCount:4,variationCount:2,warnings:[]},
  {sourceId:"existing",sourceSku:"OLD",targetSku:"OLD",name:"Existing product",action:"SKIP_EXISTING",reason:"exists",photoSource:"NEW_LOCAL_PHOTOS",imageCount:2,variationCount:1,warnings:[]},
  {sourceId:"external",sourceSku:"EXT",targetSku:"EXT",name:"External",action:"SKIP_UNSUPPORTED",reason:"external",photoSource:"LEGACY_WOOCOMMERCE",imageCount:3,variationCount:0,warnings:[]},
  {sourceId:"photo:ONLY",sourceSku:null,targetSku:"ONLY",name:"ONLY",action:"SKIP_NEEDS_PRODUCT_DATA",reason:"missing product",photoSource:"NEW_LOCAL_PHOTOS",imageCount:5,variationCount:0,warnings:[]},
],summary:{productsAnalyzed:4,createDraft:1,skipExisting:1,skipNeedsProductData:1,skipUnsupported:1,blocked:0,variationsReady:2,localImages:4,legacyImages:0,unassignedSkipped:2,warnings:0,errors:0}} satisfies ProductImportPlan;
const product=(sourceId:string,type:"variable"|"external",variationSkus:Array<string|null>)=>({key:sourceId,sourceSku:sourceId,normalizedSku:sourceId,suggestedSku:null,product:{sourceId,productType:type,name:sourceId},variations:variationSkus.map(sku=>({sku})),folders:[],images:[],glbAssets:[],videoAssets:[],variantPhotos:[],suggestedCover:null,photoSource:sourceId==="external"?"LEGACY_WOOCOMMERCE":"NEW_LOCAL_PHOTOS",status:"MATCHED",issues:[],isReadyForImport:true});
const preview={products:[product("new","variable",[null,"NEW-M"]),product("existing","variable",["OLD-S"]),product("external","external",[]),{...product("photo:ONLY","variable",[]),product:null,key:"photo:ONLY",images:Array.from({length:5},(_,index)=>({relativePath:`${index}.png`}))}],unassignedAssets:[{},{}],warningBreakdown:[],summary:{unassignedImages:2}} as unknown as ProductImportPreview;
const result=enrichProductImportPlan(plan,preview);
assert.equal(result.products.find(item=>item.targetSku==="OLD")?.imageAction,"SKIP_EXISTING_PRODUCT","existing image excluded from upload");
assert.equal(result.products.find(item=>item.targetSku==="EXT")?.productType,"external","unsupported actual type visible");
assert.equal(result.products.find(item=>item.targetSku==="ONLY")?.imageAction,"SKIP_NEEDS_PRODUCT_DATA","photo-only action visible");
assert.equal(result.summary.sourceVariations,3);assert.equal(result.summary.variationsReady,2);assert.equal(result.summary.variationsSkipped,1);assert.equal(result.summary.variationsBlocked,0);
assert.equal(result.summary.variationsWithoutSourceSku,1);assert.equal(result.summary.variationsWithoutSkuPreserved,1);assert.equal(result.summary.variationsWithoutSkuBlocked,0);
assert.equal(result.summary.localSourceImages,6);assert.equal(result.summary.localImages,4);assert.equal(result.summary.localImagesSkipped,2);assert.equal(result.summary.localImagesBlocked,0);
assert.equal(result.summary.photoOnlyImagesSkipped,5);assert.equal(result.summary.unassignedSkipped,2);assert.equal(result.summary.legacyImagesCopyRequired,0);
assert.equal(result.summary.createDraft!+result.summary.skipExisting!+result.summary.skipNeedsProductData!+result.summary.skipUnsupported!+result.summary.blocked!,result.summary.productsAnalyzed);
console.log("PASS: Dry Run review action, variation, and image consistency checks");
