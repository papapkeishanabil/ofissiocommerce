import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ChevronRight } from "lucide-react";
import { SITE_URL, serializeJsonLd, productUrl } from "@/lib/seo";
import { getMoqSettings } from "@/features/moq-settings/moq-settings.service";
import { getGuideProducts } from "@/features/product-guide/product-guide.service";
import { GUIDE_PATH } from "@/features/product-guide/product-guide";
import { GuideCatalog } from "@/features/product-guide/GuideCatalog";
import styles from "@/features/product-guide/ProductGuide.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Panduan Memilih Seragam Kerja Ofissio",
  description: "Bandingkan seluruh produk aktif Ofissio berdasarkan kategori, bahan, gender, tipe lengan, ukuran, dan harga. Temukan panduan ukuran dan informasi bordir logo.",
  alternates: { canonical: `${SITE_URL}${GUIDE_PATH}` },
};

export default async function ProductGuidePage() {
  const [products, moq] = await Promise.all([getGuideProducts(), getMoqSettings()]);
  const structuredData = {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "@id": `${SITE_URL}${GUIDE_PATH}#guide`, url: `${SITE_URL}${GUIDE_PATH}`,
    name: "Panduan Memilih Seragam Kerja Ofissio",
    mainEntity: { "@type": "ItemList", numberOfItems: products.length, itemListElement: products.map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.name, url: productUrl(product.slug) })) },
  };
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Beranda</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Panduan seragam kerja</span></nav>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>Panduan Ofissio</p><h1>Seragam yang tepat.<br /><span>Mulai dari kebutuhan tim.</span></h1><p>Bandingkan seluruh produk aktif Ofissio. Pilih bahan, tipe lengan, ukuran, dan anggaran yang sesuai sebelum menyiapkan pesanan.</p></div>
      <a href="#semua-produk" className={styles.heroLink}>Jelajahi {products.length} produk <ArrowDown size={18} aria-hidden="true" /></a>
    </header>
    <section className={styles.steps} aria-labelledby="guide-start-title">
      <div className={styles.stepsIntro}><p className={styles.eyebrow}>Sebelum memilih</p><h2 id="guide-start-title">Tiga hal untuk diperiksa.</h2></div>
      <div><span className={styles.stepNumber}>01</span><h3>Kebutuhan kerja</h3><p>Mulai dari kategori produk dan aktivitas tim. Periksa detail setiap model untuk kebutuhan kantor, lapangan, atau operasional.</p></div>
      <div><span className={styles.stepNumber}>02</span><h3>Bahan dan lengan</h3><p>Bandingkan bahan dan pilih lengan pendek atau panjang. Fitur produk mengikuti spesifikasi masing-masing model.</p></div>
      <div><span className={styles.stepNumber}>03</span><h3>Ukuran dan anggaran</h3><p>Bandingkan ukuran pakaian pada tabel produk. Periksa harga varian, jumlah kebutuhan, dan tambahan bordir.</p></div>
    </section>
    <GuideCatalog products={products} />
    <section className={styles.advice} aria-labelledby="guide-size-title">
      <div><p className={styles.eyebrow}>Panduan ukuran</p><h2 id="guide-size-title">Label sama, ukuran bisa berbeda.</h2><p>Gunakan tabel pada produk yang dipilih. Bandingkan lingkar dada, panjang badan, lebar bahu, dan panjang lengan dengan pakaian yang biasa Anda gunakan.</p><p>FRM dan KM memiliki standar masing-masing. Kemeja wanita SN mengikuti Sasienala. Produk dengan pilihan dua tipe lengan menampilkan tabel sesuai lengan yang dipilih.</p></div>
      <div><p className={styles.eyebrow}>Logo perusahaan</p><h2>Bordir mulai {moq.settings.embroidery} pcs.</h2><p>Untuk satu model dan satu warna yang sama, ukuran boleh berbeda. Unggah logo melalui sistem, pilih lokasi bordir, lalu periksa biayanya sebelum memesan.</p><Link href="/faq">Baca FAQ produk dan bordir <ArrowRight size={17} aria-hidden="true" /></Link></div>
    </section>
    <section className={styles.cta}><div><h2>Sudah punya pilihan?</h2><p>Periksa stok dan varian pada halaman produk, atau diskusikan kebutuhan tim dengan Ofissio.</p></div><Link href="/catalog">Buka katalog <ArrowRight size={17} aria-hidden="true" /></Link></section>
  </main>;
}
