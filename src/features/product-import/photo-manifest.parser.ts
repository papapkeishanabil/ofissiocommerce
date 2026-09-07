import Papa from "papaparse";
import { normalizePath } from "./product-import.normalization";
import type { ImportAssetType, PhotoManifestAsset } from "./product-import.types";

const IMAGE = new Set([".jpg", ".jpeg", ".png", ".webp"]);
function assetType(extension: string): ImportAssetType { if (IMAGE.has(extension)) return "IMAGE"; if (extension === ".glb") return "GLB"; if ([".mp4", ".mov", ".webm"].includes(extension)) return "VIDEO"; return "OTHER"; }
export function parsePhotoManifest(csv: string): PhotoManifestAsset[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim() });
  const fatalError = parsed.errors.find((error) => error.type !== "FieldMismatch");
  if (fatalError) throw new Error(`Manifest foto tidak valid: ${fatalError.message}`);
  const relativeKey = (parsed.meta.fields ?? []).find((field) => field.toLowerCase() === "relativepath");
  if (!relativeKey) throw new Error("Header manifest wajib tidak tersedia: RelativePath");
  return parsed.data.flatMap((row) => {
    const relativePath = normalizePath(row[relativeKey] ?? ""); if (!relativePath) return [];
    const segments = relativePath.split("/"); const name = (row.Name || segments.at(-1) || "").trim();
    const rawExt = (row.Extension || name.match(/\.[^.]+$/)?.[0] || "").trim().toLowerCase(); const extension = rawExt && !rawExt.startsWith(".") ? `.${rawExt}` : rawExt;
    return [{ relativePath, name, extension, length: Number.isFinite(Number(row.Length)) ? Number(row.Length) : null, directory: segments.slice(0, -1).join("/"), type: assetType(extension) }];
  });
}
