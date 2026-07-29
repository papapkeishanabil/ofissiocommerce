import "server-only";

import { getDatabaseRuntimeConfig } from "@/features/database/database.config";

import type { RepositoryProvider } from "./repository.types";

export function getRepositoryProvider(): RepositoryProvider {
  const provider = getDatabaseRuntimeConfig().provider;
  return provider === "supabase" ? "supabase" : "mock";
}

export function isDatabaseRepositoryEnabled() {
  return getRepositoryProvider() !== "mock";
}
