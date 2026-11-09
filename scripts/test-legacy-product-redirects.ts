import assert from "node:assert/strict";
import config from "../next.config";
async function main(){
 const redirects=await config.redirects!();
 const expected=[['kemeja-kantor-kk-012','kemeja-kerja-kk-012'],['kemeja-kantor-kk-014','kemeja-kerja-kk-014'],['kemeja-kantor-kk-015','kemeja-kerja-kk-015'],['kemeja-kerja-putih-kk-013','kemeja-kerja-kk-013']];
 for(const [source,destination] of expected){const row=redirects.find(row=>row.source===`/product/${source}`);assert(row);assert.equal(row.destination,`/product/${destination}`);assert.equal(row.statusCode,301);assert.notEqual(row.source,row.destination);}
 assert.equal(new Set(redirects.map(row=>row.source)).size,redirects.length);
 assert(!redirects.some(row=>row.source==='/product/kemeja-kerja-teknisi-kt-003'));
 assert(redirects.some(row=>row.source==='/product/kemeja-kerja-teknisi-kt-001'));
 assert(!redirects.some(row=>row.source.includes('/product/:')));
 console.log("PASS: four verified exact aliases use 301, existing redirects retained, no duplicate/loop/wildcard or unconfirmed KT-003 redirect.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
