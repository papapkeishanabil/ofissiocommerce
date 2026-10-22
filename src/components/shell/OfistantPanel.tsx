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
import styles from "@/components/ofistant/OfistantChat.module.css";
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
    <section aria-label="Asisten belanja Ofistant" className={`${styles.panel} ${ofistantFont.className}`}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <OfistantMark variant="rev" className={styles.headerLogo} />
          <div>
            <h2 className={styles.name}>Ofistant</h2>
            <p className={styles.subtitle}>Asisten belanja AI</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={reset} disabled={!hydrated || messages.length <= 1} aria-label="Mulai percakapan baru" title="Mulai percakapan baru" className={styles.headerButton}>
            <RotateCcw size={20} aria-hidden="true" />
          </button>
          {onClose && <button type="button" onClick={onClose} aria-label="Tutup Ofistant" className={styles.headerButton}>
            <X size={22} aria-hidden="true" />
          </button>}
        </div>
      </header>

      <div ref={scrollRef} className={styles.messages} role="log" aria-label="Percakapan Ofistant" aria-live="polite">
        <div className={styles.conversation}>
          {messages.map((m) => (
            <ChatMessageView key={m.id} message={m} isPendingConfirm={!!pendingAction && lastPendingMsgId === m.id && !!m.requiresConfirm} onConfirm={handleConfirm} onCancel={handleCancel} busy={busy} />
          ))}
          {typing && <div className={styles.message}>
            <span className={styles.avatar} aria-hidden="true"><OfistantMark variant="rev" /></span>
            <div className={styles.bubble}><TypingIndicator /></div>
          </div>}
          {!typing && quickReplies.length > 0 && !pendingAction && (
            <QuickReplies options={quickReplies} onPick={handleQuickReply} />
          )}
        </div>
      </div>

      <div className={styles.composerArea}>
        <ChatComposer onSubmit={handleSend} disabled={typing} />
        <div className={styles.footer}>
          <button type="button" onClick={handleHumanHandoff} disabled={typing} className={styles.handoff}>
            <Headset size={15} aria-hidden="true" /> Hubungi tim Ofissio
          </button>
          <span className={styles.signature}>Ofistant AI</span>
        </div>
      </div>
    </section>
  );
}

export const _legacyButtonLinkCompat = Button;
