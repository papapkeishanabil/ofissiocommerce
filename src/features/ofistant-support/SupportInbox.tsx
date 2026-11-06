"use client";
import { useEffect, useRef, useState } from "react";
import { Headset } from "lucide-react";
import { useSupportChat } from "./use-support-chat";
import { SupportMessageView } from "./SupportMessageView";
import type { SupportConversation } from "./support.types";
import styles from "./SupportInbox.module.css";
const labels = { waiting: "Menunggu", active: "Ditangani", closed: "Selesai" };
export function SupportInbox({ actorId }: { actorId: string }) {
  const [status, setStatus] = useState<SupportConversation["status"]>("waiting");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<SupportConversation[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const chat = useSupportChat(selected, actorId, true);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const last = chat.messages.at(-1)?.id;
  const owns = chat.conversation?.staffId === actorId;
  useEffect(() => {
    if (sessionInvalid) { setLoading(false); return; }
    let stopped = false;
    let invalidSession = false;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true); setItems([]);
    async function poll() {
      try {
        const response = await fetch(`/api/admin/chats?status=${status}&offset=${offset}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const body = await response.json();
        if (response.status === 401 || response.status === 403) {
          invalidSession = true;
          if (!stopped) { setSessionInvalid(true); setItems([]); setSelected(""); setDraft(""); setError(null); }
          return;
        }
        if (!response.ok) throw new Error(body.message || "Antrean belum dapat dimuat.");
        if (!stopped) { setItems(body.result.conversations); setError(null); }
      } catch (err) { if (!stopped) setError((err as Error).message); }
      finally { if (!stopped) { setLoading(false); if (!invalidSession) timer = setTimeout(poll, 10000); } }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [status, offset, chat.conversation?.status, sessionInvalid]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [last]);
  return <main className={styles.workspace}>
    <header><h1>Chat Customer</h1><p>Terima percakapan dari Ofistant dan bantu customer langsung di chat.</p></header>
    <div className={styles.layout}>
      <section className={styles.queue} aria-label="Antrean chat customer">
        <div className={styles.filters}>{Object.entries(labels).map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value as SupportConversation["status"]); setOffset(0); }}>{label}</button>)}</div>
        {error && <p role="alert" className={styles.notice}>{error} Sistem akan mencoba lagi otomatis.</p>}
        {loading && <p className={styles.notice} role="status">Memuat antrean...</p>}
        {sessionInvalid && <div role="alert" className={styles.notice}><p>Sesi admin sudah berakhir atau berganti akun. Masuk kembali sebagai staf untuk melihat chat.</p><p>Jika sedang menguji akun customer, gunakan Incognito atau profil browser terpisah.</p><a href="/login?mode=admin&next=%2Fadmin%2Fchats" className={styles.loginLink}>Masuk kembali sebagai admin</a></div>}
        {!loading && !sessionInvalid && !error && items.length === 0 && <p className={styles.notice}>Belum ada percakapan {labels[status].toLowerCase()}.</p>}
        {items.map((item) => <button type="button" key={item.id} aria-current={selected === item.id ? "true" : undefined} className={styles.queueItem} onClick={() => { setSelected(item.id); setDraft(""); }}>
          <strong>{item.customerName}</strong><span>{item.staffName ? `Ditangani ${item.staffName}` : "Menunggu staf"}</span>
          <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</time>
        </button>)}
        <div className={styles.pagination}><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Sebelumnya</button><button type="button" disabled={items.length < 50} onClick={() => setOffset(offset + 50)}>Berikutnya</button></div>
      </section>
      <section className={styles.chat} aria-label="Percakapan customer">
        {!selected ? <div className={styles.empty}><Headset size={32} aria-hidden="true" /><h2>Pilih percakapan</h2><p>Riwayat AI ikut ditampilkan setelah customer meminta bantuan tim.</p></div> : <>
          <header className={styles.chatHeader}><div><h2>{chat.conversation?.customerName || "Percakapan customer"}</h2><p>{chat.conversation ? labels[chat.conversation.status] : "Memuat..."}{chat.conversation?.staffName ? ` · ${chat.conversation.staffName}` : ""}</p></div>
            {chat.conversation?.status === "waiting" && <button className={styles.primary} type="button" disabled={chat.busy || !chat.ready} onClick={() => void chat.act("claim")}>Ambil percakapan</button>}
            {chat.active && owns && <button type="button" disabled={chat.busy} onClick={() => void chat.act("close")}>Selesaikan chat</button>}
          </header>
          {chat.error && <p role="alert" className={styles.notice}>{chat.error} <button type="button" onClick={() => void chat.refresh()}>Coba lagi</button></p>}
          <div className={styles.log} ref={log} role="log" aria-live="polite" aria-label="Pesan customer dan staf">
            {!chat.ready && <p role="status">Memuat percakapan...</p>}
            {chat.messages.map((message) => <SupportMessageView key={message.id} message={message} />)}
          </div>
          <form className={styles.composer} onSubmit={async (event) => { event.preventDefault(); if (draft.trim() && !chat.busy && await chat.act("send", draft.trim())) setDraft(""); }}>
            <label htmlFor="staff-reply">Balasan untuk customer</label>
            <textarea id="staff-reply" maxLength={2000} rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!owns || !chat.active || chat.busy || !chat.ready} placeholder={chat.conversation?.status === "waiting" ? "Ambil percakapan terlebih dahulu" : "Tulis balasan Anda..."} />
            <div><p>{chat.conversation?.status === "closed" ? "Percakapan sudah selesai." : owns ? "Balasan tampil atas nama Anda di panel customer." : "Hanya staf yang mengambil percakapan dapat membalas."}</p><button className={styles.primary} type="submit" disabled={!owns || !chat.active || chat.busy || !chat.ready || !draft.trim()}>{chat.busy ? "Mengirim..." : "Kirim balasan"}</button></div>
          </form>
        </>}
      </section>
    </div>
  </main>;
}
