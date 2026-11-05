"use client";
import { create } from "zustand";
import { useOfistantStore } from "./ofistant-store";
import { emptyContext } from "@/lib/ofistant/ofistant.types";
import { historyMessageSchema, type ConversationPage, type ConversationSummary } from "@/features/ofistant-history/history.schema";

interface HistoryState {
  owner: string | null;
  conversations: ConversationSummary[];
  nextOffset: number | null;
  before: number | null;
  loading: boolean;
  error: string | null;
  syncAccount: (owner: string | null) => Promise<void>;
  refresh: (more?: boolean) => Promise<void>;
  open: (id: string, older?: boolean) => Promise<void>;
}
let requestVersion = 0;
async function load(query: string) {
  const response = await fetch(`/api/ofistant/history${query}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Riwayat belum dapat dimuat. Silakan coba lagi.");
  return (await response.json()).result;
}
export const useOfistantHistoryStore = create<HistoryState>((set, get) => ({
  owner: null, conversations: [], nextOffset: null, before: null, loading: false, error: null,
  syncAccount: async (owner) => {
    if (owner === get().owner) return;
    ++requestVersion;
    set({ owner, conversations: [], before: null, nextOffset: null, error: null, loading: false });
    useOfistantStore.getState().reset();
    useOfistantStore.setState({ historyOwner: owner });
    if (!owner) return;
    await get().refresh();
    const latest = get().conversations[0];
    if (get().owner === owner && !get().error && latest && useOfistantStore.getState().messages.length <= 1)
      await get().open(latest.id);
  },
  refresh: async (more = false) => {
    const owner = get().owner;
    if (!owner) return;
    const version = ++requestVersion;
    set({ loading: true, error: null });
    try {
      const result = await load(`?offset=${more ? get().nextOffset ?? 0 : 0}`) as { conversations: ConversationSummary[]; nextOffset: number | null };
      if (get().owner !== owner || version !== requestVersion) return;
      set({ conversations: more ? [...get().conversations, ...result.conversations.filter((row) => !get().conversations.some((old) => old.id === row.id))] : result.conversations, nextOffset: result.nextOffset, loading: false });
    } catch (error) {
      if (get().owner === owner && version === requestVersion) set({ loading: false, error: (error as Error).message });
    }
  },
  open: async (id, older = false) => {
    const owner = get().owner;
    if (!owner || useOfistantStore.getState().typing) return;
    const generation = useOfistantStore.getState().generation;
    const version = ++requestVersion;
    set({ loading: true, error: null });
    try {
      const result = await load(`?conversationId=${encodeURIComponent(id)}${older && get().before ? `&before=${get().before}` : ""}`) as ConversationPage;
      if (get().owner !== owner || version !== requestVersion || useOfistantStore.getState().generation !== generation) return;
      // Parsing strips actions/confirmation flags even if an old payload contains them.
      const messages = result.messages.map((message) => historyMessageSchema.parse(message));
      useOfistantStore.setState({
        conversationId: id,
        messages: older ? [...messages, ...useOfistantStore.getState().messages] : messages,
        context: older ? useOfistantStore.getState().context : emptyContext(),
        pendingAction: null, quickReplies: [], typing: false,
        generation: generation + 1, historyNotice: null,
      });
      set({ before: result.before, loading: false });
    } catch (error) {
      if (get().owner === owner && version === requestVersion) set({ loading: false, error: (error as Error).message });
    } finally {
      if (get().owner === owner && version === requestVersion) set({ loading: false });
    }
  },
}));
