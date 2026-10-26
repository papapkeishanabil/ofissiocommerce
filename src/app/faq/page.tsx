import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/features/faq/faq-content";
import { SITE_URL, serializeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ Produk dan Bordir",
  description: "Panduan pemesanan Ofissio: produk polos mulai 1 pcs, bordir minimal 8 pcs dengan model dan warna sama, pilihan ukuran, serta pengerjaan dan retur.",
  alternates: { canonical: `${SITE_URL}/faq` },
};

export default function FaqPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      "@type": "Question", name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main className="bg-surface px-5 py-10 text-ink sm:px-8 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
          <Link href="/" className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">Beranda</Link>
          <span aria-hidden="true" className="mx-3">/</span>
          <span aria-current="page">FAQ</span>
        </nav>
        <header className="mb-10">
          <p className="mb-3 text-sm font-semibold text-ochre-700">Bantuan Pemesanan</p>
          <h1 className="text-3xl font-bold leading-tight text-ink-strong sm:text-5xl">FAQ Produk dan Bordir</h1>
          <p className="mt-5 max-w-prose text-base leading-7 text-ink-muted">Temukan jawaban seputar pembelian produk, minimum bordir, pilihan ukuran, dan pengadaan seragam perusahaan.</p>
        </header>
        <div className="divide-y divide-line border-y border-line">
          {FAQ_ITEMS.map(({ question, answer }, index) => (
            <section key={question} aria-labelledby={`faq-${index + 1}`} className="py-6 sm:py-7">
              <h2 id={`faq-${index + 1}`} className="text-lg font-semibold leading-7 text-ink-strong">{question}</h2>
              <p className="mt-3 text-base leading-7 text-ink-muted">{answer}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm font-semibold text-brand-900">
          <Link href="/catalog" className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">Lihat katalog produk</Link>
          <Link href="/quote" className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">Ajukan kebutuhan seragam</Link>
        </div>
      </div>
    </main>
  );
}
