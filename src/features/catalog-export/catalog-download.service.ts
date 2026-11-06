import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createApiError } from "@/lib/security/safe-error-response";

const directory = () => join(tmpdir(), "ofissio-catalog-downloads");
const TTL = 15 * 60_000;
const MAX_STORAGE = 512 * 1024 * 1024;
const validToken = /^[a-f0-9]{64}$/;
interface DownloadMetadata { owner: string; expires: number; size: number }

async function prune(now: number) {
  await mkdir(directory(), { recursive:true, mode:0o700 });
  let bytes = 0;
  for (const name of await readdir(directory())) {
    if (!/^[a-f0-9]{64}\.(pdf|json)$/.test(name)) continue;
    const file = join(directory(),name);
    const info = await stat(file).catch(()=>null);
    if (!info) continue;
    if (now-info.mtimeMs>TTL) await unlink(file).catch(()=>undefined);
    else bytes+=info.size;
  }
  return bytes;
}

/** Owner-bound private files allow native HTTP downloads without browser Blob storage. */
export async function prepareCatalogDownload(bytes: Buffer, owner: string) {
  const now=Date.now();
  if ((await prune(now))+bytes.length>MAX_STORAGE) throw createApiError("RATE_LIMITED","Penyimpanan unduhan sedang penuh. Coba lagi beberapa menit kemudian.",429);
  const token=randomBytes(32).toString("hex");
  const file=join(directory(),token+".pdf");
  try {
    await writeFile(file,bytes,{flag:"wx",mode:0o600});
    await writeFile(join(directory(),token+".json"),JSON.stringify({owner,expires:now+TTL,size:bytes.length} satisfies DownloadMetadata),{flag:"wx",mode:0o600});
  } catch(error) { await unlink(file).catch(()=>undefined); throw error; }
  return {downloadUrl:`/api/admin/products/catalog/download?token=${token}`,expiresAt:new Date(now+TTL).toISOString()};
}

export async function catalogDownloadResponse(request: Request, owner: string) {
  const token=new URL(request.url).searchParams.get("token")??"";
  if (!validToken.test(token)) throw createApiError("NOT_FOUND","Tautan unduhan tidak tersedia.",404);
  const file=join(directory(),token+".pdf");
  let meta: DownloadMetadata;
  try { meta=JSON.parse(await readFile(join(directory(),token+".json"),"utf8")) as DownloadMetadata; }
  catch { throw createApiError("NOT_FOUND","Tautan unduhan tidak tersedia. Buat ulang katalog.",404); }
  if (meta.owner!==owner) throw createApiError("NOT_FOUND","Tautan unduhan tidak tersedia.",404);
  if (meta.expires<=Date.now()) throw createApiError("NOT_FOUND","Tautan unduhan sudah kedaluwarsa. Buat ulang katalog.",404);
  const info=await stat(file).catch(()=>null);
  if (!info?.isFile() || info.size!==meta.size) throw createApiError("NOT_FOUND","File unduhan tidak tersedia. Buat ulang katalog.",404);
  const headers: Record<string,string> = {"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=\"ofissio-katalog.pdf\"","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Accept-Ranges":"bytes"};
  let start=0,end=meta.size-1,status=200;
  const range=request.headers.get("range");
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(match && (match[1]||match[2])){
      start=match[1]?Number(match[1]):Math.max(0,meta.size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(Number(match[2]),meta.size-1):meta.size-1;
    }else start=meta.size;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=meta.size||end<start){
      return new Response(null,{status:416,headers:{...headers,"Content-Range":`bytes */${meta.size}`,"Content-Length":"0"}});
    }
    status=206;headers["Content-Range"]=`bytes ${start}-${end}/${meta.size}`;
  }
  headers["Content-Length"]=String(end-start+1);
  if(request.method==="HEAD")return new Response(null,{status,headers});
  const stream=createReadStream(file,{start,end});
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{status,headers});
}
