import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight, Check, Headset } from "lucide-react";
import { FAQ_ITEMS } from "@/features/faq/faq-content";
import { SITE_URL, serializeJsonLd } from "@/lib/seo";
import styles from "./FaqPage.module.css";

const GROUPS = [
  { id: "produk", title: "Produk & pemesanan", description: "Pembelian, ukuran, dan kebutuhan perusahaan.", items: [3, 8, 10] },
  { id: "bordir", title: "Logo & bordir", description: "Dari minimum pesanan hingga pratinjau logo.", items: [0, 1, 2, 4, 5, 6, 7] },
  { id: "bantuan", title: "Retur & bantuan", description: "Bantuan untuk pesanan Anda.", items: [9, 11] },
] as const;

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
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <div className={styles.container}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Beranda</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">FAQ</span>
        </nav>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>FAQ Produk<br />dan <span>Bordir.</span></h1>
            <p>Kenali produknya. Siapkan logonya.<br className={styles.desktopBreak} /> Temukan jawaban sebelum mulai memesan.</p>
            <a href="#topik-faq" className={styles.heroLink}>Temukan jawaban Anda <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
          <div className={styles.heroNote}>
            <span className={styles.noteLabel}>Untuk pesanan dengan bordir</span>
            <h2>Mulai dari 8 pcs.<br />Satu identitas untuk tim Anda.</h2>
            <ul>
              <li><Check size={17} aria-hidden="true" /> Satu model dan warna yang sama</li>
              <li><Check size={17} aria-hidden="true" /> Ukuran boleh berbeda-beda</li>
            </ul>
            <p>Tanpa bordir? Bisa mulai 1 pcs.</p>
          </div>
        </header>
        <div id="topik-faq" className={styles.content}>
          <aside className={styles.sidebar}>
            <nav aria-label="Topik FAQ" className={styles.topicNav}>
              <p>Pilih topik</p>
              {GROUPS.map(group => <a href={`#${group.id}`} key={group.id}><span>{group.title}</span><ChevronRight size={16} aria-hidden="true" /></a>)}
            </nav>
            <div className={styles.sideHelp}>
              <Headset size={23} strokeWidth={1.6} aria-hidden="true" />
              <h2>Butuh bantuan lebih lanjut?</h2>
              <p>Ceritakan kebutuhan seragam Anda kepada tim Ofissio.</p>
              <a href="mailto:sales@ofissio.com">Hubungi Ofissio <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </aside>
          <div className={styles.answers}>
            {GROUPS.map(group => (
              <section id={group.id} key={group.id} className={styles.group} aria-labelledby={`${group.id}-title`}>
                <div className={styles.groupHeading}>
                  <h2 id={`${group.id}-title`}>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
                <div className={styles.questions}>
                  {group.items.map((index, position) => {
                    const { question, answer } = FAQ_ITEMS[index];
                    return <details key={question} open={position === 0} className={styles.question}>
                      <summary><h3>{question}</h3><span className={styles.toggle}><ChevronDown size={18} aria-hidden="true" /></span></summary>
                      <div className={styles.answer}><p>{answer}</p></div>
                    </details>;
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
        <section className={styles.cta} aria-labelledby="faq-next">
          <div><h2 id="faq-next">Sudah menemukan jawabannya?</h2><p>Temukan seragam yang sesuai dengan cara tim Anda bekerja.</p></div>
          <Link href="/catalog">Jelajahi produk <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </div>
    </main>
  );
}
