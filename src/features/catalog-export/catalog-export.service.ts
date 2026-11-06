import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { listColorVariationRows } from "@/features/products/woocommerce/color-variants.service";
import { fromSameOriginWordPressMediaUrl } from "@/features/products/woocommerce/wordpress-media-proxy";
import { normalizeWooCommerceMediaUrl } from "@/features/products/woocommerce/woocommerce-media-url";
import { createApiError } from "@/lib/security/safe-error-response";
import type { WooCommerceProduct } from "@/features/products/woocommerce/woocommerce.types";
import { selectCatalogProducts, toCatalogProduct } from "./catalog-export.model";
import type { CatalogExportOptions, CatalogProduct } from "./catalog-export.schema";

let rendering = false;
const MAX_RENDER_MS = 300_000;

export async function loadCatalogProducts(options: CatalogExportOptions): Promise<CatalogProduct[]> {
  const all: WooCommerceProduct[] = [];
  for (let page=1; page<=100; page++) {
    const rows = await woocommerceClient.getProducts({ status: "publish", per_page: 100, page });
    all.push(...rows);
    if (rows.length < 100) break;
    if (page === 100) throw createApiError("PROVIDER_ERROR", "Daftar produk terlalu besar. Hubungi admin sistem.");
  }
  let selected: WooCommerceProduct[];
  try { selected = selectCatalogProducts(all, options); }
  catch (error) { throw createApiError("VALIDATION_ERROR", (error as Error).message, 400); }
  const result: CatalogProduct[] = [];
  const base = process.env.WORDPRESS_MEDIA_BASE_URL?.trim() || getCommerceRuntimeConfig().woocommerce.baseUrl;
  const normalize = (url: string) => normalizeWooCommerceMediaUrl(fromSameOriginWordPressMediaUrl(url, base), base);
  for (let i=0;i<selected.length;i+=3) {
    const batch = await Promise.all(selected.slice(i,i+3).map(async raw => {
      const native = raw.type === "variable" ? await listColorVariationRows(raw.id) : [];
      let product: CatalogProduct;
      try { product = toCatalogProduct(raw, native); }
      catch (error) { throw createApiError("VALIDATION_ERROR", (error as Error).message, 400); }
      return { ...product, image: normalize(product.image), extraImages: product.extraImages.map(normalize), variants: product.variants.map(v => ({ ...v, image: normalize(v.image) })) };
    }));
    result.push(...batch);
  }
  return result.sort((a,b) => a.category.localeCompare(b.category,"id") || a.name.localeCompare(b.name,"id"));
}

/** Shell-free worker invocation; no remote browser, shell command or client HTML. */
async function runWorker(payload: object, work: string, signal?: AbortSignal) {
  if (signal?.aborted) throw createApiError("BAD_REQUEST", "Ekspor dibatalkan.", 499);
  const executable = process.env.OFISSIO_CATALOG_PYTHON?.trim() || (process.platform === "win32" ? "python" : "python3");
  const worker = join(process.cwd(), "src/features/catalog-export/worker.py");
  await new Promise<void>((resolveWorker,reject) => {
    const child = spawn(/*turbopackIgnore: true*/ executable, [worker, work], { stdio: ["pipe","pipe","pipe"], windowsHide: true, detached: process.platform !== "win32", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    let stderr = "";
    let interrupted = false;
    const stop = () => {
      if (interrupted) return;
      interrupted = true;
      if (child.pid && process.platform !== "win32") { try { process.kill(-child.pid,"SIGTERM"); } catch { child.kill(); } }
      else if (child.pid) {
        const killer = spawn("taskkill.exe", ["/PID",String(child.pid),"/T","/F"], { windowsHide:true,stdio:"ignore" });
        killer.on("error",()=>child.kill());
        killer.on("close",code=>{ if(code!==0)child.kill(); });
      }
      else child.kill();
    };
    const timer = setTimeout(stop, MAX_RENDER_MS);
    signal?.addEventListener("abort", stop, { once: true });
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort",stop); };
    child.stdout.resume();
    child.stderr.on("data", (chunk: Buffer) => { if (stderr.length<32_000) stderr += chunk.toString(); });
    child.stdin.on("error", () => { /* close/error below reports worker failure */ });
    child.on("error", () => { cleanup(); reject(createApiError("PROVIDER_UNAVAILABLE", "Layanan ekspor katalog belum siap. Hubungi admin sistem.",503)); });
    child.on("close", code => {
      cleanup();
      if (interrupted) return reject(createApiError("PROVIDER_UNAVAILABLE", "Ekspor dibatalkan atau melewati batas waktu. Coba ekspor per kategori.",503));
      if (code !== 0) {
        console.error("[catalog-export] renderer failed", { dependencyMissing: /ModuleNotFoundError|Executable doesn't exist/.test(stderr), code });
        return reject(createApiError("PROVIDER_UNAVAILABLE", "Katalog belum dapat dibuat. Periksa kelengkapan produk atau hubungi admin sistem.",503));
      }
      resolveWorker();
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export async function exportCatalog(options: CatalogExportOptions, signal?: AbortSignal) {
  if (rendering) throw createApiError("RATE_LIMITED", "Ekspor katalog sedang berjalan. Coba lagi setelah selesai.",429);
  rendering = true;
  let work: string | undefined;
  try {
    const products = await loadCatalogProducts(options);
    work = await mkdtemp(join(tmpdir(),"ofissio-catalog-job-"));
    const config = getCommerceRuntimeConfig();
    const imageOrigins = [...new Set([process.env.WORDPRESS_MEDIA_BASE_URL,config.woocommerce.baseUrl].flatMap(value => {
      try { return value ? [new URL(value).origin] : []; } catch { return []; }
    }))];
    await runWorker({ options, products, imageOrigins, publicRoot: join(process.cwd(),"public") }, work, signal);
    const summary = JSON.parse(await readFile(join(work,"result.json"),"utf8")) as { pages: number; products: number; warnings: string[] };
    const file = join(work,options.format === "pdf" ? "catalog.pdf" : "preview.html");
    if ((await stat(file)).size > 150*1024*1024) throw createApiError("BAD_REQUEST", "Ukuran katalog terlalu besar. Ekspor per kategori.",400);
    return { bytes: await readFile(file), pages: summary.pages, products: summary.products, warnings: summary.warnings };
  } finally {
    rendering = false;
    if (work) {
      const path = resolve(work);
      if (relative(resolve(tmpdir()),path).startsWith("ofissio-catalog-job-")) await rm(path,{ recursive: true, force: true });
    }
  }
}
