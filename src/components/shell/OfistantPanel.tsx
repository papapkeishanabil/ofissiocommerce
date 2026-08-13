"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Headset, RotateCcw, Sparkles, X } from "lucide-react";

import { useOfistantStore } from "@/stores/ofistant-store";
import { useOfistantAction } from "@/hooks/use-ofistant-action";
import { useOfistantPageContext } from "@/hooks/use-ofistant-page-context";
import { Button } from "@/components/ui/Button";
import { ChatComposer } from "@/components/ofistant/ChatComposer";
import { ChatMessageView } from "@/components/ofistant/ChatMessageView";
import { QuickReplies } from "@/components/ofistant/QuickReplies";
import { TypingIndicator } from "@/components/ofistant/TypingIndicator";

interface OfistantPanelProps { onClose?: () => void; }

export function OfistantPanel({ onClose }: OfistantPanelProps) {
  const messages = useOfistantStore((s) => s.messages);
  const typing = useOfistantStore((s) => s.typing);
  const quickReplies = useOfistantStore((s) => s.quickReplies);
  const pendingAction = useOfistantStore((s) => s.pendingAction);
  const init = useOfistantStore((s) => s.init);
  const sendUserTurn = useOfistantStore((s) => s.sendUserTurn);
  const confirmPendingAction = useOfistantStore((s) => s.confirmPendingAction);
  const dismissPendingAction = useOfistantStore((s) => s.dismissPendingAction);
  const reset = useOfistantStore((s) => s.reset);
  const hydrated = useOfistantStore((s) => s.hydrated);
  const { dispatch } = useOfistantAction();
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep Ofistant aware of the page the customer is viewing + their cart
  // breakdown, so it can answer questions about what is on screen.
  useOfistantPageContext();

  useEffect(() => { init(); }, [init]);
  useLayoutEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, typing, pendingAction]);

  function handleSend(text: string) { sendUserTurn(text); }
  function handleQuickReply(text: string) { sendUserTurn(text, { viaQuickReply: true }); }
  async function handleConfirm() {
    const action = confirmPendingAction();
    if (!action) return;
    setBusy(true);
    dispatch(action);
    setTimeout(() => setBusy(false), 350);
    useOfistantStore.setState((s) => ({ messages: [...s.messages, { id: `assistant-confirm-${Date.now()}`, role: "assistant" as const, text: action.type === "ADD_TO_CART" ? "Berhasil ditambahkan ke keranjang. Mau lanjut mencari produk pelengkap, atau langsung ke keranjang?" : "Selesai.", ts: Date.now() }], quickReplies: action.type === "ADD_TO_CART" ? ["Lanjut eksplor produk", "Lihat keranjang", "Checkout"] : [] }));
  }
  function handleCancel() {
    dismissPendingAction();
    useOfistantStore.setState((s) => ({ messages: [...s.messages, { id: `assistant-cancel-${Date.now()}`, role: "assistant" as const, text: "Baik, saya batalkan. Beri tahu saya jika ada yang ingin disesuaikan.", ts: Date.now() }] }));
  }
  function handleHumanHandoff() { sendUserTurn("Hubungi sales"); }

  const lastPendingMsgId = pendingAction?.messageId ?? null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-surface-muted text-ink">
      {/* Header — light corporate */}
      <header className="relative flex h-14 items-center justify-between border-b border-line bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white shadow-soft-sm">
              <Sparkles className="h-5 w-5 text-ochre-300" strokeWidth={2.2} />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[15px] font-bold leading-tight text-ink-strong">
              Ofistant
              <span className="rounded bg-brand-50 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-brand-700">AI</span>
            </p>
            <p className="flex items-center gap-1 text-[10px] text-ink-subtle">
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
              Online · Asisten pengadaan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={reset} disabled={!hydrated || messages.length <= 1} aria-label="Mulai percakapan baru" title="Mulai percakapan baru" className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted disabled:opacity-30">
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Tutup Ofistant" className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted lg:hidden">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages — conversation-first. The greeting lives in messages[0] as a
          normal assistant bubble (no separate welcome card, no industry grid),
          so the panel reads as a chat from the very first frame. The composer
          below is the hero; the industry is inferred from whatever the user
          types — the same code path the old picker chips took, minus the
          directory wall that made this feel like anything but a chat. Contextual
          quick-replies still surface after each assistant turn. */}
      <div ref={scrollRef} className="relative flex-1 space-y-4 overflow-y-auto bg-surface-muted px-4 py-4" aria-live="polite">
        {messages.map((m) => (
          <ChatMessageView key={m.id} message={m} isPendingConfirm={!!pendingAction && lastPendingMsgId === m.id && !!m.requiresConfirm} onConfirm={handleConfirm} onCancel={handleCancel} busy={busy} />
        ))}
        {typing && (
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-2xl rounded-tl-md border border-line bg-white px-3 py-2 shadow-soft-xs">
              <TypingIndicator />
            </div>
          </div>
        )}
        {!typing && quickReplies.length > 0 && !pendingAction && (
          <QuickReplies options={quickReplies} onPick={handleQuickReply} />
        )}
      </div>

      {/* Composer + handoff */}
      <div className="relative space-y-2 border-t border-line bg-white px-4 py-3">
        <ChatComposer onSubmit={handleSend} disabled={typing} />
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleHumanHandoff} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[10px] font-medium text-ink-muted transition-all hover:border-brand-300 hover:text-brand-700">
            <Headset className="h-3 w-3" /> Hubungi Sales
          </button>
          <span className="flex items-center gap-1 text-[9px] text-ink-subtle">
            <Sparkles className="h-2.5 w-2.5 text-ochre-500/60" /> Ofistant AI · B2B commerce
          </span>
        </div>
      </div>
    </div>
  );
}

export const _legacyButtonLinkCompat = Button;
