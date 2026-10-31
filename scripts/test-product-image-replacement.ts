import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { uploadAdminProductImages } from "../src/features/products/woocommerce/woocommerce-product-image.service";
import { woocommerceClient as wc } from "../src/features/products/woocommerce/woocommerce.client";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

async function main() {
  const originals = { ...wc };
  const envKeys = ["WORDPRESS_MEDIA_BASE_URL", "WORDPRESS_MEDIA_USERNAME", "WORDPRESS_MEDIA_APP_PASSWORD", "WORDPRESS_MEDIA_TOKEN"];
  const savedEnv = new Map(envKeys.map(key => [key, process.env[key]]));
  let mediaRequests = 0, mediaId = 1000, failUpload = false;
  const server = createServer(async (request, response) => {
    for await (const chunk of request) void chunk;
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/wp-json/wp/v2/media") {
      mediaRequests++;
      if (failUpload) { response.writeHead(503); response.end("{}"); return; }
      mediaId++;
      response.end(JSON.stringify({ id:mediaId, source_url:`https://images.test/new-${mediaId}.png` }));
    } else response.end("{}");
  });
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  const address=server.address(); assert(address && typeof address !== "string");
  process.env.WORDPRESS_MEDIA_BASE_URL=`http://127.0.0.1:${address.port}`;
  process.env.WORDPRESS_MEDIA_USERNAME="fixture";
  process.env.WORDPRESS_MEDIA_APP_PASSWORD="fixture-only";
  delete process.env.WORDPRESS_MEDIA_TOKEN;
  const oldImages=Array.from({length:13},(_,i)=>({id:i+1,src:`https://images.test/old-${i+1}.png`}));
  let product={id:214,name:"KK-007 fixture",sku:"KK-007",status:"draft",type:"variable",images:oldImages,meta_data:[]} as unknown as WooCommerceProduct;
  let variants=[{id:25,status:"publish",sku:"KK-007-S",regular_price:"110000",stock_quantity:5,attributes:[],image:oldImages[0],meta_data:[{key:"ofissio_product_variant",value:"1"}]}] as WooCommerceProductVariation[];
  const writes:string[]=[];
  wc.getProductById=async()=>structuredClone(product);
  wc.getProductVariations=async()=>structuredClone(variants);
  wc.updateProductVariation=async(_id,id,patch)=>{
    writes.push("variant");const row=variants.find(row=>row.id===Number(id))!;
    Object.assign(row,patch,{image:{...patch.image,src:`https://images.test/new-${patch.image?.id}.png`}});
    return structuredClone(row);
  };
  wc.updateProduct=async(_id,patch)=>{
    writes.push("gallery");product={...product,...patch,images:patch.images?.map(image=>({...image,id:image.id!,src:oldImages.find(old=>old.id===image.id)?.src??`https://images.test/new-${image.id}.png`}))??product.images} as WooCommerceProduct;
    return structuredClone(product);
  };
  const files=(count:number)=>Array.from({length:count},(_,i)=>new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],`replacement-${i}.png`,{type:"image/png"}));
  const actor={productId:214,actorId:"fixture-only"};
  try {
    await assert.rejects(uploadAdminProductImages({...actor,files:files(11)}),/Maksimal 20/);
    assert.equal(mediaRequests,0);assert.deepEqual(writes,[]);
    const result=await uploadAdminProductImages({...actor,files:files(11),retainedImages:[]});
    assert.equal(result.images.length,11);assert.equal(result.uploadedImages.length,11);
    assert.equal(product.images?.length,11);assert.deepEqual(writes,["variant","gallery"]);
    assert(!product.images?.some(image=>oldImages.some(old=>old.id===image.id)));
    assert.equal(variants[0]!.sku,"KK-007-S");assert.equal(variants[0]!.stock_quantity,5);assert.equal(variants[0]!.regular_price,"110000");
    assert.equal(variants[0]!.image?.id,result.images[0]!.id);
    writes.length=0;
    const beforeRequests=mediaRequests;
    await assert.rejects(uploadAdminProductImages({...actor,files:files(1),retainedImages:[oldImages[0]!]}),/tidak dikenal/);
    await assert.rejects(uploadAdminProductImages({...actor,files:files(1),retainedImages:[result.images[0]!,result.images[0]!]}),/berulang/);
    await assert.rejects(uploadAdminProductImages({...actor,files:files(13),retainedImages:result.images}),/Maksimal 20/);
    assert.equal(mediaRequests,beforeRequests);assert.deepEqual(writes,[]);
    product={...product,images:oldImages}; variants=[{...variants[0]!,image:oldImages[0]}];
    failUpload=true;
    await assert.rejects(uploadAdminProductImages({...actor,files:files(2),retainedImages:[]}),/WordPress Media/);
    assert.deepEqual(product.images,oldImages);assert.deepEqual(writes,[]);
    failUpload=false;
    const appended=await uploadAdminProductImages({...actor,files:files(1)});
    assert.equal(appended.images.length,14);assert.equal(appended.uploadedImages.length,1);
    assert.deepEqual(appended.images.slice(0,13).map(image=>image.id),oldImages.map(image=>image.id));
    console.log("PASS: 13 old + 11 replacements save as 11; upload failure preserves gallery; unknown/duplicate/overflow rejected before upload; variant SKU/stock/price preserved; old append clients supported. Zero real writes.");
  } finally {
    Object.assign(wc,originals);
    for (const [key,value] of savedEnv) { if(value===undefined) delete process.env[key]; else process.env[key]=value; }
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
