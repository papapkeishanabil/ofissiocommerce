"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, FilePenLine, Plus } from "lucide-react";

import type { OfistantKnowledgeArticle } from "./ofistant-knowledge.types";

export function OfistantKnowledgeManager({ initialArticles, canPublish }: { initialArticles: OfistantKnowledgeArticle[]; canPublish: boolean }) {
  const [articles, setArticles] = useState(initialArticles);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function createDraft(formData: FormData) {
    setBusy("new"); setNotice(null);
    const payload = {
      title: String(formData.get("title") ?? ""), category: String(formData.get("category") ?? ""),
      question: String(formData.get("question") ?? ""), answer: String(formData.get("answer") ?? ""),
      keywords: String(formData.get("keywords") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    };
    const response = await fetch("/api/admin/ofistant-knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { ok?: boolean; article?: OfistantKnowledgeArticle; message?: string };
    if (response.ok && result.article) { setArticles((current) => [result.article!, ...current]); setNotice("Draft berhasil dibuat."); }
    else setNotice(result.message ?? "Draft belum dapat dibuat.");
    setBusy(null);
  }

  async function setStatus(article: OfistantKnowledgeArticle, status: "published" | "archived") {
    setBusy(article.id); setNotice(null);
    const response = await fetch(`/api/admin/ofistant-knowledge/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const result = await response.json() as { ok?: boolean; article?: OfistantKnowledgeArticle; message?: string };
    if (response.ok && result.article) { setArticles((current) => current.map((item) => item.id === article.id ? result.article! : item)); setNotice(status === "published" ? "Artikel diterbitkan dan siap digunakan Ofistant." : "Artikel diarsipkan."); }
    else setNotice(result.message ?? "Status artikel belum dapat diubah.");
    setBusy(null);
  }

  async function saveArticle(article: OfistantKnowledgeArticle, formData: FormData) {
    setBusy(article.id); setNotice(null);
    const payload = {
      title: String(formData.get("title") ?? ""), category: String(formData.get("category") ?? ""),
      question: String(formData.get("question") ?? ""), answer: String(formData.get("answer") ?? ""),
      keywords: String(formData.get("keywords") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    };
    const response = await fetch(`/api/admin/ofistant-knowledge/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { article?: OfistantKnowledgeArticle; message?: string };
    if (response.ok && result.article) { setArticles((current) => current.map((item) => item.id === article.id ? result.article! : item)); setNotice("Perubahan artikel berhasil disimpan."); }
    else setNotice(result.message ?? "Artikel belum dapat disimpan.");
    setBusy(null);
  }

  return <div className="space-y-6">
    <form action={createDraft} className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Plus className="h-5 w-5" /></span><div><h2 className="font-black text-ink">Tulis artikel baru</h2><p className="text-sm text-ink-muted">Admin dan CS membuat draft. Super Admin memeriksa lalu menerbitkannya.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Judul"><input name="title" required minLength={3} className={INPUT} /></Field>
        <Field label="Kategori"><input name="category" required placeholder="Pengiriman, Pembayaran, Bordir..." className={INPUT} /></Field>
        <Field label="Contoh pertanyaan customer"><textarea name="question" required minLength={5} rows={3} className={INPUT} /></Field>
        <Field label="Kata kunci"><input name="keywords" placeholder="resi, terlambat, kurir" className={INPUT} /></Field>
      </div>
      <div className="mt-4"><Field label="Jawaban resmi"><textarea name="answer" required minLength={10} rows={6} className={INPUT} /></Field></div>
      <button disabled={busy !== null} className="mt-4 min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-extrabold text-white disabled:opacity-50">{busy === "new" ? "Menyimpan..." : "Simpan sebagai draft"}</button>
    </form>
    {notice ? <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-brand-800">{notice}</p> : null}
    <section aria-labelledby="kb-list-title"><div className="flex items-center justify-between gap-3"><h2 id="kb-list-title" className="text-xl font-black text-ink">Daftar pengetahuan</h2><span className="text-sm font-semibold text-ink-muted">{articles.length} artikel</span></div>
      <div className="mt-4 grid gap-4">{articles.length ? articles.map((article) => <article key={article.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><BookOpen className="mt-1 h-5 w-5 shrink-0 text-brand-700" /><div><p className="text-xs font-black uppercase tracking-wider text-brand-700">{article.category}</p><h3 className="mt-1 font-black text-ink">{article.title}</h3><p className="mt-2 text-sm font-semibold text-ink-muted">Pertanyaan: {article.question}</p></div></div><Status status={article.status} /></div>
        <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-ink">{article.answer}</p>
        <details className="mt-4 rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-extrabold text-brand-700">Edit isi artikel</summary><form action={(data) => saveArticle(article, data)} className="mt-4 grid gap-3">
          <Field label="Judul"><input name="title" defaultValue={article.title} required className={INPUT} /></Field>
          <Field label="Kategori"><input name="category" defaultValue={article.category} required className={INPUT} /></Field>
          <Field label="Pertanyaan"><textarea name="question" defaultValue={article.question} required rows={2} className={INPUT} /></Field>
          <Field label="Jawaban"><textarea name="answer" defaultValue={article.answer} required rows={5} className={INPUT} /></Field>
          <Field label="Kata kunci"><input name="keywords" defaultValue={article.keywords.join(", ")} className={INPUT} /></Field>
          <button disabled={busy !== null} className="min-h-10 justify-self-start rounded-xl bg-brand-700 px-4 text-sm font-extrabold text-white disabled:opacity-50">Simpan perubahan</button>
        </form></details>
        {canPublish && article.status !== "published" ? <button onClick={() => setStatus(article, "published")} disabled={busy !== null} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Terbitkan</button> : null}
        {canPublish && article.status === "published" ? <button onClick={() => setStatus(article, "archived")} disabled={busy !== null} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-extrabold text-ink"><FilePenLine className="h-4 w-4" />Arsipkan</button> : null}
      </article>) : <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-muted">Belum ada artikel. Mulai dari FAQ yang paling sering ditanyakan customer.</div>}</div>
    </section>
  </div>;
}

const INPUT = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-ink">{label}{children}</label>; }
function Status({ status }: { status: OfistantKnowledgeArticle["status"] }) { const style = status === "published" ? "bg-emerald-50 text-emerald-700" : status === "archived" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"; return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${style}`}>{status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft"}</span>; }
