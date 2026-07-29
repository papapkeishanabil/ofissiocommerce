import "server-only";

import type { StorageObjectProvider } from "../storage.types";

async function unavailable(): Promise<never> {
  throw new Error(
    "Supabase Storage provider masih boundary Phase 12; aktifkan env dan implementasi SDK server-side sebelum staging live.",
  );
}

export const supabaseStorageProvider: StorageObjectProvider = {
  name: "supabase",
  uploadObject: unavailable,
  getSignedUrl: unavailable,
  deleteObject: unavailable,
};
