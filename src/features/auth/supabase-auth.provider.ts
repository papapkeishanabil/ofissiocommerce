import "server-only";

import { readSessionCookie } from "./auth.session";
import { getAuthRuntimeConfig } from "./auth.config";
import type {
  AuthProviderAdapter,
  AuthSession,
  AuthSessionHint,
} from "./auth.types";

export const supabaseAuthProvider: AuthProviderAdapter = {
  name: "supabase",

  getCurrentSession(
    request?: Request,
    _hint: AuthSessionHint = {},
  ): AuthSession | null {
    const config = getAuthRuntimeConfig();
    if (!config.supabase.isConfigured) return null;

    const cookieValue = readSessionCookie(request);
    if (!cookieValue) return null;

    // Phase 11 does not add a Supabase SDK or verify JWTs yet. This boundary
    // exists so the production auth implementation can be wired without
    // changing API call sites.
    return null;
  },

  signInPlaceholder() {
    throw new Error("Supabase sign-in belum diaktifkan pada Phase 11.");
  },

  signOutPlaceholder() {
    throw new Error("Supabase sign-out belum diaktifkan pada Phase 11.");
  },
};
