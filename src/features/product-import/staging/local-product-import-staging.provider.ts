import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, readFile, readdir, rename, rm, stat, statfs, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { getProductImportStagingConfig } from "../product-import.config";
import { ProductImportChunkWriteError, type ProductImportStagingProvider, type ProductImportUploadSession } from "./product-import-staging.types";

const BATCH_ID = /^[0-9a-f-]{36}$/i;
const UPLOAD_ID = /^[0-9a-f-]{36}$/i;

export class LocalProductImportStagingProvider implements ProductImportStagingProvider {
  async initialize(input: { batchId: string; originalFilename: string; totalSize: number; totalChunks: number; chunkSize: number }) {
    const expectedChunks = Math.ceil(input.totalSize / input.chunkSize);
    if (!input.originalFilename.toLowerCase().endsWith(".zip") || input.totalChunks !== expectedChunks || input.totalChunks <= 0) throw new Error("Metadata upload ZIP tidak valid.");
    const config = getProductImportStagingConfig(); await mkdir(config.directory, { recursive: true }); await cleanupExpired(config.directory, config.retentionHours);
    const disk = await statfs(config.directory, { bigint: true });
    const available = Number(disk.bavail * disk.bsize);
    if (available < input.totalSize * 2 + config.diskSafetyBytes) throw new Error("INSUFFICIENT_STAGING_SPACE");
    const directory = batchDirectory(input.batchId); await rm(directory, { recursive: true, force: true }); await mkdir(path.join(directory, "chunks"), { recursive: true });
    const now = new Date().toISOString();
    const session: ProductImportUploadSession = { batchId: input.batchId, uploadId: randomUUID(), originalFilename: path.basename(input.originalFilename), totalSize: input.totalSize, totalChunks: input.totalChunks, chunkSize: input.chunkSize, uploadedChunks: [], state: "READY", createdAt: now, updatedAt: now };
    await saveSession(session); return session;
  }

  async writeChunk(input: { batchId: string; uploadId: string; chunkIndex: number; body: ReadableStream<Uint8Array>; contentLength: number | null }) {
    const session = await ownedSession(input.batchId, input.uploadId);
    if (!Number.isInteger(input.chunkIndex) || input.chunkIndex < 0 || input.chunkIndex >= session.totalChunks) throw new Error("Index chunk tidak valid.");
    const expected = input.chunkIndex === session.totalChunks - 1 ? session.totalSize - session.chunkSize * input.chunkIndex : session.chunkSize;
    if (input.contentLength !== null && input.contentLength !== expected) {
      throw new ProductImportChunkWriteError({ code: "CONTENT_LENGTH_MISMATCH", message: "Ukuran Content-Length chunk tidak sesuai.", expectedBytes: expected, receivedBytes: input.contentLength });
    }
    const target = chunkPath(input.batchId, input.chunkIndex); const existing = await stat(target).catch(() => null);
    if (existing?.size === expected) return { state: "ALREADY_UPLOADED" as const, sizeBytes: existing.size };
    const temporary = `${target}.${randomUUID()}.tmp`; let sizeBytes = 0;
    const meter = new Transform({ transform(chunk: Buffer, _encoding, done) { sizeBytes += chunk.length; if (sizeBytes > expected) return done(new Error("Chunk melebihi batas.")); done(null, chunk); } });
    try {
      await pipeline(Readable.fromWeb(input.body as never), meter, createWriteStream(temporary, { flags: "wx" }));
      if (sizeBytes !== expected) {
        throw new ProductImportChunkWriteError({ code: "INCOMPLETE_CHUNK", message: "Ukuran chunk yang diterima tidak lengkap.", expectedBytes: expected, receivedBytes: sizeBytes });
      }
      await rename(temporary, target);
    } catch (error) {
      if (error instanceof ProductImportChunkWriteError) throw error;
      const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "CHUNK_STREAM_WRITE_ERROR";
      throw new ProductImportChunkWriteError({ code: errorCode, message: error instanceof Error ? error.message : "Stream chunk gagal ditulis.", expectedBytes: expected, receivedBytes: sizeBytes, cause: error });
    } finally { await rm(temporary, { force: true }).catch(() => undefined); }
    session.uploadedChunks = [...new Set([...session.uploadedChunks, input.chunkIndex])].sort((a,b)=>a-b); session.state = "UPLOADING"; session.updatedAt = new Date().toISOString(); await saveSession(session);
    return { state: "UPLOADED" as const, sizeBytes };
  }

  async getUploadStatus(input: { batchId: string; uploadId: string }) { return ownedSession(input.batchId, input.uploadId); }

