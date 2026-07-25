// src/hooks/use-gated-action.ts
// Central helper for actions that require login (checkout, request quote,
// save config, repeat order). If unauthenticated, opens the auth modal and
// remembers the intent — so after successful login the action can resume.

"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useUIStore, type AuthIntent } from "@/stores/ui-store";

export function useGatedAction() {
  const isAuthenticated = useAuthStore((s) => !!s.session);
  const openAuth = useUIStore((s) => s.openAuth);

  /**
   * Returns true if the user is authenticated and the action may proceed
   * synchronously. Returns false and opens the auth modal with the given
   * intent if not.
   */
  function attempt(intent: AuthIntent["kind"]): boolean {
    if (isAuthenticated) return true;
    openAuth({ kind: intent } as AuthIntent);
    return false;
  }

  return { attempt };
}
