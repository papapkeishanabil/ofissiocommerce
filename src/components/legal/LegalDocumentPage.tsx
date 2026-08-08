import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import type { LegalDocument } from "@/features/legal/legal-documents";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="bg-canvas px-4 py-8 sm:py-12 lg:px-8">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <header className="border-b border-line bg-gradient-to-br from-brand-950 to-brand-700 px-6 py-9 text-white sm:px-10 sm:py-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/85 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke Ofissio
          </Link>
          <p className="type-eyebrow text-ochre-300">Informasi legal Ofissio</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {document.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            {document.summary}
          </p>
          <p className="mt-5 text-xs text-white/60">
            Terakhir diperbarui: <time dateTime={document.updatedAt}>8 Agustus 2026</time>
          </p>
        </header>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <aside
            className="mb-9 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            aria-label="Status dokumen"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Dokumen ini adalah draft operasional, bukan nasihat hukum. Tinjauan dan
              persetujuan penasihat hukum serta pemilik bisnis tetap wajib sebelum go-live.
            </p>
          </aside>

          <div className="space-y-9">
            {document.sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`legal-section-${index}`}>
                <h2
                  id={`legal-section-${index}`}
                  className="text-xl font-semibold tracking-tight text-ink"
                >
                  {index + 1}. {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-sm leading-7 text-ink-muted sm:text-base">
                    {paragraph}
                  </p>
                ))}
                {section.items ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-ink-muted sm:text-base">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
