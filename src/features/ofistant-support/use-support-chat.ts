"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportConversation, SupportMessage, SupportResult } from "./support.types";
class ChatRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function chatRequest(url: string, payload?: Record<string, unknown>): Promise<SupportResult> {
  const response = await fetch(url, {
    method: payload ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
    ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
  });
  const body = await response.json();
  if (!response.ok) throw new ChatRequestError(response.status === 401 ? "Sesi sudah berakhir atau berganti akun. Silakan masuk kembali." : body.message || "Chat belum dapat dimuat. Coba lagi.", response.status);
  return body.result;
}

export function useSupportChat(conversationId: string, owner: string | null, staff = false) {
  const endpoint = staff ? "/api/admin/chats" : "/api/ofistant/support";
  const key = `${owner ?? ""}:${conversationId}:${staff}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const cursor = useRef(0);
  const [state, setState] = useState<{ key: string; conversation: SupportConversation | null; messages: SupportMessage[]; ready: boolean; error: string | null }>({ key, conversation: null, messages: [], ready: false, error: null });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const mutation = useRef(false);
  const version = useRef(0);
  const invalidate = useCallback(() => { version.current++; }, []);
  const retry = useRef<{ key: string; text: string; id: string } | null>(null);
  const accept = useCallback((result: SupportResult, requestKey: string) => {
    if (currentKey.current !== requestKey) return;
    cursor.current = Math.max(cursor.current, result.next);
    setState((old) => ({ key: requestKey, conversation: result.conversation, ready: !result.more, error: null,
      messages: [...(old.key === requestKey ? old.messages : []), ...result.messages.filter((m) => old.key !== requestKey || !old.messages.some((x) => x.id === m.id))],
    }));
  }, []);
  const refresh = useCallback(async () => {
    if (!owner || !conversationId || mutation.current) return;
    const requestVersion = version.current;
    try {
      let more = true;
      while (more && currentKey.current === key && version.current === requestVersion) {
        const result = await chatRequest(`${endpoint}?conversationId=${conversationId}&after=${cursor.current}`);
        if (currentKey.current !== key || version.current !== requestVersion) return;
        accept(result, key); more = result.more;
      }
    } catch (error) {
      if (currentKey.current === key && version.current === requestVersion) setState((old) => ({ ...old, ...(error instanceof ChatRequestError && [401,403].includes(error.status) ? { conversation: null, messages: [], ready: false } : {}), error: (error as Error).message }));
    }
  }, [accept, conversationId, endpoint, key, owner]);
  useEffect(() => {
    cursor.current = 0; version.current++; mutation.current = false;
    setState({ key, conversation: null, messages: [], ready: !owner || !conversationId, error: null });
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) await refresh();
      if (!stopped) timer = setTimeout(poll, 3500);
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); invalidate(); };
  }, [key, owner, conversationId, refresh, invalidate]);
  async function act(action: "start" | "send" | "claim" | "close", text?: string) {
    if (mutation.current || !owner || !conversationId) return false;
    mutation.current = true; version.current++; setBusyKey(key);
    if (action === "send" && (!retry.current || retry.current.key !== key || retry.current.text !== text)) retry.current = { key, text: text!, id: crypto.randomUUID() };
    try {
      const result = await chatRequest(endpoint, { action, conversationId, after: cursor.current, ...(action === "send" ? { text, messageId: retry.current!.id } : {}) });
      if (currentKey.current !== key) return false;
      accept(result, key); retry.current = null;
      return true;
    } catch (error) {
      if (currentKey.current === key) setState((old) => ({ ...old, ...(error instanceof ChatRequestError && [401,403].includes(error.status) ? { conversation: null, messages: [], ready: false } : {}), error: (error as Error).message }));
      return false;
    } finally {
      if (currentKey.current === key) { mutation.current = false; setBusyKey(null); }
    }
  }
  const visible = state.key === key ? state : { conversation: null, messages: [], ready: !owner || !conversationId, error: null };
  return { ...visible, busy: busyKey === key, act, refresh, active: !!visible.conversation && visible.conversation.status !== "closed" };
}
