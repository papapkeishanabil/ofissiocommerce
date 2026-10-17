"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Search, ShieldAlert, Users } from "lucide-react";

import { ADMIN_DETAILED_PROCEDURES, ADMIN_MENU_GUIDES, ADMIN_WORKFLOW_GUIDES, type GuideAudience } from "../admin-guide.data";

const DETAILED_BY_HREF = new Map(ADMIN_DETAILED_PROCEDURES.map((item) => [item.href, item]));

const AUDIENCES: Array<GuideAudience | "Semua role"> = ["Semua role", "Admin Ofissio", "CS Ofissio", "Operasional", "Super Admin"];

export function AdminGuideBrowser() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("Semua role");
  const normalized = query.trim().toLocaleLowerCase("id-ID");

  const workflows = useMemo(() => ADMIN_WORKFLOW_GUIDES.filter((guide) => {
    const roleMatches = audience === "Semua role" || guide.audience.includes("Semua tim") || guide.audience.includes(audience);
    const text = [guide.title, guide.summary, guide.doneWhen, ...guide.steps.flatMap((step) => [step.title, step.detail])].join(" ").toLocaleLowerCase("id-ID");
    return roleMatches && (!normalized || text.includes(normalized));
  }), [audience, normalized]);

  const menuGuides = useMemo(() => ADMIN_MENU_GUIDES.filter((guide) => {
    const roleMatches = audience === "Semua role" || guide.audience.includes("Semua tim") || guide.audience.includes(audience);
    const detailed = ADMIN_DETAILED_PROCEDURES.find((entry) => entry.href === guide.href);
    const text = [guide.title, guide.group, guide.purpose, guide.when, ...guide.steps, ...(guide.cautions ?? []), ...guide.keywords,
      ...(detailed?.prerequisites ?? []),
      ...(detailed?.procedure.flatMap((stage) => [stage.title, ...stage.actions, stage.expected]) ?? []),
      ...(detailed?.verification ?? []), ...(detailed?.troubleshooting ?? []),
    ].join(" ").toLocaleLowerCase("id-ID");
    return roleMatches && (!normalized || text.includes(normalized));
  }), [audience, normalized]);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b2861] via-[#123a82] to-[#2459d5] p-5 text-white shadow-[0_18px_50px_rgba(11,40,97,0.2)] md:p-7">
        <div className="flex max-w-4xl items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20"><BookOpen className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100/80">Buku panduan internal</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] md:text-4xl">Panduan kerja Ofissio</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50/85">Cari berdasarkan pekerjaan, masalah, nama menu, atau role. Mulai dari alur kerja untuk memahami urutan proses; gunakan referensi menu untuk langkah yang lebih spesifik.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Cari panduan</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/15 bg-white pl-12 pr-4 text-sm text-ink outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-200/40" placeholder="Contoh: pembayaran masuk, full custom, resi, harga bordir…" />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter berdasarkan role">
            {AUDIENCES.map((item) => <button key={item} type="button" onClick={() => setAudience(item)} aria-pressed={audience === item} className={`min-h-12 whitespace-nowrap rounded-xl px-4 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${audience === item ? "bg-white text-brand-900" : "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15"}`}>{item}</button>)}
          </div>
        </div>
      </header>

      <section aria-labelledby="alur-title">
        <div className="mb-3 flex items-end justify-between gap-3 px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-700">Mulai dari sini</p><h2 id="alur-title" className="mt-1 text-xl font-bold tracking-[-0.025em] text-ink">Alur kerja end-to-end</h2></div><span className="text-xs text-ink-muted">{workflows.length} panduan</span></div>
        <div className="grid gap-3 xl:grid-cols-2">
          {workflows.map((guide) => (
            <article key={guide.id} id={`alur-${guide.id}`} className="rounded-2xl bg-white p-5 shadow-[0_7px_24px_rgba(24,36,59,0.07)]">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold tracking-[-0.02em] text-ink">{guide.title}</h3><p className="mt-2 text-sm leading-6 text-ink-muted">{guide.summary}</p></div><Users className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" /></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{guide.audience.map((role) => <span key={role} className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">{role}</span>)}</div>
              <ol className="mt-5 space-y-4">{guide.steps.map((step, index) => <li key={step.title} className="grid grid-cols-[28px_1fr] gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{index + 1}</span><div><strong className="text-sm text-ink">{step.title}</strong><p className="mt-1 text-xs leading-5 text-ink-muted">{step.detail}</p>{step.href ? <Link href={step.href} className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg bg-slate-50 px-3 text-[11px] font-bold text-brand-700 hover:bg-brand-50">Buka menu <ArrowRight className="h-3.5 w-3.5" /></Link> : null}</div></li>)}</ol>
              <div className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong>Selesai jika:</strong> {guide.doneWhen}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="menu-title">
        <div className="mb-3 flex items-end justify-between gap-3 px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-700">Referensi lengkap</p><h2 id="menu-title" className="mt-1 text-xl font-bold tracking-[-0.025em] text-ink">Panduan setiap menu</h2></div><span className="text-xs text-ink-muted">{menuGuides.length} menu</span></div>
        <div className="space-y-2">
          {menuGuides.map((guide) => {
            const detail = DETAILED_BY_HREF.get(guide.href);
            return (
            <details key={guide.href} id={`menu-${guide.href.replaceAll("/", "-")}`} className="group [content-visibility:auto] [contain-intrinsic-size:auto_64px] rounded-xl bg-white shadow-[0_5px_18px_rgba(24,36,59,0.055)] open:ring-1 open:ring-brand-100">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><BookOpen className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{guide.title}</strong><small className="mt-0.5 block truncate text-[11px] text-ink-muted">{guide.purpose}</small></span>
                <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-ink-muted sm:block">{guide.group}</span><span className="text-lg text-brand-700 transition group-open:rotate-90">›</span>
              </summary>
              <div className="border-t border-slate-100 px-4 py-5 md:px-16">
                <div className="grid gap-5 lg:grid-cols-2"><div><h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle">Kapan digunakan</h4><p className="mt-2 text-sm leading-6 text-ink-muted">{guide.when}</p><div className="mt-3 flex flex-wrap gap-1.5">{guide.audience.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-ink-muted">{role}</span>)}</div></div><div><h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle">Langkah kerja</h4><ol className="mt-2 space-y-2">{guide.steps.map((step, index) => <li key={step} className="grid grid-cols-[20px_1fr] gap-2 text-xs leading-5 text-ink-muted"><span className="font-bold text-brand-700">{index + 1}.</span><span>{step}</span></li>)}</ol></div></div>
                {detail ? <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
                  <section><h4 className="text-xs font-extrabold uppercase tracking-[0.09em] text-brand-800">Sebelum memulai</h4><ul className="mt-3 grid gap-2 sm:grid-cols-2">{detail.prerequisites.map((item) => <li key={item} className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-ink-muted"><span className="font-bold text-brand-700">✓</span><span>{item}</span></li>)}</ul></section>
                  <section><h4 className="text-xs font-extrabold uppercase tracking-[0.09em] text-brand-800">Tahap demi tahap</h4><ol className="mt-3 space-y-3">{detail.procedure.map((stage, index) => <li key={stage.title} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{index + 1}</span><strong className="text-sm text-ink">{stage.title}</strong></div><ul className="ml-10 mt-3 space-y-1.5">{stage.actions.map((action) => <li key={action} className="list-disc text-xs leading-5 text-ink-muted">{action}</li>)}</ul><div className="ml-10 mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950"><strong>Hasil yang harus terlihat:</strong> {stage.expected}</div></li>)}</ol></section>
                  <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl bg-emerald-50 p-4"><h4 className="text-xs font-extrabold uppercase tracking-[0.08em] text-emerald-900">Checklist verifikasi</h4><ul className="mt-3 space-y-2">{detail.verification.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-emerald-950"><span>✓</span><span>{item}</span></li>)}</ul></section><section className="rounded-xl bg-amber-50 p-4"><h4 className="text-xs font-extrabold uppercase tracking-[0.08em] text-amber-950">Jika ada masalah</h4><ul className="mt-3 space-y-2">{detail.troubleshooting.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-amber-950"><span>!</span><span>{item}</span></li>)}</ul></section></div>
                  {detail.nextMenu ? <Link href={detail.nextMenu.href} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 text-xs text-brand-950 hover:bg-brand-100"><span><strong>Langkah berikutnya: {detail.nextMenu.label}</strong><span className="mt-0.5 block text-brand-800">{detail.nextMenu.reason}</span></span><ArrowRight className="h-4 w-4 shrink-0" /></Link> : null}
                </div> : null}
                {guide.cautions?.length ? <div className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{guide.cautions.join(" ")}</span></div> : null}
                <Link href={guide.href} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-bold text-white hover:bg-brand-800">Buka {guide.title}<ArrowRight className="h-4 w-4" /></Link>
              </div>
            </details>
          )})}
        </div>
      </section>

      {!workflows.length && !menuGuides.length ? <div role="status" className="rounded-2xl bg-white p-10 text-center"><Search className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 font-bold text-ink">Panduan tidak ditemukan</h2><p className="mt-1 text-sm text-ink-muted">Coba kata yang lebih umum atau pilih Semua role.</p></div> : null}
    </div>
  );
}
