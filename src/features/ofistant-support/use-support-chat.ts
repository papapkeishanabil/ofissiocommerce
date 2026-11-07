"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportConversation, SupportMessage, SupportResult } from "./support.types";
import { chatRequest, ChatRequestError } from "./support-request";

export function useSupportChat(conversationId: string, owner: string | null, staff = false) {
  const endpoint = staff ? "/api/admin/chats" : "/api/ofistant/support";
  const key = `${owner ?? ""}:${conversationId}:${staff}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const cursor = useRef(0);
  const [state, setState] = useState<{ key: string; conversation: SupportConversation | null; messages: SupportMessage[]; ready: boolean; error: string | null; authRequired: boolean }>({ key, conversation: null, messages: [], ready: false, error: null, authRequired: false });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const mutation = useRef(false);
  const reading = useRef<string | null>(null);
  const authBlocked = useRef(false);
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const version = useRef(0);
  const invalidate = useCallback(() => { version.current++; }, []);
  const retry = useRef<{ key: string; text: string; id: string } | null>(null);
  const accept = useCallback((result: SupportResult, requestKey: string) => {
    if (currentKey.current !== requestKey) return;
    cursor.current = Math.max(cursor.current, result.next);
    setState((old) => ({ key: requestKey, conversation: result.conversation, ready: !result.more, error: null, authRequired: false,
      messages: [...(old.key === requestKey ? old.messages : []), ...result.messages.filter((m) => old.key !== requestKey || !old.messages.some((x) => x.id === m.id))],
    }));
  }, []);
  const refresh = useCallback(async () => {
    if (!owner || !conversationId || mutation.current || reading.current === key) return;
    reading.current = key; setRefreshingKey(key);
    setState(old => old.key === key ? { ...old, error: null } : old);
    const requestVersion = version.current;
    try {
      let more = true;
      while (more && currentKey.current === key && version.current === requestVersion) {
        const result = await chatRequest(`${endpoint}?conversationId=${conversationId}&after=${cursor.current}`, undefined, staff ? undefined : owner);
        if (currentKey.current !== key || version.current !== requestVersion) return;
        authBlocked.current = false; accept(result, key); more = result.more;
      }
    } catch (error) {
      if (currentKey.current === key && version.current === requestVersion) {
        const denied = error instanceof ChatRequestError && [401,403].includes(error.status);
        if (denied) { cursor.current = 0; authBlocked.current = true; }
        setState(old => ({ ...old, ...(denied ? { conversation: null, messages: [], ready: false, authRequired: error instanceof ChatRequestError && error.status === 401 } : {}), error: (error as Error).message }));
      }
    } finally {
      if (reading.current === key) reading.current = null;
      setRefreshingKey(old => old === key ? null : old);
    }
  }, [accept, conversationId, endpoint, key, owner, staff]);
  useEffect(() => {
    cursor.current = 0; version.current++; mutation.current = false; authBlocked.current = false;
    setState({ key, conversation: null, messages: [], ready: !owner || !conversationId, error: null, authRequired: false });
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden && !authBlocked.current) await refresh();
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
      const result = await chatRequest(endpoint, { action, conversationId, after: cursor.current, ...(action === "send" ? { text, messageId: retry.current!.id } : {}) }, staff ? undefined : owner);
      if (currentKey.current !== key) return false;
      accept(result, key); retry.current = null;
      return true;
    } catch (error) {
      if (currentKey.current === key) {
        const denied = error instanceof ChatRequestError && [401,403].includes(error.status);
        if (denied) { cursor.current = 0; authBlocked.current = true; }
        setState(old => ({ ...old, ...(denied ? { conversation: null, messages: [], ready: false, authRequired: error instanceof ChatRequestError && error.status === 401 } : {}), error: (error as Error).message }));
      }
      return false;
    } finally {
      if (currentKey.current === key) { mutation.current = false; setBusyKey(null); }
    }
  }
  const visible = state.key === key ? state : { conversation: null, messages: [], ready: !owner || !conversationId, error: null, authRequired: false };
  return { ...visible, busy: busyKey === key, refreshing: refreshingKey === key, act, refresh, active: !!visible.conversation && visible.conversation.status !== "closed" };
}
