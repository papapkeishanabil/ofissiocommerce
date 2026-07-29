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
  configured: boolean;
  message: string;
  checkedAt: string;
}
