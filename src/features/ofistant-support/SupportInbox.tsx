"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, Bot, CheckCheck, ChevronLeft, ChevronRight, Headset, Search, Send } from "lucide-react";
import { useSupportChat } from "./use-support-chat";
import { ChatNotificationControls } from "./ChatNotificationControls";
import { useAdminNotifications } from "@/features/admin-notifications/components/AdminNotificationProvider";
import type { SupportConversation } from "./support.types";
import styles from "./SupportInbox.module.css";

const labels = { waiting: "Menunggu", active: "Ditangani", closed: "Selesai" };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const dateLabel = (ts: number) => new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function SupportInbox({ actorId, initialConversationId = "" }: { actorId: string; initialConversationId?: string }) {
  const { request, summary, mutate, chatSessionInvalid } = useAdminNotifications();
  const [status, setStatus] = useState<SupportConversation["status"]>("waiting");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<SupportConversation[]>([]);
  const [selected, setSelected] = useState(initialConversationId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const chat = useSupportChat(selected, sessionInvalid || chatSessionInvalid ? null : actorId, true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = drafts[selected] ?? "";
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [newMessages, setNewMessages] = useState(false);
  const marked = useRef(new Set<string>());
  const last = chat.messages.at(-1)?.id;
  const owns = chat.conversation?.staffId === actorId;
  const unread = (summary.latestChatNotifications ?? []).filter((item) => item.status === "unread");
  const filtered = items.filter((item) => item.customerName.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")));
  const canSend = owns && chat.active && chat.ready && !chat.busy && !!draft.trim();

  useEffect(() => { setSelected(initialConversationId); nearBottom.current = true; }, [initialConversationId]);
  const conversationStatus = chat.conversation?.status;
  useEffect(() => { if (conversationStatus) setStatus(conversationStatus); }, [conversationStatus]);
  useEffect(() => {
    if (!selected) return;
    const media = window.matchMedia("(max-width:800px)");
    const previous = document.body.style.overflow;
    const update = () => { document.body.style.overflow = media.matches ? "hidden" : previous; };
    update(); media.addEventListener("change", update);
    return () => { document.body.style.overflow = previous; media.removeEventListener("change", update); };
  }, [selected]);
  useEffect(() => {
    if (chatSessionInvalid) { setSessionInvalid(true); setSelected(""); setItems([]); setDrafts({}); }
  }, [chatSessionInvalid]);
  useEffect(() => {
    if (sessionInvalid) { setLoading(false); return; }
    let stopped = false;
    let invalidSession = false;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true); setItems([]);
    async function poll() {
      try {
        const response = await request(`/api/admin/chats?status=${status}&offset=${offset}`, { signal: AbortSignal.timeout(15000) });
        const body = await response.json();
        if (response.status === 401 || response.status === 403) {
          invalidSession = true;
          if (!stopped) { setSessionInvalid(true); setItems([]); setSelected(""); setDrafts({}); setError(null); }
          return;
        }
        if (!response.ok) throw new Error(body.message || "Antrean belum dapat dimuat.");
        if (!stopped) { setItems(body.result.conversations); setError(null); }
      } catch (err) { if (!stopped) setError((err as Error).message); }
      finally { if (!stopped) { setLoading(false); if (!invalidSession) timer = setTimeout(poll, 10000); } }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [status, offset, chat.conversation?.status, sessionInvalid, request, refreshKey]);
  useEffect(() => {
    if (!log.current) return;
    if (nearBottom.current) { log.current.scrollTop = log.current.scrollHeight; setNewMessages(false); }
    else setNewMessages(true);
  }, [last]);
  useEffect(() => {
    if (!chat.ready || !selected || document.hidden || !document.hasFocus() || newMessages) return;
    for (const item of summary.latestChatNotifications ?? []) {
      if (item.status === "unread" && item.metadata.conversationId === selected && !marked.current.has(item.id)) {
        marked.current.add(item.id);
        void mutate(item.id, "read").then((ok) => { if (!ok) marked.current.delete(item.id); });
      }
    }
  }, [chat.ready, selected, summary.latestChatNotifications, mutate, newMessages]);

  function choose(id: string) { nearBottom.current = true; setNewMessages(false); setSelected(id); }
  async function send() {
    if (!canSend) return;
    const sentDraft = draft;
    nearBottom.current = true;
    if (await chat.act("send", sentDraft.trim())) setDrafts((old) => old[selected] === sentDraft ? { ...old, [selected]: "" } : old);
  }

  return <section className={styles.workspace} aria-labelledby="chat-title">
    <header className={styles.pageHeader}><div><h1 id="chat-title">Chat Customer</h1><p>Bantu customer langsung melalui panel Ofistant.</p></div><ChatNotificationControls /></header>
    <div className={`${styles.layout} ${selected ? styles.hasSelection : ""}`}>
      <section className={styles.queue} aria-label="Antrean chat customer">
        <div className={styles.queueHeading}><h2>Percakapan</h2><label className={styles.search}><Search size={18} aria-hidden="true" /><span className={styles.srOnly}>Cari nama customer pada halaman ini</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama customer..." /></label>
          <div className={styles.filters} aria-label="Status percakapan">{Object.entries(labels).map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value as SupportConversation["status"]); setOffset(0); }}>{label}</button>)}</div>
        </div>
        <div className={styles.queueList}>
          {error && <div role="alert" className={styles.notice}><p>{error}</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Coba lagi</button></div>}
          {loading && <p className={styles.notice} role="status">Memuat antrean...</p>}
          {sessionInvalid && <div role="alert" className={styles.notice}><p>Sesi admin sudah berakhir atau berganti akun. Masuk kembali sebagai staf untuk melihat chat.</p><p>Jika sedang menguji akun customer, gunakan Incognito atau profil browser terpisah.</p><a href="/login?mode=admin&next=%2Fadmin%2Fchats" className={styles.loginLink}>Masuk kembali sebagai admin</a></div>}
          {!loading && !sessionInvalid && !error && filtered.length === 0 && <div className={styles.queueEmpty}><Headset size={28} aria-hidden="true" /><strong>{query ? "Nama belum ditemukan" : `Belum ada chat ${labels[status].toLowerCase()}`}</strong><p>{query ? "Cari nama lain pada halaman ini." : status === "closed" ? "Percakapan yang diselesaikan akan tetap tersimpan di sini." : "Percakapan akan muncul saat customer menghubungi tim Ofissio."}</p></div>}
          {filtered.map((item) => {
            const unreadCount = summary.chatUnreadByConversation?.[item.id] ?? unread.filter((notice) => notice.metadata.conversationId === item.id).length;
            return <button type="button" key={item.id} aria-current={selected === item.id ? "true" : undefined} className={styles.queueItem} onClick={() => choose(item.id)}>
              <span className={styles.avatar} aria-hidden="true">{initials(item.customerName)}</span><span className={styles.queueText}><strong>{item.customerName}</strong><span>{item.status === "closed" ? "Percakapan selesai" : item.staffId === actorId ? "Anda menangani" : item.staffName ? `Ditangani ${item.staffName}` : "Menunggu staf"}</span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>{unreadCount > 0 && <span className={styles.unread}>{unreadCount} belum dibaca</span>}</span>
            </button>;
          })}
        </div>
        <div className={styles.pagination}><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}><ChevronLeft size={16} />Sebelumnya</button><span>{offset / 50 + 1}</span><button type="button" disabled={items.length < 50} onClick={() => setOffset(offset + 50)}>Berikutnya<ChevronRight size={16} /></button></div>
      </section>
      <section className={styles.chat} aria-label="Percakapan customer">
        {!selected ? <div className={styles.empty}><span className={styles.emptyIcon}><Headset size={36} aria-hidden="true" /></span><h2>Setiap percakapan, lebih personal.</h2><p>Pilih chat di sebelah kiri untuk membantu customer. Riwayat percakapan dengan Ofistant AI ikut ditampilkan.</p></div> : <>
          <button type="button" className={styles.back} onClick={() => choose("")}><ArrowLeft size={18} />Kembali ke daftar</button>
          <div className={styles.mobileControls}><ChatNotificationControls /></div>
          <header className={styles.chatHeader}><span className={styles.avatar} aria-hidden="true">{initials(chat.conversation?.customerName || "Customer")}</span><div className={styles.identity}><h2>{chat.conversation?.customerName || "Percakapan customer"}</h2><p>{chat.conversation?.status === "active" ? owns ? "Ditangani oleh Anda" : `Ditangani ${chat.conversation.staffName}` : chat.conversation ? labels[chat.conversation.status] : "Memuat..."}</p></div>
            {chat.conversation?.status === "waiting" && <button className={styles.primary} type="button" disabled={chat.busy || !chat.ready} onClick={() => void chat.act("claim")}>Ambil percakapan</button>}
            {chat.active && owns && <button className={styles.complete} type="button" disabled={chat.busy} onClick={() => void chat.act("close")}><CheckCheck size={16} />Selesaikan chat</button>}
          </header>
          {chat.error && <p role="alert" className={styles.notice}>{chat.error} <button type="button" onClick={() => void chat.refresh()}>Coba lagi</button></p>}
          <div className={styles.log} ref={log} role="log" aria-live="polite" aria-label="Pesan customer dan staf" onScroll={() => { const node = log.current; if (node) { nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 72; if (nearBottom.current) setNewMessages(false); } }}>
            {!chat.ready && <p role="status">Memuat percakapan...</p>}
            {chat.messages.map((message, index) => <Fragment key={message.id}>
              {(index === 0 || dateLabel(chat.messages[index - 1]!.ts) !== dateLabel(message.ts)) && <div className={styles.date}>{dateLabel(message.ts)}</div>}
              {message.role === "system" ? <p className={styles.event}>{message.text}</p> : <div className={`${styles.message} ${message.role === "staff" ? styles.staffMessage : ""} ${message.role === "assistant" ? styles.aiMessage : ""}`}>
                <span className={styles.sender}>{message.role === "assistant" && <Bot size={14} />}{message.role === "assistant" ? "Ofistant AI" : message.role === "staff" ? `${message.name} · Tim Ofissio` : message.name}</span><div className={styles.bubble}>{message.text}</div><time dateTime={new Date(message.ts).toISOString()}>{timeLabel(message.ts)}</time>
              </div>}
            </Fragment>)}
          </div>
          {newMessages && <button type="button" className={styles.newMessages} onClick={() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; nearBottom.current = true; setNewMessages(false); }}><ArrowDown size={16} />Lihat pesan terbaru</button>}
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <label htmlFor="staff-reply">Balasan Anda</label>
            <textarea id="staff-reply" maxLength={2000} rows={3} value={draft} onChange={(event) => setDrafts((old) => ({ ...old, [selected]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void send(); } }} disabled={!owns || !chat.active || chat.busy || !chat.ready} placeholder={chat.conversation?.status === "waiting" ? "Ambil percakapan terlebih dahulu" : "Tulis balasan Anda..."} />
            <div className={styles.composerFooter}><p>{chat.conversation?.status === "closed" ? "Percakapan selesai. Riwayat tetap tersimpan." : owns ? "Enter untuk baris baru · Ctrl/⌘+Enter untuk kirim" : "Ambil chat yang menunggu untuk mulai membalas."}</p><button className={styles.primary} type="submit" disabled={!canSend}>{chat.busy ? "Memproses..." : "Kirim balasan"}<Send size={17} /></button></div>
          </form>
        </>}
      </section>
    </div>
  </section>;
}
