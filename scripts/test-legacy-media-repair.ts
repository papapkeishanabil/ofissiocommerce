import assert from "node:assert/strict";

process.env.WORDPRESS_MEDIA_BASE_URL = "https://target.example.test";
process.env.WORDPRESS_MEDIA_TOKEN = "test-token";
process.env.PRODUCT_IMPORT_LEGACY_IMAGE_HOSTS = "source.example.test";

const JPEG = new Uint8Array([0xff,0xd8,0xff,0xdb,0x00,0x43]);
const response = (body:BodyInit|null, init:ResponseInit) => new Response(body, init);

async function main() {
  const { inspectTrustedLegacyImage, LegacyImageSourceError } = await import("../src/features/product-import/product-import-legacy-image.service");
  const ok = await inspectTrustedLegacyImage("https://source.example.test/image.jpg", { fetcher:async()=>response(JPEG,{status:200,headers:{"content-type":"image/jpeg"}}) });
  assert.equal(ok.mimeType,"image/jpeg"); assert.equal(ok.byteCount,JPEG.length);

  let calls=0;
  const redirected = await inspectTrustedLegacyImage("https://source.example.test/redirect", { fetcher:async()=>{calls+=1;return calls===1?response(null,{status:302,headers:{location:"/image.jpg"}}):response(JPEG,{status:200,headers:{"content-type":"image/jpeg"}});} });
  assert.deepEqual(redirected.redirectStatuses,[302]); assert.equal(redirected.finalStatus,200);

  await expectCode(()=>inspectTrustedLegacyImage("https://source.example.test/missing",{fetcher:async()=>response(null,{status:404})}),"SOURCE_HTTP_404");
  await expectCode(()=>inspectTrustedLegacyImage("https://source.example.test/empty",{fetcher:async()=>response(new Uint8Array(),{status:200,headers:{"content-type":"image/jpeg"}})}),"SOURCE_IMAGE_EMPTY");
  await expectCode(()=>inspectTrustedLegacyImage("https://source.example.test/wrong",{fetcher:async()=>response(JPEG,{status:200,headers:{"content-type":"text/html"}})}),"INVALID_IMAGE_CONTENT_TYPE");
  await expectCode(()=>inspectTrustedLegacyImage("https://source.example.test/read",{fetcher:async()=>({ok:true,status:200,headers:new Headers({"content-type":"image/jpeg"}),arrayBuffer:async()=>{throw new Error("stream");}} as unknown as Response)}),"SOURCE_BODY_READ_FAILED");
  console.log("PASS: legacy source success, redirect, HTTP failure, empty, content-type, JPEG, and body-read diagnostics");
}

async function expectCode(run:()=>Promise<unknown>,code:string){let caught:unknown;try{await run();}catch(error){caught=error;}assert.ok(caught instanceof Error);assert.equal((caught as Error & {errorCode?:string}).errorCode,code);}
main().catch((error)=>{console.error(error);process.exitCode=1;});
