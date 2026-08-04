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
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; reason?: string; internal?: boolean }>;
  register: (input: {
    fullName: string;
    email: string;
    whatsapp: string;
    password: string;
  }) => Promise<{ ok: boolean; reason?: string; requiresEmailVerification?: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as {
        provider?: string;
        session?: { kind?: string; session?: AuthSession } | null;
      };
      if (payload.provider === "supabase") {
        const customerSession =
          payload.session?.kind === "customer" ? payload.session.session ?? null : null;
        set({ session: customerSession, hydrated: true });
        return;
      }
      if (payload.provider === "mock") {
        set({ session: getSession(), hydrated: true });
        return;
      }
    } catch {
      set({ session: null, hydrated: true });
      return;
    }
    set({ session: null, hydrated: true });
  },

  login: async (email, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        code?: string;
        message?: string;
        kind?: string;
        session?: AuthSession;
      };
      if (response.ok && payload.kind === "customer" && payload.session) {
        set({ session: payload.session, hydrated: true });
        return { ok: true };
      }
      if (response.ok && payload.kind === "internal") {
        return { ok: true, internal: true };
      }
      if (payload.code !== "MOCK_AUTH_CLIENT") {
        return { ok: false, reason: payload.message ?? "Login gagal." };
      }
    } catch {
      return { ok: false, reason: "Layanan login belum dapat dihubungi." };
    }
    const r = svcLogin({ email, password });
    if (r.ok && r.session) {
      set({ session: r.session, hydrated: true });
      return { ok: true };
    }
    return { ok: false, reason: r.reason };
  },

  register: async (input) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        code?: string;
        message?: string;
        kind?: string;
        session?: AuthSession;
        requiresEmailVerification?: boolean;
      };
      if (response.ok && payload.requiresEmailVerification) {
        return { ok: true, requiresEmailVerification: true };
      }
      if (response.ok && payload.kind === "customer" && payload.session) {
        set({ session: payload.session, hydrated: true });
        return { ok: true };
      }
      if (payload.code !== "MOCK_AUTH_CLIENT") {
        return { ok: false, reason: payload.message ?? "Pendaftaran gagal." };
      }
    } catch {
      return { ok: false, reason: "Layanan pendaftaran belum dapat dihubungi." };
    }
    const r = svcRegister(input);
    if (r.ok && r.session) {
      set({ session: r.session });
      return { ok: true };
    }
    return { ok: false, reason: r.reason };
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    svcLogout();
    set({ session: null });
  },

  refresh: async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as {
        provider?: string;
        session?: { kind?: string; session?: AuthSession } | null;
      };
      if (payload.provider === "supabase") {
        set({
          session:
            payload.session?.kind === "customer" ? payload.session.session ?? null : null,
        });
        return;
      }
      if (payload.provider === "mock") {
        set({ session: refreshSession() });
        return;
      }
    } catch {
      set({ session: null });
      return;
    }
    set({ session: null });
  },
}));
