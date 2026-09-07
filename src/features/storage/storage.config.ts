import "server-only";

import { assertNoPublicSecretEnv } from "@/lib/security/server-only-secret";

import type { StorageProvider, StorageRuntimeConfig } from "./storage.types";

const DEFAULTS = {
  provider: "mock" satisfies StorageProvider,
  buckets: {
    logos: "ofissio-logos",
    artwork: "ofissio-artwork",
    documents: "ofissio-documents",
    "3d": "ofissio-3d-models",
    product_imports: "ofissio-product-imports",
    site_videos: "ofissio-site-videos",
  },
  signedUrlExpiresSeconds: 3600,
  maxUploadMb: {
    logo: 10,
    document: 20,
    glb: 100,
    video: 50,
  },
};

const DEFAULT_SUPABASE_STORAGE_MAX_FILE_MB = 50;

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
  assertNoPublicSecretEnv(["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]);

  const requestedProvider = normalizeProvider(process.env.STORAGE_PROVIDER);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const provider =
    requestedProvider === "supabase" && !supabaseConfigured
      ? "mock"
      : requestedProvider;
  const configuredGlbMaxMb = envNumber(
    "MAX_GLB_UPLOAD_MB",
    DEFAULTS.maxUploadMb.glb,
  );
  const providerGlbMaxMb =
    provider === "supabase"
      ? envNumber(
          "SUPABASE_STORAGE_MAX_FILE_MB",
          DEFAULT_SUPABASE_STORAGE_MAX_FILE_MB,
        )
      : configuredGlbMaxMb;
  const configuredVideoMaxMb = envNumber(
    "MAX_SITE_VIDEO_UPLOAD_MB",
    DEFAULTS.maxUploadMb.video,
  );
  const providerVideoMaxMb =
    provider === "supabase"
      ? envNumber(
          "SUPABASE_STORAGE_MAX_FILE_MB",
          DEFAULT_SUPABASE_STORAGE_MAX_FILE_MB,
        )
      : configuredVideoMaxMb;

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
      product_imports: process.env.STORAGE_BUCKET_PRODUCT_IMPORTS?.trim() || DEFAULTS.buckets.product_imports,
      site_videos:
        process.env.STORAGE_BUCKET_SITE_VIDEOS?.trim() ||
        DEFAULTS.buckets.site_videos,
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
      // The application limit must never advertise more than the active
      // provider accepts. Supabase Free projects cap a single file at 50 MB;
      // paid projects can override SUPABASE_STORAGE_MAX_FILE_MB.
      glb: Math.min(configuredGlbMaxMb, providerGlbMaxMb),
      video: Math.min(configuredVideoMaxMb, providerVideoMaxMb),
    },
    supabaseConfigured,
  };
}
