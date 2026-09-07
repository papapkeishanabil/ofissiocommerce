import fs from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { compareVariations, parseAndVerifySource, resolveSourceVariations } from "../src/features/product-integrity-repair/product-integrity-repair.service";
import { parseWooCommerceCsv } from "../src/features/product-import/woocommerce-csv.parser";
import type { WooCommerceImportProduct } from "../src/features/product-import/product-import.types";

const source=(id:string,size:string,sku:string|null=null,price=150000):WooCommerceImportProduct=>({sourceId:id,sourceType:"variation",sku,name:"",parentSku:"KS-001",parentId:"10",productType:"variation",published:false,description:"",shortDescription:"",regularPrice:price,salePrice:null,categories:[],tags:[],attributes:[{name:"UKURAN",values:[size],visible:true,global:true}],imageUrls:[],rawRow:{},internalKey:`KS-001::UKURAN=${size}`});
const target=(id:number,sourceId:string,option="",sku="KS-001")=>({id,sku,regular_price:"150000",attributes:option?[{name:"UKURAN",option}]:[],meta_data:[{id, key:"_ofissio_import_identity",value:{sourceId}}]});

const ks=compareVariations([source("101","S"),source("102","M")],[target(201,"101"),target(202,"102")],"KS-001");
assert.equal(ks.repairable,true,"persisted source identity must recover empty target attributes");
assert.equal(ks.repairs.length,2);
assert.equal(ks.repairs[0]?.targetSku,"","source-null SKU must remain empty");
assert.equal(ks.repairs[0]?.inheritedParentSku,true,"incorrect inherited parent SKU must be detected");
assert.deepEqual(ks.repairs[0]?.targetAttributes,[{name:"UKURAN",option:"S"}]);
assert.equal(ks.repairs[0]?.currentPrice,"150000","price must be observed and preserved");

const healthy=compareVariations([source("101","S")],[target(201,"101","S","")],"KS-001");
assert.equal(healthy.repairable,true);
const inheritedDisplay={...target(201,"101","S","KS-001"),rawSku:"",displaySku:"KS-001",inheritedFromParent:true};
const rawHealthy=compareVariations([source("101","S")],[inheritedDisplay],"KS-001");
assert.equal(rawHealthy.needsRepairRows,0,"inherited display SKU must not trigger a raw-SKU repair");
assert.equal(rawHealthy.repairs.length,0);
const rawDuplicate=compareVariations([source("101","S")],[{...inheritedDisplay,rawSku:"KS-001",inheritedFromParent:false}],"KS-001");
assert.equal(rawDuplicate.needsRepairRows,1,"a child that really stores the parent SKU must remain repairable");
const duplicate=compareVariations([source("101","S"),source("102","S")],[target(201,"101"),target(202,"102")],"KS-001");
assert.equal(duplicate.repairable,false,"duplicate source combinations must block repair");
const unmatched=compareVariations([source("101","S")],[{id:201,sku:"",attributes:[],meta_data:[]}],"KS-001");
assert.equal(unmatched.repairable,false,"unmatched variation must never be paired by array order");

const multiValueSource={...source("10495","S","SN-MUSTARD_MADINA-S"),attributes:[{name:"WARNA",values:["KUNING\\","MUSTARD DLL"],visible:true,global:true},{name:"UKURAN",values:["S"],visible:true,global:true}]};
const multiValueTarget={id:802,sku:"SN-MUSTARD_MADINA-S",rawSku:"SN-MUSTARD_MADINA-S",displaySku:"SN-MUSTARD_MADINA-S",regular_price:"150000",attributes:[{name:"WARNA",option:"KUNING"},{name:"UKURAN",option:"S"}],meta_data:[]};
const ambiguousMultiValue=compareVariations([multiValueSource],[multiValueTarget],"SN-MADINA");
assert.equal(ambiguousMultiValue.repairable,false,"a variation source with multiple values for one attribute must not be auto-repairable");
assert.equal(ambiguousMultiValue.needsReview,true,"ambiguous source attributes must remain visible for review");
assert.equal(ambiguousMultiValue.repairs.length,0,"ambiguous source attributes must never produce a write payload");
assert.match(ambiguousMultiValue.reason,/multiple values/i);

const verifiedCsv=[
  "ID,Type,SKU,Name,Parent,Regular price,Attribute 1 name,Attribute 1 value(s)",
  "10,variable,KS-001,Kemeja Safety,,,Ukuran,\"S, M\"",
  "101,variation,,Kemeja Safety - S,10,150000,Ukuran,S",
  "102,variation,,Kemeja Safety - M,id: 10,150000,Ukuran,M",
].join("\n");
const verifiedIndex=parseWooCommerceCsv(verifiedCsv);
const verifiedHash=createHash("sha256").update(verifiedCsv).digest("hex");
assert.equal(parseAndVerifySource(verifiedCsv,verifiedHash)?.rows.length,3,"matching SHA-256 must expose the parsed source dataset");
assert.throws(()=>parseAndVerifySource(verifiedCsv,"0".repeat(64)),/SHA-256 tidak cocok/,"wrong CSV hash must be rejected");
const verifiedParent=verifiedIndex.byId.get("10");
assert.ok(verifiedParent,"verified CSV parent must be parsed");
const linked=resolveSourceVariations(verifiedIndex,verifiedParent);
assert.equal(linked.length,2,"bare numeric and id-prefixed Parent rows must reach variation planner");
assert.equal(linked.every((variation)=>variation.sku===null),true,"source-null SKU must remain null");
const linkedComparison=compareVariations(linked,[target(201,"101","S",""),target(202,"102","M","")],"KS-001");
assert.equal(linkedComparison.repairable,true,"verified source attributes must map exactly");
assert.equal(linkedComparison.exactAttributeMatches,2);
assert.equal(linkedComparison.unmatchedSourceRows,0);
assert.equal(linkedComparison.unmatchedTargetRows,0);

const dryRunSource=fs.readFileSync("src/features/product-integrity-repair/product-integrity-repair.service.ts","utf8");
for(const forbidden of ["updateProduct(","updateProductVariation(","uploadProductImageToWordPress(","deleteProduct("])assert.equal(dryRunSource.includes(forbidden),false,`dry-run planner contains forbidden write: ${forbidden}`);
console.log("PASS: Phase 3B1 variation reconciliation and dry-run no-write checks");
