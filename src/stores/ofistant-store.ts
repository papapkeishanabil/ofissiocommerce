// src/stores/ofistant-store.ts
// Live chat store for Ofistant. Owns:
//  - conversation messages
//  - session context (industry, viewed products, journey stage, ...)
//  - typing indicator
//  - pending action awaiting user confirmation (e.g. ADD_TO_CART)
//
// The actual rule-based "brain" lives in lib/ofistant; this store is the
// reactive glue that turns responses into chat messages + dispatched actions.

"use client";

import { create } from "zustand";

import {
  applyResponse,
} from "@/lib/ofistant/ofistant.service";
import {
  REQUIRES_CONFIRMATION,
  type OfistantAction,
} from "@/lib/ofistant/ofistant.actions";
import {
  emptyContext,
  type ChatMessage,
  type OfistantContext,
  type OfistantResponse,
} from "@/lib/ofistant/ofistant.types";
import {
  withCatalogSearchVocabulary,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import type {
  PublicCatalogTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";

interface OfistantState {
  messages: ChatMessage[];
  historyOwner: string | null;
  conversationId: string;
  generation: number;
  historyNotice: string | null;
  context: OfistantContext;
  typing: boolean;
  quickReplies: string[];
  /** action attached to the most recent assistant message awaiting confirm */
  pendingAction: { messageId: string; action: OfistantAction } | null;
  hydrated: boolean;
  catalogTaxonomy: PublicCatalogTaxonomy | null;

  /** Bootstrap: push the welcome message once. */
  init: () => void;
  /** Send a user turn (text or quick reply). */
  sendUserTurn: (text: string, opts?: { viaQuickReply?: boolean }) => void;
  /** Internal emergency fallback when the chat route is unreachable. */
  runLocalFallback: (
    text: string,
    ctx: OfistantContext,
    cart: { itemCount: number; totalQty: number; totalEstimatedPrice: number },
  ) => Promise<void>;
  /** Internal: process an agent response into messages + state. */
  applyAssistant: (
    text: string,
    res: OfistantResponse,
  ) => void;
  /** Confirm and consume the pending action (returns it so UI dispatches). */
  confirmPendingAction: () => OfistantAction | null;
  /** Dismiss pending action (user cancelled). */
  dismissPendingAction: () => void;
  /** External callers can update context (e.g. when product page mounts). */
  setContext: (patch: Partial<OfistantContext>) => void;
  /** Reset the whole conversation. */
  reset: () => void;
}

function genMsgId(role: ChatMessage["role"]): string {
  return `${role}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

const WELCOME_TEXT =
  "Halo, selamat datang di Ofissio. Saya Ofistant, asisten pengadaan seragam perusahaan Anda. Seragam untuk industri apa yang sedang Anda cari?";

export const useOfistantStore = create<OfistantState>((set, get) => ({
  messages: [],
  historyOwner: null,
  conversationId: "",
  generation: 0,
  historyNotice: null,
  context: emptyContext(),
  typing: false,
  quickReplies: [],
  pendingAction: null,
  hydrated: false,
  catalogTaxonomy: null,

  init: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      messages: [
        {
          id: genMsgId("assistant"),
          role: "assistant",
          text: WELCOME_TEXT,
          ts: Date.now(),
        },
      ],
      quickReplies: [],
    });
    void fetch("/api/catalog/taxonomy")
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as {
          ok?: boolean;
          taxonomy?: PublicCatalogTaxonomy;
        };
        return payload.ok ? payload.taxonomy ?? null : null;
      })
      .then((taxonomy) => {
        if (taxonomy) {
          set({
            catalogTaxonomy: withCatalogSearchVocabulary(taxonomy),
          });
        }
      })
      .catch(() => undefined);
  },

  sendUserTurn: (text, opts) => {
    const trimmed = text.trim();
    if (!trimmed || get().typing || trimmed.length > 800) return;

    const state = get();
    const generation = state.generation;
    const conversationId = state.conversationId || crypto.randomUUID();
    const turnId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: genMsgId("user"),
      role: "user",
      text: trimmed,
      ts: Date.now(),
      viaQuickReply: opts?.viaQuickReply ? trimmed : undefined,
    };

    // Snapshot cart from the cart store lazily (avoid circular import).
    const cart = readCartSnapshot();

    set({
      messages: [...state.messages, userMsg],
      conversationId,
      typing: true,
      quickReplies: [],
      pendingAction: null,
    });

    // Short delay just to let the typing indicator paint; the network
    // round-trip provides the rest of the natural think time.
    const delay = 150;
    window.setTimeout(async () => {
      if (get().generation !== generation) return;
      const ctx = get().context;

      // Prior messages (excluding the current user turn just pushed), capped.
      const history = get().messages
        .slice(0, -1)
        .slice(-10)
        .map((m) => ({
          role: (m.role === "system" ? "assistant" : m.role) as
            | "user"
            | "assistant",
          text: m.text.slice(0, 2000),
        }));

      try {
        const resp = await fetch("/api/ofistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, context: ctx, cart, history, ...(state.historyOwner ? { conversationId, turnId } : {}) }),
        });
        if (!resp.ok) throw new Error(`http ${resp.status}`);
        const payload = (await resp.json()) as {
          ok?: boolean;
          result?: OfistantResponse;
          historySaved?: boolean;
        };
        if (!payload.ok || !payload.result) throw new Error("bad payload");
        if (get().generation !== generation) return;
        const res = payload.result;
        if (state.historyOwner && payload.historySaved !== true) set({ historyNotice: "Sebagian pesan belum tersimpan di riwayat. Percakapan lengkap masih tersedia selama halaman ini terbuka." });

        set({ context: applyResponse(ctx, res) });
        get().applyAssistant(res.message, res);
        return;
      } catch {
        // Emergency fallback: route unreachable (offline / dev server down).
        if (get().generation !== generation) return;
        if (state.historyOwner) set({ historyNotice: "Koneksi terputus. Pesan ini belum tersimpan di riwayat." });
        await get().runLocalFallback(trimmed, ctx, cart);
      }
    }, delay);
  },

  runLocalFallback: async () => {
    get().applyAssistant("Saya belum dapat memeriksa data sistem saat ini. Silakan coba lagi sebentar. Saya belum bisa memastikan produk, harga, atau tarif sebelum sistem berhasil diperiksa.", { message: "" });
  },

  applyAssistant: (text, res) => {
    const msgId = genMsgId("assistant");
    const needsConfirm =
      !!res.action && REQUIRES_CONFIRMATION.has(res.action.type);

    const assistantMsg: ChatMessage = {
      id: msgId,
      role: "assistant",
      text,
      ts: Date.now(),
      action: needsConfirm ? res.action : res.action,
      requiresConfirm: needsConfirm,
      products: res.products,
      moreProductsHref: res.moreProductsHref,
    };

    set((s) => ({
      messages: [...s.messages, assistantMsg],
      typing: false,
      quickReplies: res.quickReplies ?? [],
      pendingAction: needsConfirm
        ? { messageId: msgId, action: res.action! }
        : null,
    }));

    // Non-confirming actions are exposed for the dispatcher via subscription.
    // The UI hook reads `lastEmittedAction` indirectly through messages.
    if (!needsConfirm && res.action) {
      // Notify any listener by pushing to a transient field.
      set({ pendingAction: { messageId: msgId, action: res.action } });
      // immediately clear so it's a one-shot signal
      window.setTimeout(() => {
        if (get().pendingAction?.messageId === msgId) {
          set({ pendingAction: null });
        }
      }, 0);
    }
  },

  confirmPendingAction: () => {
    const pa = get().pendingAction;
    if (!pa) return null;
    if (!REQUIRES_CONFIRMATION.has(pa.action.type)) return null;
    set({ pendingAction: null });
    return pa.action;
  },

  dismissPendingAction: () => set({ pendingAction: null }),

  setContext: (patch) =>
    set((s) => ({ context: { ...s.context, ...patch } })),

  reset: () =>
    set({
      conversationId: crypto.randomUUID(),
      generation: get().generation + 1,
      historyNotice: null,
      messages: [
        {
          id: genMsgId("assistant"),
          role: "assistant",
          text: WELCOME_TEXT,
          ts: Date.now(),
        },
      ],
      context: emptyContext(),
      quickReplies: [],
      pendingAction: null,
      typing: false,
    }),
}));

// ---- Cart snapshot ----
// cart-store does NOT import ofistant-store, so this is a safe static import.
import { useCartStore } from "@/stores/cart-store";

function readCartSnapshot() {
  try {
    const items = useCartStore.getState().items;
    const itemCount = items.length;
    const totalQty = items.reduce((a, it) => a + it.totalQty, 0);
    const totalEstimatedPrice = items.reduce(
      (a, it) => a + it.estimatedPrice,
      0,
    );
    return { itemCount, totalQty, totalEstimatedPrice };
  } catch {
    return { itemCount: 0, totalQty: 0, totalEstimatedPrice: 0 };
  }
}
