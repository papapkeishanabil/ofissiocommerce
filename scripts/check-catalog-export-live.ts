/** Private CLI deployment check. Reads live products; never changes commerce data. */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { POST } = await import("../src/app/api/admin/products/catalog/route");
  const { loadCatalogProducts } = await import("../src/features/catalog-export/catalog-export.service");
  const { catalogExportSchema } = await import("../src/features/catalog-export/catalog-export.schema");
  const target = process.env.OFISSIO_CATALOG_CHECK_DIR;
  assert.ok(target, "Set OFISSIO_CATALOG_CHECK_DIR to a private output directory");
  const trusted = { host: "ofissio.com", origin: "https://ofissio.com", "content-type": "application/json", "x-ofissio-auth-verified": "1", "x-ofissio-auth-kind": "internal", "x-ofissio-internal-role": "super_admin", "x-ofissio-internal-user-id": "catalog-deployment-check" };
  const request = (body: unknown, headers: Record<string,string> = trusted) => new Request("https://ofissio.com/api/admin/products/catalog", { method: "POST", headers, body: JSON.stringify(body) });
  assert.ok([401,403].includes((await POST(request({}, { host:"ofissio.com" }))).status));
  assert.equal((await POST(request({}, { ...trusted, origin:"https://example.invalid" }))).status, 403);
  assert.equal((await POST(request({ scope:"category" }))).status, 400);
  const options = catalogExportSchema.parse({ scope:"all", format:"pdf" });
  const products = await loadCatalogProducts(options);
  assert.ok(products.length>0);
  const kk = products.find(p=>p.sku==="KK-001");
  assert.ok(kk, "KK-001 missing");
  assert.ok(kk.variants.every(v=>v.sleeve==="Pendek"), "KK-001 includes an invalid sleeve");
  const response = await POST(request(options));
  assert.equal(response.status,200, response.status===200 ? undefined : await response.text());
  assert.equal(response.headers.get("content-type"),"application/pdf");
  assert.equal(Number(response.headers.get("x-catalog-products")),products.length);
  assert.equal(response.headers.get("x-catalog-warnings"),"0", "Missing catalogue images");
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0,5).toString(),"%PDF-");
  await writeFile(join(target,"live-catalog.pdf"),bytes,{mode:0o600});
  await writeFile(join(target,"live-products.json"),JSON.stringify(products),{mode:0o600});
  const summary={ok:true,products:products.length,variants:products.reduce((n,p)=>n+p.variants.length,0),pages:Number(response.headers.get("x-catalog-pages")),bytes:bytes.length,checks:["private-api-auth","origin","validation","live-products","canonical-sleeves","real-pdf","all-images"]};
  await writeFile(join(target,"live-check.json"),JSON.stringify(summary,null,2),{mode:0o600});
  console.log(JSON.stringify(summary));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Catalogue check failed");process.exitCode=1;});
