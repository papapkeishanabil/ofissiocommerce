"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Headset, History, RotateCcw, X } from "lucide-react";

import { useSupportChat } from "@/features/ofistant-support/use-support-chat";
import { SupportMessageView } from "@/features/ofistant-support/SupportMessageView";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { useOfistantHistoryStore } from "@/stores/ofistant-history-store";
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
  const { session, hydrated: authHydrated } = useAuth();
  const accountKey = session ? `${session.user.id}:${session.company.id}` : null;
  const history = useOfistantHistoryStore();
  const historyOwner = useOfistantStore((s) => s.historyOwner);
  const historyNotice = useOfistantStore((s) => s.historyNotice);
  const conversationId = useOfistantStore((s) => s.conversationId);
  const [showHistory, setShowHistory] = useState(false);
  const support = useSupportChat(conversationId, authHydrated && historyOwner === accountKey ? accountKey : null);
  const [loginNotice, setLoginNotice] = useState(false);
  const accountReady = authHydrated && historyOwner === accountKey;
  const historyVisible = showHistory && !!session && accountReady;
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
  useEffect(() => {
    if (authHydrated) void useOfistantHistoryStore.getState().syncAccount(accountKey);
  }, [accountKey, authHydrated]);
  function newConversation() {
    reset();
    setShowHistory(false);
    useOfistantHistoryStore.setState({ before: null });
  }
  function toggleHistory() {
    if (!showHistory) void history.refresh();
    setShowHistory(!showHistory);
  }
  const lastMessageId = messages.at(-1)?.id;
  useLayoutEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lastMessageId, typing, pendingAction, showHistory]);

  function handleSend(text: string) {
    if (support.active) return support.act("send", text);
    sendUserTurn(text);
  }
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
  async function handleHumanHandoff() {
    if (!session) { setLoginNotice(true); useUIStore.getState().openAuth({ kind: "none" }, "login"); return; }
    if (await support.act("start")) {
      useOfistantStore.setState((state) => ({ generation: state.generation + 1, typing: false, quickReplies: [], pendingAction: null, historyNotice: null }));
    }
  }
  const timeline = [
    ...messages.map((message) => ({ kind: "ai" as const, message })),
    ...support.messages.filter((message) => !message.context).map((message) => ({ kind: "support" as const, message })),
  ].sort((a, b) => a.message.ts - b.message.ts);
  const supportLastId = support.messages.at(-1)?.id;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [supportLastId]);

  const lastPendingMsgId = pendingAction?.messageId ?? null;

  return (
    <section aria-label="Asisten belanja Ofistant" className={`${styles.panel} ${ofistantFont.className}`}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <OfistantMark variant="rev" className={styles.headerLogo} />
          <div>
            <h2 className={styles.name}>Ofistant</h2>
            <p className={styles.subtitle}>{support.active ? support.conversation?.status === "waiting" ? "Menunggu tim Ofissio" : `${support.conversation?.staffName} · Tim Ofissio` : "Asisten belanja AI"}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {session && <button type="button" onClick={toggleHistory} disabled={!accountReady || typing || support.busy} aria-label="Riwayat percakapan" aria-expanded={showHistory} className={styles.headerButton}><History size={20} aria-hidden="true" /></button>}
          <button type="button" onClick={newConversation} disabled={!hydrated || typing || support.busy || support.active || !accountReady || history.loading || messages.length <= 1} aria-label="Mulai percakapan baru" title="Mulai percakapan baru" className={styles.headerButton}>
            <RotateCcw size={20} aria-hidden="true" />
          </button>
          {onClose && <button type="button" onClick={onClose} aria-label="Tutup Ofistant" className={styles.headerButton}>
            <X size={22} aria-hidden="true" />
          </button>}
        </div>
      </header>

      {historyVisible ? <nav className={styles.historyPanel} aria-label="Riwayat percakapan Ofistant">
        <div className={styles.historyHeading}><h3>Riwayat percakapan</h3><button type="button" onClick={() => setShowHistory(false)} className={styles.historyButton}>Kembali ke chat</button></div>
        <p className={styles.historyHint}>Percakapan tersimpan di akun Anda. Memulai chat baru tidak menghapus riwayat.</p>
        {history.loading && <p role="status">Memuat riwayat...</p>}
        {history.error && <div role="alert"><p>{history.error}</p><button type="button" className={styles.historyButton} onClick={() => void history.refresh()}>Coba lagi</button></div>}
        {!history.loading && !history.error && !history.conversations.length && <p>Belum ada percakapan tersimpan. Mulai chat untuk membuat riwayat pertama Anda.</p>}
        {history.conversations.map((item) => <button key={item.id} type="button" disabled={history.loading} aria-current={item.id === conversationId ? "true" : undefined} className={styles.historyItem} onClick={async () => { await history.open(item.id); if (!useOfistantHistoryStore.getState().error) setShowHistory(false); }}><strong>{item.title}</strong><span>{new Date(item.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span></button>)}
        {history.nextOffset !== null && <button type="button" className={styles.historyButton} disabled={history.loading} onClick={() => void history.refresh(true)}>Lihat percakapan lainnya</button>}
      </nav> : <div ref={scrollRef} className={styles.messages} role="log" aria-label="Percakapan Ofistant" aria-live="polite">
        <div className={styles.conversation}>
          {!accountReady && <p role="status">Memuat percakapan...</p>}
          {accountReady && history.before !== null && <button type="button" className={styles.historyButton} disabled={history.loading || typing} onClick={() => void history.open(conversationId, true)}>Lihat pesan sebelumnya</button>}
          {accountReady && timeline.map((item) => item.kind === "support" ? <SupportMessageView key={`support-${item.message.id}`} message={item.message} conversationId={conversationId} /> : (
            <ChatMessageView key={item.message.id} message={item.message} isPendingConfirm={!support.active && !!pendingAction && lastPendingMsgId === item.message.id && !!item.message.requiresConfirm} onConfirm={handleConfirm} onCancel={handleCancel} busy={busy} onProductNavigate={() => { if (window.matchMedia("(max-width: 79.999rem)").matches) onClose?.(); }} />
          ))}
          {accountReady && typing && <div className={styles.message}>
            <span className={styles.avatar} aria-hidden="true"><OfistantMark variant="rev" /></span>
            <div className={styles.bubble}><TypingIndicator /></div>
          </div>}
          {accountReady && support.ready && !support.active && !typing && quickReplies.length > 0 && !pendingAction && (
            <QuickReplies options={quickReplies} onPick={handleQuickReply} />
          )}
        </div>
      </div>}

      {!historyVisible && <div className={styles.composerArea}>
        {historyNotice && accountReady && <p className={styles.historyHint} role="status">{historyNotice}</p>}
        {support.active && <div className={styles.supportStatus} role="status">
          <strong>{support.conversation?.status === "waiting" ? "Menunggu tim Ofissio" : `Terhubung dengan ${support.conversation?.staffName}`}</strong>
          <p>{support.conversation?.status === "waiting" ? "Anda boleh menambahkan pesan. Balasan staf akan muncul di panel ini saat permintaan ditangani." : "Pesan Anda dibalas langsung oleh staf Ofissio. AI tidak membalas selama sesi ini."}</p>
          <button type="button" className={styles.historyButton} disabled={support.busy} onClick={() => void support.act("close")}>Akhiri chat tim dan kembali ke AI</button>
        </div>}
        {support.error && <div role="alert" className={styles.historyHint}>{support.error} <button type="button" className={styles.historyButton} onClick={() => void support.refresh()}>Coba lagi</button></div>}
        {loginNotice && !session && <p className={styles.historyHint}>Masuk terlebih dahulu agar percakapan dengan tim tersimpan di akun Anda.</p>}
        <ChatComposer key={accountKey ?? "guest"} onSubmit={handleSend} disabled={typing || support.busy || !support.ready || !accountReady || history.loading} />
        <div className={styles.footer}>
          {!support.active && <button type="button" onClick={() => void handleHumanHandoff()} disabled={typing || support.busy || !support.ready || !accountReady || history.loading} className={styles.handoff}>
            <Headset size={15} aria-hidden="true" /> Hubungi tim Ofissio
          </button>}
          <span className={styles.signature}>{support.active ? "Chat tim Ofissio" : "Ofistant AI"}</span>
        </div>
        {!support.active && <p className={styles.historyHint}>Saat menghubungi tim, riwayat percakapan ini ikut diteruskan kepada staf.</p>}
      </div>}
    </section>
  );
}

export const _legacyButtonLinkCompat = Button;
