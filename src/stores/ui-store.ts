// src/stores/ui-store.ts
// Cross-cutting UI state: auth modal trigger with a "post-auth intent" so the
// app can route to checkout/quote/save-config after a successful login.

"use client";

import { create } from "zustand";
import { rememberConfigurationLogin } from "@/features/auth/configuration-continuation";

export type AuthIntent =
  | { kind: "checkout" }
  | { kind: "request_quote"; returnTo?: string }
  | { kind: "save_configuration"; returnTo?: string }
  | { kind: "repeat_order" }
  | { kind: "none" };

interface UIState {
  authModalOpen: boolean;
  cartDrawerOpen: boolean;
  authIntent: AuthIntent;
  authMode: "login" | "register";
  openAuth: (intent?: AuthIntent, mode?: "login" | "register") => void;
  closeAuth: () => void;
  setCartDrawerOpen: (open: boolean) => void;
  setAuthMode: (m: "login" | "register") => void;
  consumeIntent: () => AuthIntent;
}

export const useUIStore = create<UIState>((set, get) => ({
  authModalOpen: false,
  cartDrawerOpen: false,
  authIntent: { kind: "none" },
  authMode: "login",
  openAuth: (intent = { kind: "none" }, mode = "login") => {
    const productLogin=typeof window!=="undefined" && window.location.pathname.startsWith("/product/") && intent.kind==="none";
    const nextIntent:AuthIntent=productLogin ? {kind:"save_configuration"} : {...intent};
    if(nextIntent.kind==="save_configuration") nextIntent.returnTo=rememberConfigurationLogin() ?? nextIntent.returnTo;
    set({ authModalOpen: true, authIntent: nextIntent, authMode: mode });
  },
  closeAuth: () =>
    set({ authModalOpen: false, authIntent: { kind: "none" } }),
  setCartDrawerOpen: (cartDrawerOpen) => set({ cartDrawerOpen }),
  setAuthMode: (m) => set({ authMode: m }),
  consumeIntent: () => {
    const i = get().authIntent;
    set({ authIntent: { kind: "none" } });
    return i;
  },
}));
