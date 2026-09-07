import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildVariationBlockerTriage } from "../src/features/product-integrity-repair/variation-blocker-triage";
import type { WooCommerceImportProduct } from "../src/features/product-import/product-import.types";
import type { WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const source=(id:string,size:string,sku:string|null=null):WooCommerceImportProduct=>({sourceId:id,sourceType:"variation",sku,name:"",parentSku:"TEST",parentId:"10",productType:"variation",published:false,description:"",shortDescription:"",regularPrice:150000,salePrice:null,categories:[],tags:[],attributes:size?[{name:"UKURAN",values:[size],visible:true,global:true}]:[],imageUrls:[],rawRow:{},internalKey:`TEST:${id}`});
const target=(id:number,size:string,rawSku="",price="150000"):WooCommerceProductVariation=>({id,sku:rawSku||"TEST",rawSku,displaySku:rawSku||"TEST",inheritedFromParent:!rawSku,status:"publish",regular_price:price,attributes:size?[{name:"UKURAN",option:size}]:[]});
const comparison=(sourceRows:number,targetRows:number,ambiguousMappings=0)=>({unmatchedSourceRows:sourceRows,unmatchedTargetRows:targetRows,ambiguousMappings});

const healthyTarget=[target(1,"S"),target(2,"M")];
const incomplete=buildVariationBlockerTriage({source:[],target:healthyTarget,comparison:comparison(0,2)});
assert.equal(incomplete.targetHealth,"HEALTHY");
assert.equal(incomplete.recommendation,"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE");
assert.ok(incomplete.targetEvidence.includes("TARGET_HEALTHY_SOURCE_INCOMPLETE"));

const duplicateKey={...source("1","S"),attributes:[{name:"WARNA",values:["KUNING"],visible:true,global:true},{name:"WARNA",values:["MUSTARD"],visible:true,global:true},{name:"UKURAN",values:["S"],visible:true,global:true}]};
const duplicateKeyResult=buildVariationBlockerTriage({source:[duplicateKey],target:[target(1,"S")],comparison:comparison(1,1,1)});
assert.ok(duplicateKeyResult.rootCauses.includes("SOURCE_DUPLICATE_ATTRIBUTE_KEY"));

const inherited=buildVariationBlockerTriage({source:[source("1","S")],target:[target(1,"S","")],comparison:comparison(0,0)});
assert.equal(inherited.targetHealth,"HEALTHY","inherited display SKU with empty raw SKU is healthy");
assert.equal(inherited.targetWithRawSku,0);

const duplicateTargets=buildVariationBlockerTriage({source:[source("1","S"),source("2","M")],target:[target(1,"S"),target(2,"S")],comparison:comparison(1,1,1)});
assert.equal(duplicateTargets.targetHealth,"BROKEN");
assert.ok(duplicateTargets.rootCauses.includes("TARGET_AMBIGUOUS"));

const wildcardSource={...source("1",""),attributes:[{name:"UKURAN",values:[""],visible:true,global:true}]};
const wildcard=buildVariationBlockerTriage({source:[wildcardSource],target:[target(1,"S")],comparison:comparison(1,1,1)});
assert.ok(wildcard.rootCauses.includes("SOURCE_ATTRIBUTES_WILDCARD"));
assert.equal(wildcard.targetHealth,"HEALTHY");
assert.equal(wildcard.recommendation,"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE");

const mismatch=buildVariationBlockerTriage({source:[source("1","S")],target:healthyTarget,comparison:comparison(0,1)});
assert.ok(mismatch.rootCauses.includes("VARIATION_COUNT_MISMATCH"));

const planner=readFileSync("src/features/product-integrity-repair/product-integrity-repair.service.ts","utf8");
for(const forbidden of ["updateProduct(","updateProductVariation(","createProductVariation(","uploadProductImageToWordPress(","deleteProduct("])assert.equal(planner.includes(forbidden),false,`triage planner must remain read-only: ${forbidden}`);
assert.ok(planner.indexOf("if (isSpecialServiceAddon(product))")<planner.indexOf("const variationBlockerTriage="),"BDR exits before variation triage");
console.log("PASS: variation blocker triage root cause, target health, recommendation, raw SKU, BDR, and zero-write checks");
