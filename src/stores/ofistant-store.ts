// src/stores/ofistant-store.ts
// Lightweight placeholder state for Ofistant. Phase 7 will replace this
// with a real LLM-driven message store + tool-calling action bus.

import { create } from "zustand";

export type OfistantView =
  | { kind: "welcome" }
  | { kind: "post-add"; productName: string; lineId: string };

interface OfistantState {
  view: OfistantView;
  selectedIndustry: string | null;
  showPostAdd: (productName: string, lineId: string) => void;
  resetToWelcome: () => void;
  selectIndustry: (industry: string) => void;
}

export const useOfistantStore = create<OfistantState>((set) => ({
  view: { kind: "welcome" },
  selectedIndustry: null,
  showPostAdd: (productName, lineId) =>
    set({ view: { kind: "post-add", productName, lineId } }),
  resetToWelcome: () => set({ view: { kind: "welcome" } }),
  selectIndustry: (industry) => set({ selectedIndustry: industry }),
}));
