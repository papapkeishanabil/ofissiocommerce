import "server-only";

import yauzl, { type Entry, type ZipFile } from "yauzl";

import { getProductImportLimits, PRODUCT_IMPORT_IMAGE_EXTENSIONS, PRODUCT_IMPORT_LIMITS } from "./product-import.config";
import type { PhotoManifestAsset, ZipVerificationItem, ZipVerificationResult } from "./product-import.types";

export interface VerifiedZipEntry { path: string; size: number; mimeType: string | null; kind: "IMAGE" | "GLB" | "VIDEO" | "OTHER"; entry: Entry }

export async function verifyProductPhotoZip(input: { bytes: Uint8Array; manifest: PhotoManifestAsset[] }) {
  const maxZipBytes = getProductImportLimits().maxZipBytes;
  if (!input.bytes.length || input.bytes.length > maxZipBytes) throw new Error(`ZIP kosong atau melebihi batas ${Math.round(maxZipBytes / 1024 / 1024)} MB.`);
  return verifyOpenedZip(() => openZip(Buffer.from(input.bytes)), input.manifest);
}

export async function verifyProductPhotoZipFile(input: { filePath: string; manifest: PhotoManifestAsset[] }) {
  return verifyOpenedZip(() => openZipFile(input.filePath), input.manifest);
}

async function verifyOpenedZip(open: () => Promise<ZipFile>, manifest: PhotoManifestAsset[]) {
  const zip = await open();
  const entries: VerifiedZipEntry[] = [];
  let extractedBytes = 0;
  try {
    await walkEntries(zip, async (entry) => {
      const path = normalizeZipPath(entry.fileName);
      if (!path || /\/$/.test(entry.fileName)) return;
      extractedBytes += entry.uncompressedSize;
      if (entries.length >= PRODUCT_IMPORT_LIMITS.maxEntries) throw new Error("Jumlah file ZIP melebihi batas.");
      if (extractedBytes > PRODUCT_IMPORT_LIMITS.maxExtractedBytes) throw new Error("Total hasil ekstraksi ZIP melebihi batas.");
      const kind = assetKind(path);
      if (kind === "IMAGE" && entry.uncompressedSize > PRODUCT_IMPORT_LIMITS.maxImageBytes) throw new Error(`Gambar terlalu besar: ${path}`);
      const mimeType = kind === "IMAGE" ? await sniffEntryMime(zip, entry) : null;
      if (kind === "IMAGE" && !mimeType) throw new Error(`Isi file gambar tidak valid: ${path}`);
      if (kind === "IMAGE" && mimeType && !extensionMatchesMime(path, mimeType)) throw new Error(`Ekstensi dan isi gambar tidak cocok: ${path}`);
      if (entries.some((value) => value.path.toLowerCase() === path.toLowerCase())) throw new Error(`Path ZIP duplikat: ${path}`);
      entries.push({ path, size: entry.uncompressedSize, mimeType, kind, entry });
    });
  } finally { zip.close(); }
  return compareZipToManifest(entries, manifest);
}

/** Reads only requested, already-verified images, one entry at a time. */
export async function forEachProductZipImage(input: { bytes: Uint8Array; requestedPaths: Set<string>; visit: (file: { manifestPath: string; zipPath: string; bytes: Uint8Array; mimeType: string }) => Promise<void> }) {
  return forEachOpenedZipImage(() => openZip(Buffer.from(input.bytes)), input);
}

export async function forEachProductZipImageFile(input: { filePath: string; requestedPaths: Set<string>; visit: (file: { manifestPath: string; zipPath: string; bytes: Uint8Array; mimeType: string }) => Promise<void> }) {
  return forEachOpenedZipImage(() => openZipFile(input.filePath), input);
}

async function forEachOpenedZipImage(open: () => Promise<ZipFile>, input: { requestedPaths: Set<string>; visit: (file: { manifestPath: string; zipPath: string; bytes: Uint8Array; mimeType: string }) => Promise<void> }) {
  const zip = await open(); const requested = [...input.requestedPaths].map((path) => normalizeLogicalPath(path));
  try { await walkEntries(zip, async (entry) => { const zipPath = normalizeZipPath(entry.fileName); if (!zipPath || /\/$/.test(entry.fileName) || assetKind(zipPath) !== "IMAGE") return; const candidates = requested.filter((path) => zipPath.toLowerCase() === path.toLowerCase() || zipPath.toLowerCase().endsWith(`/${path.toLowerCase()}`)); const manifestPath=candidates[0]; if (candidates.length !== 1 || !manifestPath) return; if (entry.uncompressedSize > PRODUCT_IMPORT_LIMITS.maxImageBytes) throw new Error(`Gambar terlalu besar: ${zipPath}`); const bytes = await readEntry(zip, entry, PRODUCT_IMPORT_LIMITS.maxImageBytes + 1); if (bytes.length !== entry.uncompressedSize) throw new Error(`Gambar ZIP tidak lengkap: ${zipPath}`); const mimeType = sniffMime(bytes); if (!mimeType) throw new Error(`Isi file gambar tidak valid: ${zipPath}`); await input.visit({ manifestPath, zipPath, bytes, mimeType }); }); } finally { zip.close(); }
}

