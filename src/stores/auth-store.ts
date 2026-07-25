// src/stores/auth-store.ts
// Reactive auth session store (client). Mirrors the mock auth-service so
// components can subscribe to login/logout/profile updates.

"use client";

import { create } from "zustand";

import type { AuthSession } from "@/types/account";
import {
  login as svcLogin,
  register as svcRegister,
  logout as svcLogout,
  getSession,
  refreshSession,
} from "@/lib/auth/auth-service";

interface AuthState {
  session: AuthSession | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => { ok: boolean; reason?: string };
  register: (input: {
    fullName: string;
    email: string;
    whatsapp: string;
    password: string;
  }) => { ok: boolean; reason?: string };
  logout: () => void;
  refresh: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  hydrate: () => set({ session: getSession(), hydrated: true }),

  login: (email, password) => {
    const r = svcLogin({ email, password });
    if (r.ok && r.session) {
      set({ session: r.session });
      return { ok: true };
    }
    return { ok: false, reason: r.reason };
  },

  register: (input) => {
    const r = svcRegister(input);
    if (r.ok && r.session) {
      set({ session: r.session });
      return { ok: true };
    }
    return { ok: false, reason: r.reason };
  },

  logout: () => {
    svcLogout();
    set({ session: null });
  },

  refresh: () => {
    set({ session: refreshSession() });
  },
}));
