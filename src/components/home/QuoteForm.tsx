"use client";

import { useState, type FormEvent } from "react";

export function QuoteForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-soft-sm">
        <p className="text-lg font-bold text-brand-700">Terkirim ✓</p>
        <p className="mt-2 text-sm text-ink-muted">Terima kasih. Tim kami akan menghubungi Anda dalam 1×24 jam kerja.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-8 shadow-soft-sm">
      <h3 className="text-xl font-bold text-ink-strong">Ajukan Penawaran</h3>
      <p className="mt-1 text-sm text-ink-muted">Isi formulir singkat ini untuk memulai.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Nama Depan</label>
            <input type="text" required className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Nama Belakang</label>
            <input type="text" required className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Perusahaan</label>
            <input type="text" className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Industri</label>
            <select className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600">
              <option>Perkantoran</option>
              <option>Hotel & Restoran</option>
              <option>Kesehatan</option>
              <option>Manufaktur & Safety</option>
              <option>Lainnya</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Email</label>
            <input type="email" required className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">WhatsApp</label>
            <input type="tel" className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Ceritakan kebutuhan Anda</label>
          <textarea rows={3} className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base text-ink-strong focus:border-brand-500 focus:outline-2 focus:outline-brand-600" />
        </div>
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          Kirim Permintaan
        </button>
      </form>
    </div>
  );
}
