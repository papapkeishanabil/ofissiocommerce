import type { AuthMode, AuthProvider } from "./auth.types";

export function isProductionAuthSafe(input: {
  mode: AuthMode;
  provider: AuthProvider;
  supabaseConfigured: boolean;
}) {
  if (input.mode !== "production") return true;
  return input.provider === "supabase" && input.supabaseConfigured;
}

export function canUseDevelopmentIdentityHeaders(input: {
  mode: AuthMode;
  enabled: boolean;
}) {
  return input.mode === "development" && input.enabled;
}

export function canUseAdminDevelopmentBypass(input: {
  mode: AuthMode;
  enabled: boolean;
}) {
  return input.mode === "development" && input.enabled;
}
