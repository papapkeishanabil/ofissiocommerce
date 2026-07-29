import "server-only";

import type { StorageObjectProvider } from "../storage.types";

async function unavailable(): Promise<never> {
  throw new Error(
    "S3/R2 Storage provider masih boundary Phase 12; belum ada SDK atau credential live.",
  );
}

export const s3StorageProvider: StorageObjectProvider = {
  name: "s3",
  uploadObject: unavailable,
  getSignedUrl: unavailable,
  deleteObject: unavailable,
};
