import "server-only";

import { getDatabaseRuntimeConfig } from "@/features/database/database.config";

import type { RepositoryProvider } from "./repository.types";

export function getRepositoryProvider(): RepositoryProvider {
  return getDatabaseRuntimeConfig().provider;
}

export function isDatabaseRepositoryEnabled() {
  return getRepositoryProvider() !== "mock";
}