function compareZipToManifest(entries: VerifiedZipEntry[], manifest: PhotoManifestAsset[]): ZipVerificationResult {
  const manifestImages = manifest.filter((asset) => asset.type === "IMAGE");
  const imageEntries = entries.filter((entry) => entry.kind === "IMAGE");
  const claimed = new Set<string>(); const items: ZipVerificationItem[] = [];
  for (const asset of manifestImages) {
    const expected = normalizeLogicalPath(asset.relativePath).toLowerCase();
    const candidates = imageEntries.filter((entry) => { const actual = entry.path.toLowerCase(); return actual === expected || actual.endsWith(`/${expected}`); });
    if (candidates.length > 1) throw new Error(`Path manifest ambigu di ZIP: ${asset.relativePath}`);
    const found = candidates[0];
    if (!found) { items.push({ path: asset.relativePath, status: "MISSING_FROM_ZIP", manifestSize: asset.length, zipSize: null, mimeType: null }); continue; }
    claimed.add(found.path.toLowerCase());
    const sizeMismatch = asset.length !== null && asset.length !== found.size;
    items.push({ path: asset.relativePath, status: sizeMismatch ? "SIZE_MISMATCH" : "FOUND", manifestSize: asset.length, zipSize: found.size, mimeType: found.mimeType });
  }
  for (const entry of imageEntries.filter((entry) => !claimed.has(entry.path.toLowerCase()))) items.push({ path: entry.path, status: "UNEXPECTED_ZIP_FILE", manifestSize: null, zipSize: entry.size, mimeType: entry.mimeType });
  for (const entry of entries.filter((entry) => entry.kind !== "IMAGE")) items.push({ path: entry.path, status: "IGNORED_NON_IMAGE", manifestSize: null, zipSize: entry.size, mimeType: null });
  const count = (status: ZipVerificationItem["status"]) => items.filter((item) => item.status === status).length;
  return { items, summary: { manifestImages: manifestImages.length, zipImages: imageEntries.length, matched: count("FOUND"), missing: count("MISSING_FROM_ZIP"), unexpected: count("UNEXPECTED_ZIP_FILE"), sizeMismatch: count("SIZE_MISMATCH"), glbIgnored: entries.filter((entry) => entry.kind === "GLB").length, videosIgnored: entries.filter((entry) => entry.kind === "VIDEO").length } };
}

export function normalizeProductImportZipPath(value: string) {
  if (value.includes("\\") || value.includes("\0") || /^[a-z]:/i.test(value) || value.startsWith("/")) throw new Error(`Path ZIP tidak aman: ${value}`);
  const parts = value.split("/").filter((part) => part && part !== ".");
  if (parts.some((part) => part === "..")) throw new Error(`Path ZIP tidak aman: ${value}`);
  return parts.join("/");
}
const normalizeZipPath = normalizeProductImportZipPath;
function normalizeLogicalPath(value: string) { return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter((part) => part && part !== ".").join("/"); }
function assetKind(path: string): VerifiedZipEntry["kind"] { const extension = path.split(".").at(-1)?.toLowerCase() ?? ""; if (PRODUCT_IMPORT_IMAGE_EXTENSIONS.has(extension)) return "IMAGE"; if (extension === "glb") return "GLB"; if (["mp4", "mov", "webm"].includes(extension)) return "VIDEO"; return "OTHER"; }
function sniffMime(bytes: Uint8Array) { if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"; if (bytes.length >= 8 && bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i])) return "image/png"; if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp"; return null; }
function extensionMatchesMime(path:string,mime:string){const extension=path.split(".").at(-1)?.toLowerCase();return mime==="image/jpeg"?["jpg","jpeg"].includes(extension??""):mime===`image/${extension}`;}
async function sniffEntryMime(zip: ZipFile, entry: Entry) { const bytes = await readEntry(zip, entry, 16); return sniffMime(bytes); }
function openZip(bytes: Buffer) { return new Promise<ZipFile>((resolve, reject) => yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true, decodeStrings: true }, (error, zip) => error || !zip ? reject(error ?? new Error("ZIP tidak valid.")) : resolve(zip))); }
function openZipFile(filePath: string) { return new Promise<ZipFile>((resolve, reject) => yauzl.open(filePath, { lazyEntries: true, validateEntrySizes: true, decodeStrings: true, autoClose: false }, (error, zip) => error || !zip ? reject(error ?? new Error("ZIP tidak valid.")) : resolve(zip))); }
function walkEntries(zip: ZipFile, visit: (entry: Entry) => Promise<void>) { return new Promise<void>((resolve, reject) => { let count = 0; zip.on("entry", (entry) => { count += 1; if (count > PRODUCT_IMPORT_LIMITS.maxEntries) { reject(new Error("Jumlah entry ZIP melebihi batas.")); return; } visit(entry).then(() => zip.readEntry(), reject); }); zip.once("end", resolve); zip.once("error", reject); zip.readEntry(); }); }
function readEntry(zip: ZipFile, entry: Entry, maxBytes: number) { return new Promise<Uint8Array>((resolve, reject) => zip.openReadStream(entry, (error, stream) => { if (error || !stream) { reject(error ?? new Error("Entry ZIP gagal dibaca.")); return; } const chunks: Buffer[] = []; let total = 0; stream.on("data", (chunk: Buffer) => { if (total < maxBytes) { const take = chunk.subarray(0, Math.max(0, maxBytes - total)); chunks.push(take); total += take.length; } }); stream.once("error", reject); stream.once("end", () => resolve(new Uint8Array(Buffer.concat(chunks)))); })); }
