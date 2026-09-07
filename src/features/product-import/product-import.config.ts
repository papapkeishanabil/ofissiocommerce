import path from "node:path";

const MB = 1024 * 1024;
export const DEFAULT_PRODUCT_IMPORT_MAX_ZIP_MB = 750;

function positiveEnvMb(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getProductImportLimits() {
  const maxZipMb = positiveEnvMb("PRODUCT_IMPORT_MAX_ZIP_MB", DEFAULT_PRODUCT_IMPORT_MAX_ZIP_MB);
  const chunkMb = positiveEnvMb("PRODUCT_IMPORT_CHUNK_MB", 16);
  return {
    ...PRODUCT_IMPORT_LIMITS,
    maxZipBytes: Math.floor(maxZipMb * MB),
    chunkBytes: Math.floor(chunkMb * MB),
  };
}

export function getProductImportStagingConfig() {
  const provider = process.env.PRODUCT_IMPORT_STAGING_PROVIDER?.trim().toLowerCase() || "local";
  if (provider !== "local") throw new Error(`Product import staging provider ${provider} belum tersedia.`);
  return {
    provider: "local" as const,
    directory: path.resolve(/* turbopackIgnore: true */ process.env.PRODUCT_IMPORT_STAGING_DIR?.trim() || path.join(process.cwd(), ".data", "product-imports")),
    retentionHours: positiveEnvMb("PRODUCT_IMPORT_STAGING_RETENTION_HOURS", 24),
    diskSafetyBytes: 256 * MB,
  };
}

export const PRODUCT_IMPORT_LIMITS = {
  maxCsvBytes: 15 * 1024 * 1024,
  maxZipBytes: DEFAULT_PRODUCT_IMPORT_MAX_ZIP_MB * MB,
  maxEntries: 2_000,
  maxExtractedBytes: 2 * 1024 * 1024 * 1024,
  maxImageBytes: 15 * 1024 * 1024,
  chunkBytes: 16 * MB,
} as const;

export const PRODUCT_IMPORT_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
