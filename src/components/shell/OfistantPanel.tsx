"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Headset, RotateCcw, X } from "lucide-react";

import { useOfistantStore } from "@/stores/ofistant-store";
import { useOfistantAction } from "@/hooks/use-ofistant-action";
import { useOfistantPageContext } from "@/hooks/use-ofistant-page-context";
import { Button } from "@/components/ui/Button";
import { OfistantMark } from "@/components/ofistant/OfistantMark";
import { ChatComposer } from "@/components/ofistant/ChatComposer";
import { ChatMessageView } from "@/components/ofistant/ChatMessageView";
import { QuickReplies } from "@/components/ofistant/QuickReplies";
import { TypingIndicator } from "@/components/ofistant/TypingIndicator";
import { ofistantFont } from "@/components/ofistant/ofistant-font";

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
  function handleHumanHandoff() { sendUserTurn("Saya butuh bantuan tim Ofissio"); }

  const lastPendingMsgId = pendingAction?.messageId ?? null;

  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-cool-50 text-ink ${ofistantFont.className}`}>
      {/* Header — blok navy yang kuat, identitas asisten */}
      <header className="workspace-chrome-header relative flex shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-700 text-white shadow-soft-sm ring-1 ring-white/20">
              <OfistantMark variant="rev" className="h-7 w-7" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#071c3a] bg-emerald-500" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-base font-extrabold leading-tight tracking-tight text-white">
              Ofistant
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ochre-200">AI</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-brand-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online, asisten pengadaan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={reset} disabled={!hydrated || messages.length <= 1} aria-label="Mulai percakapan baru" title="Mulai percakapan baru" className="grid h-9 w-9 place-items-center rounded-xl text-brand-100 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30">
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Tutup Ofistant" className="grid h-9 w-9 place-items-center rounded-xl text-brand-100 transition-colors hover:bg-white/15 hover:text-white lg:hidden">
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
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
        {/* Wash warna lembut di belakang bubble glass */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 right-[-15%] h-64 w-64 rounded-full bg-brand-300/25 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-20%] h-72 w-72 rounded-full bg-ochre-200/40 blur-3xl" />
        </div>
        <div className="relative space-y-5">
          {messages.map((m) => (
            <ChatMessageView key={m.id} message={m} isPendingConfirm={!!pendingAction && lastPendingMsgId === m.id && !!m.requiresConfirm} onConfirm={handleConfirm} onCancel={handleCancel} busy={busy} />
          ))}
          {typing && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white shadow-soft-sm">
                <OfistantMark variant="rev" className="h-5 w-5" />
              </span>
              <div className="rounded-2xl rounded-tl-md border border-white/70 bg-white/80 px-4 py-3 shadow-soft-sm backdrop-blur">
                <TypingIndicator />
              </div>
            </div>
          )}
          {!typing && quickReplies.length > 0 && !pendingAction && (
            <QuickReplies options={quickReplies} onPick={handleQuickReply} />
          )}
        </div>
      </div>

      {/* Composer + handoff */}
      <div className="relative shrink-0 space-y-2 border-t border-line bg-white px-4 py-3.5">
        <ChatComposer onSubmit={handleSend} disabled={typing} />
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleHumanHandoff} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1.5 text-[11px] font-semibold text-ink-muted transition-all hover:border-brand-300 hover:text-brand-700">
            <Headset className="h-3.5 w-3.5" /> Butuh bantuan tim Ofissio
          </button>
          <span className="flex items-center gap-1 text-[10px] text-ink-subtle">
            <OfistantMark variant="navy" className="h-4 w-4" /> Ofistant AI, B2B commerce
          </span>
        </div>
      </div>
    </div>
  );
}

export const _legacyButtonLinkCompat = Button;
