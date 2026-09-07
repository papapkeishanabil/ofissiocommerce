import assert from "node:assert/strict";
import type { IntegrityRepairRow } from "../src/features/product-integrity-repair/product-integrity-repair.types";
import type { WooCommerceProduct } from "../src/features/products/woocommerce/woocommerce.types";

const source = (name:string) => `https://www.ofissio.com/${name}`;
const makeRow = (id:number,names=["one.jpg"]):IntegrityRepairRow => ({
  id:`legacy:${id}`,repair:"LEGACY_MEDIA",productId:id,sku:`TG-${id}`,product:`Jaket TG-${id}`,
  current:"0 images",target:`${names.length} images`,confidence:"EXACT_SOURCE_MATCH",classification:"AUTO_REPAIRABLE",
  reason:"test",evidence:[],sourceId:String(id),payload:{sourceUrls:names.map(source)},
});
const inspect = async (url:string) => {
  const filename=new URL(url).pathname.split("/").at(-1)!;
  return {bytes:new Uint8Array([255,216,255]),mimeType:"image/jpeg",detectedExtension:"jpg" as const,filename,sha256:`hash-${filename}`,httpStatus:200,finalStatus:200,redirectStatuses:[],contentType:"image/jpeg",byteCount:3,finalUrl:url};
};
const media = (id:number,name:string,mimeType="image/jpeg",title=name) => ({id,sourceUrl:`/api/media/wordpress/wp-content/uploads/2026/08/${name}`,targetMediaUrl:`http://localhost:10010/wp-content/uploads/2026/08/${name}`,filename:name,mimeType,extension:name.split(".").at(-1)!,slug:name.replace(/\.[^.]+$/,"").toLowerCase(),alt:"",title});
const product = (id:number,ids:number[]):WooCommerceProduct => ({id,name:`Jaket TG-${id}`,slug:`tg-${id}`,sku:`TG-${id}`,status:"draft",description:"",short_description:"",price:"",regular_price:"",sale_price:"",images:ids.map((imageId)=>({id:imageId,src:`https://target.test/${imageId}.jpg`}))});
const delay=(ms:number)=>new Promise((resolve)=>setTimeout(resolve,ms));

