// src/components/shell/OfistantPanel.tsx
// Ofistant live chat panel (Phase 3): rule-based agent with structured actions.
// AI real (LLM tool-calling) is wired in Phase 7 by swapping the brain in
// lib/ofistant/ofistant.service.ts — the UI here stays unchanged.

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Headset, RotateCcw, Sparkles, X } from "lucide-react";

import { useOfistantStore } from "@/stores/ofistant-store";
import { useOfistantAction } from "@/hooks/use-ofistant-action";

import { Button } from "@/components/ui/Button";
import { ChatComposer } from "@/components/ofistant/ChatComposer";
import { ChatMessageView } from "@/components/ofistant/ChatMessageView";
import { IndustryQuickPicker } from "@/components/ofistant/IndustryQuickPicker";
import { QuickReplies } from "@/components/ofistant/QuickReplies";
import { TypingIndicator } from "@/components/ofistant/TypingIndicator";

interface OfistantPanelProps {
  /** when provided, render a close button (used in mobile bottom sheet) */
  onClose?: () => void;
}

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
  const journeyStage = useOfistantStore((s) => s.context.journeyStage);
  const messagesCount = useOfistantStore((s) => s.messages.length);

  const { dispatch } = useOfistantAction();
  const [busy, setBusy] = useState(false);

  // Show the prominent industry quick picker only on first welcome state
  // (before the user has interacted). After interaction, regular quick replies
  // chips take over so the picker doesn't get in the way.
  const showIndustryPicker =
    journeyStage === "NEW_VISITOR" && messagesCount <= 1 && !typing;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Bootstrap welcome message on mount.
  useEffect(() => {
    init();
  }, [init]);

  // Auto-scroll to bottom on new messages / typing.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, pendingAction]);

  function handleSend(text: string) {
    sendUserTurn(text);
  }

  function handleQuickReply(text: string) {
    sendUserTurn(text, { viaQuickReply: true });
  }

  async function handleConfirm() {
    const action = confirmPendingAction();
    if (!action) return;
    setBusy(true);
    dispatch(action);
    // Small delay for UX feedback before clearing busy.
    setTimeout(() => setBusy(false), 350);
    // Push a soft confirmation message from the assistant.
    useOfistantStore.setState((s) => ({
      messages: [
        ...s.messages,
        {
          id: `assistant-confirm-${Date.now()}`,
          role: "assistant",
          text:
            action.type === "ADD_TO_CART"
              ? "Berhasil ditambahkan ke keranjang. Mau lanjut mencari produk pelengkap, atau langsung ke keranjang?"
              : "Selesai.",
          ts: Date.now(),
        },
      ],
      quickReplies:
        action.type === "ADD_TO_CART"
          ? ["Lanjut eksplor produk", "Lihat keranjang", "Checkout"]
          : [],
    }));
  }

  function handleCancel() {
    dismissPendingAction();
    useOfistantStore.setState((s) => ({
      messages: [
        ...s.messages,
        {
          id: `assistant-cancel-${Date.now()}`,
          role: "assistant",
          text: "Baik, saya batalkan. Beri tahu saya jika ada yang ingin disesuaikan.",
          ts: Date.now(),
        },
      ],
    }));
  }

  function handleHumanHandoff() {
    sendUserTurn("Hubungi sales");
  }

  const lastPendingMsgId = pendingAction?.messageId ?? null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-surface-muted">
      {/* Atmospheric navy gradient at the top of the panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{
          background:
            "radial-gradient(400px 200px at 20% 0%, rgba(74,107,216,0.18), transparent 70%)," +
            "linear-gradient(180deg, #eff4ff 0%, transparent 100%)",
        }}
      />

      {/* Header — AI identity card */}
      <header className="relative flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white shadow-soft-sm">
              <Sparkles className="h-5 w-5 text-ochre-300" strokeWidth={2.4} />
            </span>
            {/* live dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" />
          </div>
          <div>
            <p className="type-display flex items-center gap-1.5 text-[15px] font-bold leading-tight text-ink">
              Ofistant
              <span className="rounded bg-brand-50 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-brand-700">
                AI
              </span>
            </p>
            <p className="flex items-center gap-1 text-[10px] text-ink-muted">
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
              Asisten Pengadaan · siap membantu
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            disabled={!hydrated || messages.length <= 1}
            aria-label="Mulai percakapan baru"
            title="Mulai percakapan baru"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-slate-100 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Ofistant"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-slate-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.map((m) => (
          <ChatMessageView
            key={m.id}
            message={m}
            isPendingConfirm={
              !!pendingAction &&
              lastPendingMsgId === m.id &&
              !!m.requiresConfirm
            }
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            busy={busy}
          />
        ))}

        {showIndustryPicker && (
          <IndustryQuickPicker onPick={handleQuickReply} />
        )}

        {typing && (
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-2xl rounded-tl-md bg-surface px-3 py-2 shadow-sm ring-1 ring-line">
              <TypingIndicator />
            </div>
          </div>
        )}

        {!typing && quickReplies.length > 0 && !pendingAction && !showIndustryPicker && (
          <QuickReplies options={quickReplies} onPick={handleQuickReply} />
        )}
      </div>

      {/* Composer + handoff */}
      <div className="relative space-y-2 border-t border-line bg-surface px-4 py-3.5">
        <ChatComposer onSubmit={handleSend} disabled={typing} />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleHumanHandoff}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-ink-muted transition-all hover:border-brand-300 hover:text-brand-700"
          >
            <Headset className="h-3 w-3" />
            Hubungi Sales
          </button>
          <span className="flex items-center gap-1 text-[9px] text-ink-subtle">
            <Sparkles className="h-2.5 w-2.5 text-brand-400" />
            Ofistant AI · B2B commerce
          </span>
        </div>
      </div>
    </div>
  );
}

// Unused export kept to satisfy callers that imported the old shape (Phase 2).
// Remove once ProductCard/CartPage stop referencing it.
export const _legacyButtonLinkCompat = Button;
