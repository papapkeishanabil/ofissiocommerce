"use client";
import { useEffect, useRef, useState } from "react";
import { Star, X, Pencil, Search, Send, Upload } from "lucide-react";
import { useAdminNotifications } from "@/features/admin-notifications/components/AdminNotificationProvider";
import { formatIDR } from "@/types/product";
import type { ChatCustomerContext, ChatMaterial } from "./support-context.types";
import styles from "./SupportCustomerPanel.module.css";
type Product = { id: string; title: string; price: number; image?: string; url: string };
export function SupportCustomerPanel({ conversationId, actorId, canSend, onSent, onClose }: { conversationId: string; actorId: string; canSend: boolean; onSent: () => void; onClose: () => void }) {
  const { request } = useAdminNotifications();
  const [context, setContext] = useState<ChatCustomerContext | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "", whatsapp: "", notes: "" });
  const [editing, setEditing] = useState(false); const [tab, setTab] = useState("orders");
  const [products, setProducts] = useState<Product[]>([]); const [materials, setMaterials] = useState<ChatMaterial[]>([]);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Semua");
  const [favorites, setFavorites] = useState<string[]>([]); const [offset, setOffset] = useState(0);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0); const [upload, setUpload] = useState(false); const [preview, setPreview] = useState<ChatMaterial | null>(null);
  const pending = useRef<{ key: string; id: string } | null>(null); const lock = useRef(false);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(`ofissio-materials:${actorId}`) ?? "[]"); setFavorites(Array.isArray(saved) ? saved.filter(x => typeof x === "string") : []); } catch {} }, [actorId]);
  const remoteQuery = tab === "products" ? query : "";
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await request(`/api/admin/chats/context?conversationId=${conversationId}&tab=${tab}&offset=${offset}&q=${encodeURIComponent(remoteQuery)}`, { signal: abort.signal });
        const body = await response.json(); if (!response.ok) throw new Error(body.message || "Data belum dapat dimuat.");
        if (abort.signal.aborted) return;
        if (tab === "products") setProducts(body.result); else if (tab === "materials") setMaterials(body.result); else { setContext(body.result); setProfile(body.result.profile); }
      } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
      finally { if (!abort.signal.aborted) setLoading(false); }
    }, tab === "products" ? 300 : 0);
    return () => { abort.abort(); clearTimeout(timer); };
  }, [conversationId, request, tab, offset, remoteQuery, revision]);
  useEffect(() => { if (preview) modal.current?.showModal(); else modal.current?.close(); }, [preview]);
  async function mutation(body: Record<string, unknown> | FormData) {
    if (lock.current) return false; lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await request("/api/admin/chats/context", body instanceof FormData ? { method: "POST", body } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, conversationId }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "Belum berhasil. Coba lagi."); return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); lock.current = false; }
  }
  async function send(kind: "product" | "material", id: string) {
    if (!canSend || lock.current) return;
    const key = `${kind}:${id}`;
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    if (await mutation({ action: "send", kind, resourceId: id, messageId: pending.current.id })) { pending.current = null; setNotice("Berhasil dikirim ke chat."); setPreview(null); onSent(); }
  }
  function favorite(id: string) { const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id]; setFavorites(next); try { localStorage.setItem(`ofissio-materials:${actorId}`, JSON.stringify(next)); } catch {} }
  function chooseTab(value: string) { setTab(value); setQuery(""); setError(""); setNotice(""); }
  const visibleMaterials = materials.filter(m => `${m.title} ${m.category}`.toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID")) && (category === "Semua" || category === "Favorit" ? category !== "Favorit" || favorites.includes(m.id) : category === m.category));
  return <aside className={styles.panel} aria-label="Informasi customer">
    <header className={styles.heading}><h2>Informasi customer</h2><button type="button" aria-label="Tutup informasi customer" onClick={onClose}><X size={18} /></button></header>
    <div className={styles.scroll}>
      {context && <section className={styles.profile}>
        {editing ? <form onSubmit={async event => { event.preventDefault(); if (await mutation({ action: "profile", profile })) { setEditing(false); setContext(old => old ? { ...old, profile } : old); setNotice("Informasi customer disimpan."); onSent(); } }}>
          <label>Nama tampilan<input required maxLength={160} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>WhatsApp<input maxLength={40} value={profile.whatsapp} onChange={e => setProfile({ ...profile, whatsapp: e.target.value })} /></label>
          <label>Catatan internal<textarea maxLength={2000} value={profile.notes} onChange={e => setProfile({ ...profile, notes: e.target.value })} /></label>
          <p>Nama ini digunakan tim CS. Akun Google dan email login tetap sama.</p><div className={styles.actions}><button disabled={busy} className={styles.primary}>Simpan</button><button type="button" disabled={busy} onClick={() => { setProfile(context.profile); setEditing(false); }}>Batal</button></div>
        </form> : <><div className={styles.actions}><strong>{context.profile.name}</strong><button aria-label="Edit customer" type="button" onClick={() => setEditing(true)}><Pencil size={16} />Edit</button></div><p>{context.profile.email || "Email belum tersedia"}</p><p>{context.profile.whatsapp || "WhatsApp belum diisi"}</p>{context.profile.notes && <p className={styles.notes}>Catatan CS: {context.profile.notes}</p>}</>}
      </section>}
      <nav className={styles.tabs} aria-label="Data customer">{[["orders", "Order"], ["products", "Produk"], ["materials", "Pusat Informasi"]].map(([id, title]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => chooseTab(id!)}>{title}</button>)}</nav>
      <div className={styles.content}>
        {error && <p role="alert" className={styles.error}>{error} <button type="button" onClick={() => setRevision(n => n + 1)}>Coba lagi</button></p>}
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        {tab !== "orders" && <label className={styles.search}><Search size={16} /><input aria-label={tab === "products" ? "Cari produk" : "Cari materi"} placeholder={tab === "products" ? "Cari nama atau SKU produk..." : "Cari ukuran, panduan, dokumen..."} value={query} onChange={e => setQuery(e.target.value)} /></label>}
        {loading && <p role="status">Memuat...</p>}
        {tab === "orders" && context && <>
          <p>Pesanan akun customer ini, termasuk yang selesai atau dibatalkan.</p>
          {!loading && !context.orders.length && <p>Belum ada pesanan.</p>}
          {context.orders.map(order => <article className={styles.card} key={order.id}><div className={styles.actions}><strong>{order.number}</strong><span>{order.status.replaceAll("_", " ")}</span></div><p>{new Date(order.date).toLocaleDateString("id-ID")}</p><p>{order.products.join(", ")}</p><strong>{formatIDR(order.total)}</strong><a href={`/admin/orders/${encodeURIComponent(order.id)}`} target="_blank" rel="noopener noreferrer">Detail pesanan ↗</a></article>)}
          <div className={styles.actions}><button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 20))}>Sebelumnya</button><button disabled={!context.moreOrders || loading} onClick={() => setOffset(offset + 20)}>Berikutnya</button></div>
        </>}
        {tab === "products" && <>{!loading && !products.length && <p>Produk tidak ditemukan.</p>}{products.map(product => <article className={styles.card} key={product.id}>{product.image && <img src={product.image} alt={product.title} loading="lazy" />}<strong>{product.title}</strong><p>Mulai {formatIDR(product.price)}</p><button className={styles.primary} disabled={!canSend || busy} onClick={() => void send("product", product.id)}><Send size={15} />Kirim ke chat</button></article>)}</>}
        {tab === "materials" && <>
          <div className={styles.categories}>{["Semua", "Favorit", "Ukuran", "Panduan", "Dokumen"].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          {!loading && !visibleMaterials.length && <p>Belum ada materi yang sesuai. Standar ukuran muncul setelah diverifikasi.</p>}
          {visibleMaterials.map(item => <article className={styles.card} key={item.id}><div className={styles.actions}><strong>{item.title}</strong><button type="button" aria-label={`Favorit ${item.title}`} aria-pressed={favorites.includes(item.id)} onClick={() => favorite(item.id)}><Star size={17} fill={favorites.includes(item.id) ? "#e8a92a" : "none"} /></button></div><p>{item.category} · {item.kind === "chart" ? "Ukuran terverifikasi" : item.kind.toUpperCase()}</p>{item.kind !== "pdf" && <img loading="lazy" src={`/api/admin/chats/material?id=${encodeURIComponent(item.id)}`} alt={item.title} />}<div className={styles.actions}><button type="button" onClick={() => setPreview(item)}>Pratinjau</button><button className={styles.primary} disabled={!canSend || busy} onClick={() => void send("material", item.id)}>Kirim ke chat</button></div></article>)}
          <button type="button" onClick={() => setUpload(!upload)}><Upload size={16} />Kelola materi</button>
          {upload && <form className={styles.card} onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; if (await mutation(new FormData(form))) { form.reset(); setRevision(n => n + 1); setNotice("Materi tersedia untuk seluruh CS."); } }}><p>Unggah materi customer (akses pengelola konten).</p><label>Judul<input name="title" required maxLength={120} /></label><label>Kategori<select name="category"><option>Panduan</option><option>Ukuran</option><option>Dokumen</option></select></label><label>File PNG, JPG, WebP, PDF · maksimal 10 MB<input name="file" type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" /></label><button disabled={busy} className={styles.primary}>Unggah dan terbitkan</button><p>Untuk mengganti materi, unggah versi baru lalu arsipkan versi lama. Kiriman lama tetap dapat dibuka.</p>{materials.filter(m => !m.id.startsWith("chart:")).map(m => <div className={styles.actions} key={m.id}><span>{m.title}</span><button disabled={busy} type="button" onClick={async () => { if (await mutation({ action: "archive", resourceId: m.id })) setRevision(n => n + 1); }}>Arsipkan</button></div>)}</form>}
        </>}
        {tab !== "orders" && !canSend && <p>Ambil percakapan untuk mengirim produk atau materi.</p>}
      </div>
    </div>
    <dialog ref={modal} className={styles.dialog} onCancel={() => setPreview(null)} onClose={() => setPreview(null)}>{preview && <><header className={styles.heading}><h2>{preview.title}</h2><button aria-label="Tutup pratinjau" onClick={() => setPreview(null)}><X /></button></header>{preview.kind === "pdf" ? <a target="_blank" rel="noopener noreferrer" href={`/api/admin/chats/material?id=${encodeURIComponent(preview.id)}`}>Buka pratinjau PDF ↗</a> : <img src={`/api/admin/chats/material?id=${encodeURIComponent(preview.id)}`} alt={preview.title} />}<button className={styles.primary} disabled={!canSend || busy} onClick={() => void send("material", preview.id)}>Kirim ke chat</button></>}</dialog>
  </aside>;
}
