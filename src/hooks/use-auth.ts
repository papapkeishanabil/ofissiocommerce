// src/hooks/use-auth.ts

"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return {
    session,
    hydrated,
    isAuthenticated: !!session,
    isProfileComplete: !!session && isProfileCompleteHelper(session),
    login,
    register,
    logout,
    refresh,
  };
}

// Local helper to avoid importing account fn everywhere.
function isProfileCompleteHelper(s: { company: import("@/types/account").Company }) {
  const c = s.company;
  return (
    !!c.companyName &&
    !!c.industry &&
    c.employeeCount > 0 &&
    !!c.phone &&
    !!c.picName &&
    !!c.picEmail &&
    !!c.picWhatsapp &&
    !!c.profileCompletedAt &&
    c.addresses.some((a) => a.isDefaultShipping)
  );
}
