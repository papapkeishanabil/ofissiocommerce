import "server-only";

import type { StorageProvider, StorageRuntimeConfig } from "./storage.types";

const DEFAULTS = {
  provider: "mock" satisfies StorageProvider,
  buckets: {
    logos: "ofissio-logos",
    artwork: "ofissio-artwork",
    documents: "ofissio-documents",
    "3d": "ofissio-3d-models",
  },
  signedUrlExpiresSeconds: 3600,
  maxUploadMb: {
    logo: 10,
    document: 20,
    glb: 100,
  },
};

function normalizeProvider(value?: string): StorageProvider {
  if (value === "supabase" || value === "s3" || value === "mock") return value;
  return "mock";
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getStorageRuntimeConfig(): StorageRuntimeConfig {
  const requestedProvider = normalizeProvider(process.env.STORAGE_PROVIDER);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const provider =
    requestedProvider === "supabase" && !supabaseConfigured
      ? "mock"
      : requestedProvider;

  return {
    requestedProvider,
    provider,
    buckets: {
      logos: process.env.STORAGE_BUCKET_LOGOS?.trim() || DEFAULTS.buckets.logos,
      artwork:
        process.env.STORAGE_BUCKET_ARTWORK?.trim() || DEFAULTS.buckets.artwork,
      documents:
        process.env.STORAGE_BUCKET_DOCUMENTS?.trim() ||
        DEFAULTS.buckets.documents,
      "3d": process.env.STORAGE_BUCKET_3D?.trim() || DEFAULTS.buckets["3d"],
    },
    signedUrlExpiresSeconds: envNumber(
      "STORAGE_SIGNED_URL_EXPIRES_SECONDS",
      DEFAULTS.signedUrlExpiresSeconds,
    ),
    maxUploadMb: {
      logo: envNumber("MAX_LOGO_UPLOAD_MB", DEFAULTS.maxUploadMb.logo),
      document: envNumber(
        "MAX_DOCUMENT_UPLOAD_MB",
        DEFAULTS.maxUploadMb.document,
      ),
      glb: envNumber("MAX_GLB_UPLOAD_MB", DEFAULTS.maxUploadMb.glb),
    },
    supabaseConfigured,
  };
}