  async finalize(input: { batchId: string; uploadId: string }) {
    const session = await ownedSession(input.batchId, input.uploadId);
    for (let index=0; index<session.totalChunks; index+=1) { const info=await stat(chunkPath(input.batchId,index)).catch(()=>null); const expected=index===session.totalChunks-1?session.totalSize-session.chunkSize*index:session.chunkSize; if(!info||info.size!==expected) throw new Error(`Chunk ${index} belum lengkap.`); }
    const destination = finalPath(input.batchId); const temporary = `${destination}.${randomUUID()}.tmp`; const output = await open(temporary, "wx");
    try { for(let index=0;index<session.totalChunks;index+=1){const source=await open(chunkPath(input.batchId,index),"r");try{for await(const chunk of source.createReadStream())await output.write(chunk as Buffer);}finally{await source.close();}} await output.sync(); }
    finally { await output.close(); }
    await rename(temporary,destination); const result=await hashFile(destination); if(result.sizeBytes!==session.totalSize){await rm(destination,{force:true});throw new Error("Ukuran source.zip tidak sesuai.");}
    await rm(path.join(batchDirectory(input.batchId),"chunks"),{recursive:true,force:true}); session.uploadedChunks=Array.from({length:session.totalChunks},(_,i)=>i);session.state="UPLOAD_COMPLETE";session.updatedAt=new Date().toISOString();await saveSession(session);
    return { filePath:destination,...result };
  }

  async inspectFinalizedFile(input: { batchId: string }) { const filePath=finalPath(input.batchId);const info=await stat(filePath).catch(()=>null);if(!info?.isFile())return null;return {filePath,...await hashFile(filePath)}; }
  async withFinalizedFile<T>(input: { batchId: string; callback: (file: { filePath: string; sizeBytes: number; sha256: string }) => Promise<T> }) { const file=await this.inspectFinalizedFile({batchId:input.batchId});if(!file)throw new Error("STAGING_FILE_MISSING");return input.callback(file); }
  async deleteBatch(batchId:string){await rm(batchDirectory(batchId),{recursive:true,force:true});}
}

function root(){return getProductImportStagingConfig().directory;}
function batchDirectory(batchId:string){if(!BATCH_ID.test(batchId))throw new Error("Batch ID tidak valid.");const resolved=path.resolve(root(),batchId);if(path.dirname(resolved)!==path.resolve(root()))throw new Error("Path staging tidak valid.");return resolved;}
function sessionPath(batchId:string){return path.join(batchDirectory(batchId),"upload.json");}
function finalPath(batchId:string){return path.join(batchDirectory(batchId),"source.zip");}
function chunkPath(batchId:string,index:number){return path.join(batchDirectory(batchId),"chunks",`${String(index).padStart(6,"0")}.part`);}
async function saveSession(session:ProductImportUploadSession){const target=sessionPath(session.batchId);const temporary=`${target}.tmp`;await writeFile(temporary,JSON.stringify(session),{encoding:"utf8",flag:"w"});await rename(temporary,target);}
async function loadSession(batchId:string){return JSON.parse(await readFile(sessionPath(batchId),"utf8")) as ProductImportUploadSession;}
async function ownedSession(batchId:string,uploadId:string){if(!UPLOAD_ID.test(uploadId))throw new Error("Upload ID tidak valid.");const session=await loadSession(batchId);if(session.uploadId!==uploadId)throw new Error("Upload session tidak valid.");return session;}
async function hashFile(filePath:string){const hash=createHash("sha256");let sizeBytes=0;for await(const chunk of createReadStream(filePath)){sizeBytes+=(chunk as Buffer).length;hash.update(chunk as Buffer);}return{sizeBytes,sha256:hash.digest("hex")};}
async function cleanupExpired(directory:string,retentionHours:number){const cutoff=Date.now()-retentionHours*60*60*1000;for(const entry of await readdir(directory,{withFileTypes:true})){if(!entry.isDirectory()||!BATCH_ID.test(entry.name))continue;const entryDirectory=path.join(directory,entry.name);const finalized=await stat(path.join(entryDirectory,"source.zip")).catch(()=>null);if(finalized?.isFile())continue;const metadata=await readFile(path.join(entryDirectory,"upload.json"),"utf8").then(value=>JSON.parse(value) as ProductImportUploadSession).catch(()=>null);if(metadata&&Date.parse(metadata.updatedAt)<cutoff)await rm(entryDirectory,{recursive:true,force:true});}}

export const localProductImportStagingProvider = new LocalProductImportStagingProvider();
