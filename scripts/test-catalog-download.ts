import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepareCatalogDownload, catalogDownloadResponse } from "../src/features/catalog-export/catalog-download.service";

async function main(){
  const bytes=Buffer.from("%PDF-1.7\nNative HTTP catalogue download fixture\n%%EOF");
  const prepared=await prepareCatalogDownload(bytes,"download-test-owner");
  const request=(headers: Record<string,string>={},method="GET")=>new Request("https://ofissio.com"+prepared.downloadUrl,{headers,method});
  try{
    assert.match(prepared.downloadUrl,/token=[a-f0-9]{64}$/);
    const full=await catalogDownloadResponse(request(),"download-test-owner");
    assert.equal(full.status,200);assert.equal(full.headers.get("Content-Length"),String(bytes.length));
    assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes);
    const head=await catalogDownloadResponse(request({},"HEAD"),"download-test-owner");
    assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
    for(const [range,start,end] of [["bytes=0-4",0,4],["bytes=10-",10,bytes.length-1],["bytes=-5",bytes.length-5,bytes.length-1]] as const){
      const part=await catalogDownloadResponse(request({range}),"download-test-owner");
      assert.equal(part.status,206);assert.equal(part.headers.get("Content-Range"),`bytes ${start}-${end}/${bytes.length}`);
      assert.deepEqual(Buffer.from(await part.arrayBuffer()),bytes.subarray(start,end+1));
    }
    for(const range of ["bytes=9999-","bytes=9-1","bytes=0-1,3-5","bytes=-0"]){
      assert.equal((await catalogDownloadResponse(request({range}),"download-test-owner")).status,416);
    }
    await assert.rejects(()=>catalogDownloadResponse(request(),"another-admin"),/tidak tersedia/);
    await assert.rejects(()=>catalogDownloadResponse(new Request("https://ofissio.com/?token=..%2Fsecret"),"download-test-owner"),/tidak tersedia/);
    const now=Date.now;
    try { Date.now=()=>now()+20*60_000;await assert.rejects(()=>catalogDownloadResponse(request(),"download-test-owner"),/kedaluwarsa/); }
    finally {Date.now=now;}
    console.log("Native catalogue downloads: bytes, HEAD, resume ranges, invalid ranges, owner isolation, path validation and expiry passed.");
  }finally{
    const token=new URL("https://ofissio.com"+prepared.downloadUrl).searchParams.get("token")!;
    for(const suffix of [".pdf",".json"])await unlink(join(tmpdir(),"ofissio-catalog-downloads",token+suffix));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
