"use client";

import { useId } from "react";
import { effectivePageSeo, emptyPageSeo, type PageSeo } from "./page-seo";

export function SeoFields({ value, automatic, onChange, disabled = false }: {
  value?: PageSeo; automatic: { title: string; description: string };
  onChange: (value: PageSeo) => void; disabled?: boolean;
}) {
  const id = useId();
  const seo = value ?? emptyPageSeo();
  const effective = effectivePageSeo(seo, automatic);
  return <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-line bg-white p-5">
    <legend className="px-2 font-bold text-ink">Pengaturan SEO</legend>
    <p className="text-sm text-ink-muted">Keyword hanya panduan internal. Kosongkan judul atau deskripsi manual untuk memakai nilai otomatis. Disimpan bersama halaman ini.</p>
    {([
      ["primaryKeyword", "Keyword utama", 160], ["title", "Judul SEO (manual)", 240], ["description", "Meta description (manual)", 1000],
    ] as const).map(([key, label, max]) => <div key={key}>
      <label htmlFor={`${id}-${key}`} className="block text-sm font-semibold">{label}</label>
      <textarea id={`${id}-${key}`} rows={key === "description" ? 3 : 1} maxLength={max} className="mt-1 w-full rounded-lg border border-line p-2 text-sm" value={seo[key]} onChange={event => onChange({ ...seo, [key]: event.target.value })} />
    </div>)}
    <div><label htmlFor={`${id}-related`} className="block text-sm font-semibold">Keyword terkait (pisahkan dengan koma)</label>
      <input id={`${id}-related`} className="mt-1 w-full rounded-lg border border-line p-2 text-sm" value={seo.relatedKeywords.join(",")} onChange={event => onChange({ ...seo, relatedKeywords: event.target.value.split(",") })} />
    </div>
    <div aria-live="polite" className="break-words rounded-lg bg-slate-50 p-3 text-sm">
      <p className="font-bold">Metadata efektif</p>
      <p>Judul ({seo.title.trim() ? "manual" : "otomatis"}): {effective.title}</p>
      <p>Deskripsi ({seo.description.trim() ? "manual" : "otomatis"}): {effective.description || "Belum ada deskripsi halaman."}</p>
    </div>
  </fieldset>;
}