async function main(){
  process.env.LEGACY_MEDIA_WRITE_CONCURRENCY="1";
  const [{repairLegacyMedia,verifyWordPressMediaReadback},{getLegacyMediaWriteGateSnapshot,resetLegacyMediaWriteGateForTests}]=await Promise.all([
    import("../src/features/product-integrity-repair/product-integrity-repair-execute.service"),
    import("../src/features/product-integrity-repair/legacy-media-write-gate"),
  ]);
  resetLegacyMediaWriteGateForTests();
  const kk020=media(1017,"kemeja-KK-020-4-1.webp","image/webp","Completely different title");
  assert.equal(verifyWordPressMediaReadback({expectedMediaId:1017,expectedFilename:"kemeja-KK-020-4-1.webp",expectedMimeType:"image/webp",media:kk020}),true,"remote source and local target with lowercase slug must be valid");
  assert.equal(verifyWordPressMediaReadback({expectedMediaId:1017,expectedFilename:"wrong.webp",expectedMimeType:"image/webp",media:kk020}),false,"wrong basename must fail");
  assert.equal(verifyWordPressMediaReadback({expectedMediaId:1017,expectedFilename:"kemeja-KK-020-4-1.webp",expectedMimeType:"image/jpeg",media:kk020}),false,"wrong MIME must fail");
  assert.equal(verifyWordPressMediaReadback({expectedMediaId:999,expectedFilename:"kemeja-KK-020-4-1.webp",expectedMimeType:"image/webp",media:kk020}),false,"wrong direct read-back ID must fail");

  let uploads=0;let attaches=0;
  const row=makeRow(65);
  const base={inspect,search:async()=>[],upload:async()=>{uploads+=1;return media(9,"one.jpg");},readMedia:async()=>media(9,"one.jpg"),attach:async()=>{attaches+=1;},readProduct:async()=>product(65,[9])};
  await expectStage(()=>repairLegacyMedia(row,{...base,search:async()=>{throw new Error("search");}}),"MEDIA_SEARCH","MEDIA_SEARCH_FAILED");assert.equal(uploads,0,"search failure must produce zero POST/upload");
  await expectStage(()=>repairLegacyMedia(row,{...base,upload:async()=>{uploads+=1;throw new Error("upload");}}),"MEDIA_UPLOAD","MEDIA_UPLOAD_FAILED");assert.equal(attaches,0,"attach must not happen before every media exists");
  await expectStage(()=>repairLegacyMedia(row,{...base,readMedia:async()=>{throw new Error("readback");}}),"MEDIA_READBACK","MEDIA_READBACK_FAILED");
  await expectStage(()=>repairLegacyMedia(row,{...base,attach:async()=>{attaches+=1;throw new Error("attach");}}),"PRODUCT_ATTACH","PRODUCT_ATTACH_FAILED");
  await expectStage(()=>repairLegacyMedia(row,{...base,readProduct:async()=>product(65,[])}),"FINAL_VERIFY","MEDIA_ASSOCIATION_ORDER_MISMATCH");
  await expectStage(()=>repairLegacyMedia(row,{...base,inspect:async()=>{throw new Error("unexpected");}}),"SOURCE_DOWNLOAD","LEGACY_MEDIA_UNEXPECTED");
  uploads=0;
  const reused=await repairLegacyMedia(row,{...base,search:async()=>[media(9,"one.jpg")]});
  assert.equal(uploads,0,"deterministic existing media must never be uploaded again");assert.equal(reused.reusedImages,1);

  const two=makeRow(66,["one.jpg","two.jpg"]);
  let activeUploads=0;let maxUploads=0;const uploadOrder:string[]=[];let readbacks=0;
  const sequential=await repairLegacyMedia(two,{inspect,search:async()=>[],upload:async(input)=>{activeUploads+=1;maxUploads=Math.max(maxUploads,activeUploads);uploadOrder.push(`upload:${input.filename}`);await delay(10);activeUploads-=1;return media(input.filename==="one.jpg"?11:12,input.filename);},readMedia:async(id)=>{readbacks+=1;uploadOrder.push(`read:${id}`);return media(id,id===11?"one.jpg":"two.jpg");},attach:async()=>{},readProduct:async()=>product(66,[11,12])});
  assert.equal(sequential.status,"REPAIRED");assert.equal(maxUploads,1);assert.equal(readbacks,2);assert.deepEqual(sequential.legacyMediaVerification?.verifiedWooImageIds,[11,12]);assert.equal(sequential.legacyMediaVerification?.orderedVerified,true);assert.equal(sequential.legacyMediaVerification?.expectedImages.length,2);
  assert.deepEqual(uploadOrder,["upload:one.jpg","read:11","upload:two.jpg","read:12"],"each image must complete upload/read-back before the next image starts");

  let activeProducts=0;let maxProducts=0;
  const concurrentDeps=(id:number)=>({inspect:async(url:string)=>{activeProducts+=1;maxProducts=Math.max(maxProducts,activeProducts);await delay(15);activeProducts-=1;return inspect(url);},search:async()=>[media(id,"one.jpg")],readMedia:async()=>media(id,"one.jpg"),upload:async()=>{throw new Error("must reuse");},attach:async()=>{},readProduct:async()=>product(id,[id])});
  await Promise.all([repairLegacyMedia(makeRow(71),concurrentDeps(71)),repairLegacyMedia(makeRow(72),concurrentDeps(72))]);
  assert.equal(maxProducts,1,"only one Legacy Media product repair may run at a time");
  assert.equal(getLegacyMediaWriteGateSnapshot().maxObserved,1);

  let firstRunUploads=0;
  await expectStage(()=>repairLegacyMedia(two,{inspect,search:async()=>[],upload:async(input)=>{firstRunUploads+=1;if(input.filename==="two.jpg")throw new Error("LocalWP unavailable");return media(11,"one.jpg");},readMedia:async()=>media(11,"one.jpg"),attach:async()=>{throw new Error("must not attach");},readProduct:async()=>product(66,[])}),"MEDIA_UPLOAD","MEDIA_UPLOAD_FAILED");
  assert.equal(firstRunUploads,2);
  let retryUploads=0;
  const retry=await repairLegacyMedia(two,{inspect,search:async(term)=>term==="one"?[media(11,"one.jpg")]:[],upload:async()=>{retryUploads+=1;return media(12,"two.jpg");},readMedia:async(id)=>media(id,id===11?"one.jpg":"two.jpg"),attach:async()=>{},readProduct:async()=>product(66,[11,12])});
  assert.equal(retryUploads,1,"retry must reuse the first successful media and upload only the missing image");
  assert.equal(retry.reusedImages,1);assert.equal(retry.uploadedImages,1);

  await expectStage(()=>repairLegacyMedia(two,{inspect,search:async(term)=>[media(term==="one"?11:12,`${term}.jpg`)],readMedia:async(id)=>media(id,id===11?"one.jpg":"two.jpg"),upload:async()=>{throw new Error("must reuse");},attach:async()=>{},readProduct:async()=>product(66,[12,11])}),"FINAL_VERIFY","MEDIA_ASSOCIATION_ORDER_MISMATCH");
  console.log("PASS: sequential images, one product write, reconciliation reuse, attach gating, and exact ID/order verification");
}
async function expectStage(run:()=>Promise<unknown>,stage:string,code:string){let caught:unknown;try{await run();}catch(error){caught=error;}assert.ok(caught instanceof Error);assert.equal((caught as Error&{failureStage?:string}).failureStage,stage);assert.equal((caught as Error&{errorCode?:string}).errorCode,code);}
main().catch((error)=>{console.error(error);process.exitCode=1;});
