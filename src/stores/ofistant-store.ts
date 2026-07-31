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
  respond,
} from "@/lib/ofistant/ofistant.service";
import {
  REQUIRES_CONFIRMATION,
  type OfistantAction,
} from "@/lib/ofistant/ofistant.actions";
import {
  emptyContext,
  type ChatMessage,
  type OfistantContext,
} from "@/lib/ofistant/ofistant.types";
import {
  withCatalogSearchVocabulary,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import type {
  CatalogSearchResult,
  PublicCatalogTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import { detectIntent } from "@/lib/ofistant/ofistant.intent";

interface OfistantState {
  messages: ChatMessage[];
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
  /** Internal: process an agent response into messages + state. */
  applyAssistant: (text: string, res: import("@/lib/ofistant/ofistant.types").OfistantResponse) => void;
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

const WELCOME_QUICK_REPLIES = [
  "Pertambangan",
  "Konstruksi",
  "Manufaktur",
  "Perhotelan",
  "Kesehatan",
  "F&B",
  "Security",
  "Corporate",
];

export const useOfistantStore = create<OfistantState>((set, get) => ({
  messages: [],
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
      quickReplies: WELCOME_QUICK_REPLIES,
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
    if (!trimmed) return;

    const state = get();
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
      typing: true,
      quickReplies: [],
      pendingAction: null,
    });

    // Small artificial think delay for natural feel + to show the typing UI.
    const delay = 380 + Math.min(800, trimmed.length * 8);
    window.setTimeout(async () => {
      const ctx = get().context;
      const taxonomy = get().catalogTaxonomy;
      const detected = detectIntent(trimmed, taxonomy ?? undefined);
      let catalogSearchResult: CatalogSearchResult | null = null;
      if (
        detected.intent === "SEARCH_CATALOG" ||
        detected.intent === "SELECT_INDUSTRY" ||
        detected.intent === "ASK_QUANTITY_PRICE" ||
        detected.intent === "ASK_EMBROIDERY_PRICE"
      ) {
        const pricingSearchQuery = detected.intent === "ASK_QUANTITY_PRICE" || detected.intent === "ASK_EMBROIDERY_PRICE"
          ? [detected.category, detected.industry].filter(Boolean).join(" ") || ctx.selectedProductSlug || trimmed
          : trimmed;
        catalogSearchResult = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(pricingSearchQuery)}`,
        )
          .then(async (response) => {
            if (!response.ok) return null;
            const payload = (await response.json()) as {
              ok?: boolean;
              result?: CatalogSearchResult;
            };
            return payload.ok ? payload.result ?? null : null;
          })
          .catch(() => null);
      }
      const res = respond({
        text: trimmed,
        ctx,
        cart,
        taxonomy,
        catalogSearchResult,
      });

      // Apply context patch first so the assistant message reflects the
      // fresh state.
      const nextCtx = applyResponse(ctx, res);
      set({ context: nextCtx });

      get().applyAssistant(res.message, res);
    }, delay);
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
      messages: [
        {
          id: genMsgId("assistant"),
          role: "assistant",
          text: WELCOME_TEXT,
          ts: Date.now(),
        },
      ],
      context: emptyContext(),
      quickReplies: WELCOME_QUICK_REPLIES,
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
