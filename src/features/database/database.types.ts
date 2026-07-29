export type DatabaseProvider = "mock" | "supabase" | "postgres";

export interface DatabaseRuntimeConfig {
  requestedProvider: DatabaseProvider;
  provider: DatabaseProvider;
  isConfigured: boolean;
  databaseUrl: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    isConfigured: boolean;
  };
}

export interface DatabaseHealth {
  ok: boolean;
  provider: DatabaseProvider;
  requestedProvider: DatabaseProvider;
  status: "mock" | "connected" | "unavailable";
  schemaStatus: "ready" | "schema_missing" | "unavailable" | "skipped";
  missingTables: string[];
  configured: boolean;
  message: string;
  checkedAt: string;
}

export interface SupabaseQueryOptions {
  select?: string;
  filters?: Record<string, string | number | boolean | null>;
  order?: string;
  limit?: number;
}

export type SupabaseDatabaseErrorReason =
  | "invalid_key"
  | "invalid_url"
  | "relation_does_not_exist"
  | "permission_denied"
  | "rls_denied"
  | "network_error"
  | "query_error";

export interface SupabaseSchemaCheckResult {
  ok: boolean;
  status: "ready" | "schema_missing";
  checkedTables: string[];
  missingTables: string[];
}
