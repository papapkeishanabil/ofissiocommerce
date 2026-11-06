import "server-only";
import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import type { AuthSession } from "@/features/auth/auth.types";
import { createApiError } from "@/lib/security/safe-error-response";
import type { ConversationPage, ConversationSummary, HistoryMessage } from "./history.schema";

type Stored = ConversationSummary & { userId: string; companyId: string; messages: HistoryMessage[]; turns: Set<string> };
const memory = globalThis as typeof globalThis & { __ofistantHistory?: Map<string, Stored> };
const missing = () => createApiError("NOT_FOUND", "Percakapan tidak ditemukan.", 404);

export function requireHistoryEnabled() {
  if (process.env.OFISTANT_HISTORY_ENABLED !== "true")
    throw createApiError("PROVIDER_UNAVAILABLE", "Riwayat percakapan belum tersedia.", 503);
}

export async function historyCommand(
  session: Pick<AuthSession, "userId" | "companyId">,
  action: "list" | "read" | "append",
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  requireHistoryEnabled();
  const config = getDatabaseRuntimeConfig();
  // A misconfigured persistent provider must never silently fall back to memory.
  if (config.requestedProvider !== "mock") {
    if (config.provider !== "supabase" || !config.isConfigured)
      throw createApiError("PROVIDER_UNAVAILABLE");
    const response = await fetch(new URL("/rest/v1/rpc/ofistant_history_command", config.supabase.url), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { apikey: config.supabase.serviceRoleKey, Authorization: `Bearer ${config.supabase.serviceRoleKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: session.userId, p_company_id: session.companyId, p_action: action, p_payload: payload }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (body?.message === "SUPPORT_ACTIVE") throw createApiError("BAD_REQUEST", "Percakapan sedang diteruskan ke tim Ofissio.", 409);
      if (body?.message === "HISTORY_NOT_FOUND") throw missing();
      throw createApiError("PROVIDER_UNAVAILABLE", "Riwayat percakapan belum dapat disimpan atau dimuat.", 503);
    }
    return body;
  }
  if (process.env.NODE_ENV === "production") throw createApiError("PROVIDER_UNAVAILABLE");
  const store = memory.__ofistantHistory ??= new Map();
  const owned = (item: Stored) => item.userId === session.userId && item.companyId === session.companyId;
  if (action === "list") {
    const offset = Number(payload.offset ?? 0);
    const all = [...store.values()].filter(owned).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { conversations: all.slice(offset, offset + 20).map(({ id, title, updatedAt }) => ({ id, title, updatedAt })), nextOffset: all.length > offset + 20 ? offset + 20 : null };
  }
  const id = String(payload.conversationId);
  let item = store.get(id);
  if (item && !owned(item)) throw missing();
  if (action === "append") {
    if (!item) {
      item = { id, title: String(payload.title), userId: session.userId, companyId: session.companyId, updatedAt: new Date().toISOString(), messages: [], turns: new Set() };
      store.set(id, item);
    }
    const turnId = String(payload.turnId);
    if (!item.turns.has(turnId)) {
      item.messages.push(...structuredClone(payload.messages as HistoryMessage[]));
      item.turns.add(turnId);
      item.updatedAt = new Date().toISOString();
    }
    return { saved: true };
  }
  if (!item) throw missing();
  const before = Number(payload.before ?? Number.MAX_SAFE_INTEGER);
  const end = Math.min(item.messages.length, before);
  const start = Math.max(0, end - 40);
  return { messages: structuredClone(item.messages.slice(start, end)), before: start > 0 ? start : null } satisfies ConversationPage;
}

export async function listConversations(session: AuthSession, offset = 0) {
  return await historyCommand(session, "list", { offset }) as { conversations: ConversationSummary[]; nextOffset: number | null };
}
